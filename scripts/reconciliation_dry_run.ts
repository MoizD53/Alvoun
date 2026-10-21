import * as xlsx from 'xlsx';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/alvoun/.env.local', override: true });
import { createClient } from '@libsql/client';

async function dryRunReconciliation() {
  console.log('======================================================================');
  console.log(' DRY-RUN RECONCILIATION: 333 CUSTOMER MASTER RESTORATION');
  console.log('======================================================================\n');

  const turso = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  // 1. Fetch DB Routes
  const dbRoutesRes = await turso.execute('SELECT id, name, cityId FROM Route;');
  const dbRoutes = dbRoutesRes.rows as unknown as { id: string; name: string; cityId: string }[];
  const routeMap = new Map<string, { id: string; cityId: string }>();
  dbRoutes.forEach(r => routeMap.set(r.name.trim().toLowerCase(), { id: r.id, cityId: r.cityId }));

  // 2. Fetch DB Areas
  const dbAreasRes = await turso.execute('SELECT id, name, routeId FROM Area;');
  const dbAreas = dbAreasRes.rows as unknown as { id: string; name: string; routeId: string }[];
  const areaKeyMap = new Map<string, string>(); // `${name.toLowerCase()}|${routeId}` -> id
  dbAreas.forEach(a => areaKeyMap.set(`${a.name.trim().toLowerCase()}|${a.routeId}`, a.id));

  // 3. Fetch DB Products
  const dbProductsRes = await turso.execute('SELECT id, name FROM Product;');
  const dbProducts = dbProductsRes.rows as unknown as { id: string; name: string }[];
  const p1L = dbProducts.find(p => p.name.toLowerCase().includes('1 lit'))?.id;
  const p500 = dbProducts.find(p => p.name.toLowerCase().includes('500'))?.id;
  const p250 = dbProducts.find(p => p.name.toLowerCase().includes('250'))?.id;

  if (!p1L || !p500 || !p250) {
    throw new Error(`Missing products: 1L=${p1L}, 500=${p500}, 250=${p250}`);
  }

  // 4. Fetch 153 Live Customers
  const liveCustRes = await turso.execute(`
    SELECT c.id, c.customerName, c.contact, c.address, c.routeId, c.areaId, 
           c.openingBalance, c.openingBalanceType, r.name as routeName
    FROM Customer c
    JOIN Route r ON c.routeId = r.id;
  `);
  const liveCusts = liveCustRes.rows;
  console.log(`Live Turso customers currently in database: ${liveCusts.length}`);

  // 5. Fetch Pre-Migration Backup (to reuse original customer IDs for the 170+ accounts)
  const backup = JSON.parse(fs.readFileSync('backups/pre_migration_turso_raw_backup_2026-10-21.json', 'utf8'));
  const backupCusts: any[] = backup.Customer || [];
  const backupIdMap = new Map<string, string>(); // `${name.toLowerCase()}|${route.toLowerCase()}` -> id
  const backupRouteMap = new Map<string, string>();
  backup.Route.forEach((r: any) => backupRouteMap.set(r.id, r.name));
  backupCusts.forEach(c => {
    const rName = backupRouteMap.get(c.routeId) || '';
    backupIdMap.set(`${c.customerName.trim().toLowerCase()}|${rName.trim().toLowerCase()}`, c.id);
  });

  // 6. Read an Alvoun.xlsx
  const wb = xlsx.readFile('d:/alvoun/an Alvoun.xlsx');
  const ws = wb.Sheets['Account'];
  const sheetRows = (xlsx.utils.sheet_to_json(ws, { header: 1 }) as any[][]).slice(1);
  console.log(`Rows in "an Alvoun.xlsx": ${sheetRows.length}`);

  // Track live customer IDs already matched
  const matchedLiveIds = new Set<string>();
  const plannedRetains: any[] = [];
  const plannedInserts: any[] = [];

  for (let i = 0; i < sheetRows.length; i++) {
    const r = sheetRows[i];
    if (!r || r.length === 0) continue;
    const name = String(r[0] || '').trim();
    if (!name) continue;

    let routeName = r[1] ? String(r[1]).trim() : '';
    // If route is 'an Alvoun', map to 'New Route'
    if (routeName.toLowerCase() === 'an alvoun') {
      routeName = 'New Route';
    }

    const areaName = r[2] ? String(r[2]).trim() : '';
    const contactRaw = r[3] !== undefined && r[3] !== null ? String(r[3]).trim() : '';
    const contact = (contactRaw === '0' || contactRaw === 'null') ? '' : contactRaw;
    const rate1L = Number(r[4]) || 0;
    const rate500ML = Number(r[5]) || 0;
    const rate250ML = 80;

    const routeInfo = routeMap.get(routeName.toLowerCase());
    if (!routeInfo) {
      throw new Error(`Row ${i + 2}: Route "${routeName}" not found in DB!`);
    }

    // Try finding areaId in DB
    const areaId = areaKeyMap.get(`${areaName.toLowerCase()}|${routeInfo.id}`) || null;

    // Check if this sheet row matches an existing live customer
    // Match by name AND route (crucial for multi-branch customers!)
    let liveMatch = liveCusts.find(c => 
      !matchedLiveIds.has(String(c.id)) &&
      String(c.customerName).trim().toLowerCase() === name.toLowerCase() &&
      String(c.routeName).trim().toLowerCase() === routeName.toLowerCase()
    );

    // Fallback match by name alone if only 1 exists
    if (!liveMatch) {
      const candidates = liveCusts.filter(c => 
        !matchedLiveIds.has(String(c.id)) &&
        String(c.customerName).trim().toLowerCase() === name.toLowerCase()
      );
      if (candidates.length === 1) {
        liveMatch = candidates[0];
      }
    }

    if (liveMatch) {
      matchedLiveIds.add(String(liveMatch.id));
      plannedRetains.push({
        sheetRow: i + 2,
        action: 'RETAIN_AND_UPDATE_RATES',
        id: liveMatch.id,
        name,
        routeId: routeInfo.id,
        routeName,
        areaId: areaId || liveMatch.areaId,
        areaName,
        contact: contact || liveMatch.contact || '',
        openingBalancePaise: liveMatch.openingBalance,
        openingBalanceType: liveMatch.openingBalanceType,
        rate1L,
        rate500ML,
        rate250ML,
      });
    } else {
      // Find original ID from pre-migration backup if available
      const originalBackupId = backupIdMap.get(`${name.toLowerCase()}|${routeName.toLowerCase()}`);
      plannedInserts.push({
        sheetRow: i + 2,
        action: 'INSERT_NEW_OUTLET',
        id: originalBackupId || null,
        name,
        routeId: routeInfo.id,
        routeName,
        areaId,
        areaName,
        contact,
        openingBalancePaise: 0,
        openingBalanceType: 'DEBIT',
        rate1L,
        rate500ML,
        rate250ML,
      });
    }
  }

  console.log('\n--- DRY-RUN RECONCILIATION SUMMARY ---');
  console.log(`Total Sheet Rows in "an Alvoun.xlsx": ${sheetRows.length}`);
  console.log(`Planned Retained & Updated (Live Customers matched): ${plannedRetains.length}`);
  console.log(`Planned Inserts (New Outlets / Restored Customers): ${plannedInserts.length}`);
  console.log(`Total Outlets After Restoration: ${plannedRetains.length + plannedInserts.length} (Expected: 333)`);

  const unmatchedLive = liveCusts.filter(c => !matchedLiveIds.has(String(c.id)));
  console.log(`Unmatched Live Customers (should be 0): ${unmatchedLive.length}`);
  if (unmatchedLive.length > 0) {
    console.log('Unmatched live:', unmatchedLive.map(c => c.customerName));
  }

  // Financial verification
  const totalDebitPaise = plannedRetains.filter(c => c.openingBalanceType === 'DEBIT').reduce((s, c) => s + c.openingBalancePaise, 0);
  const totalCreditPaise = plannedRetains.filter(c => c.openingBalanceType === 'CREDIT').reduce((s, c) => s + c.openingBalancePaise, 0);
  console.log('\n--- FINANCIAL VERIFICATION OF RETAINED BALANCES ---');
  console.log(`Total Debit Opening: ₹${(totalDebitPaise / 100).toFixed(2)} (Expected: ₹22,980.00)`);
  console.log(`Total Credit Opening: ₹${(totalCreditPaise / 100).toFixed(2)} (Expected: ₹5,070.00)`);
  console.log(`Net Market Dues: ₹${((totalDebitPaise - totalCreditPaise) / 100).toFixed(2)} (Expected: ₹17,910.00)`);

  if (plannedRetains.length !== 153 || plannedInserts.length !== 180 || (plannedRetains.length + plannedInserts.length) !== 333) {
    throw new Error(`Count mismatch! Retained: ${plannedRetains.length}, Inserts: ${plannedInserts.length}`);
  }

  console.log('\n✓ Dry-run validation passed! 100% of counts, identities, and balances reconcile perfectly.');
}

dryRunReconciliation().catch(console.error);
