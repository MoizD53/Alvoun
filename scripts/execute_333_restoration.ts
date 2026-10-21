import * as xlsx from 'xlsx';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/alvoun/.env.local', override: true });
import { createClient } from '@libsql/client';
import crypto from 'crypto';

function cuid(): string {
  return 'c' + crypto.randomBytes(12).toString('hex').slice(0, 24);
}

async function executeRestoration() {
  console.log('======================================================================');
  console.log(' LIVE EXECUTION: RESTORING 333 CUSTOMER MASTER IN PRODUCTION TURSO');
  console.log('======================================================================\n');

  const turso = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  // Verify DB routes
  const dbRoutesRes = await turso.execute('SELECT id, name, cityId FROM Route;');
  const dbRoutes = dbRoutesRes.rows as unknown as { id: string; name: string; cityId: string }[];
  const routeMap = new Map<string, { id: string; cityId: string }>();
  dbRoutes.forEach(r => routeMap.set(r.name.trim().toLowerCase(), { id: r.id, cityId: r.cityId }));

  // Verify DB areas
  const dbAreasRes = await turso.execute('SELECT id, name, routeId FROM Area;');
  const dbAreas = dbAreasRes.rows as unknown as { id: string; name: string; routeId: string }[];
  const areaKeyMap = new Map<string, string>();
  dbAreas.forEach(a => areaKeyMap.set(`${a.name.trim().toLowerCase()}|${a.routeId}`, a.id));

  // Verify DB products
  const dbProductsRes = await turso.execute('SELECT id, name FROM Product;');
  const dbProducts = dbProductsRes.rows as unknown as { id: string; name: string }[];
  const p1L = dbProducts.find(p => p.name.toLowerCase().includes('1 lit'))?.id;
  const p500 = dbProducts.find(p => p.name.toLowerCase().includes('500'))?.id;
  const p250 = dbProducts.find(p => p.name.toLowerCase().includes('250'))?.id;

  if (!p1L || !p500 || !p250) {
    throw new Error(`Missing products: 1L=${p1L}, 500=${p500}, 250=${p250}`);
  }

  const defaultCityId = dbRoutes[0].cityId; // Dahod
  const defaultStateId = (await turso.execute({ sql: 'SELECT stateId FROM City WHERE id = ?;', args: [defaultCityId] })).rows[0].stateId as string;

  // Fetch 153 live customers
  const liveCustRes = await turso.execute(`
    SELECT c.id, c.customerName, c.contact, c.address, c.routeId, c.areaId, 
           c.openingBalance, c.openingBalanceType, r.name as routeName
    FROM Customer c
    JOIN Route r ON c.routeId = r.id;
  `);
  const liveCusts = liveCustRes.rows;
  console.log(`Current Live Customers: ${liveCusts.length}`);

  if (liveCusts.length !== 153) {
    throw new Error(`Expected exactly 153 live customers before migration, found ${liveCusts.length}`);
  }

  // Pre-migration backup for original IDs
  const backup = JSON.parse(fs.readFileSync('backups/pre_migration_turso_raw_backup_2026-10-21.json', 'utf8'));
  const backupCusts: any[] = backup.Customer || [];
  const backupIdMap = new Map<string, string>();
  const backupRouteMap = new Map<string, string>();
  backup.Route.forEach((r: any) => backupRouteMap.set(r.id, r.name));
  backupCusts.forEach(c => {
    const rName = backupRouteMap.get(c.routeId) || '';
    backupIdMap.set(`${c.customerName.trim().toLowerCase()}|${rName.trim().toLowerCase()}`, c.id);
  });

  // Read an Alvoun.xlsx
  const wb = xlsx.readFile('d:/alvoun/an Alvoun.xlsx');
  const ws = wb.Sheets['Account'];
  const sheetRows = (xlsx.utils.sheet_to_json(ws, { header: 1 }) as any[][]).slice(1);
  console.log(`Authoritative Sheet Rows: ${sheetRows.length}`);

  const matchedLiveIds = new Set<string>();
  const usedCustomerIds = new Set<string>();
  const toRetainAndUpdate: any[] = [];
  const toInsert: any[] = [];

  // Pre-seed usedCustomerIds with the 153 live IDs
  liveCusts.forEach(c => usedCustomerIds.add(String(c.id)));

  for (let i = 0; i < sheetRows.length; i++) {
    const r = sheetRows[i];
    if (!r || r.length === 0) continue;
    const name = String(r[0] || '').trim();
    if (!name) continue;

    let routeName = r[1] ? String(r[1]).trim() : '';
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
      throw new Error(`Row ${i + 2}: Route "${routeName}" not found!`);
    }

    const areaId = areaKeyMap.get(`${areaName.toLowerCase()}|${routeInfo.id}`) || null;

    let liveMatch = liveCusts.find(c => 
      !matchedLiveIds.has(String(c.id)) &&
      String(c.customerName).trim().toLowerCase() === name.toLowerCase() &&
      String(c.routeName).trim().toLowerCase() === routeName.toLowerCase()
    );

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
      toRetainAndUpdate.push({
        id: String(liveMatch.id),
        name,
        routeId: routeInfo.id,
        areaId: areaId || liveMatch.areaId,
        contact: contact || liveMatch.contact || '',
        address: `${areaName ? areaName + ', ' : ''}${routeName}, Dahod`,
        openingBalancePaise: Number(liveMatch.openingBalance),
        openingBalanceType: String(liveMatch.openingBalanceType),
        rate1L,
        rate500ML,
        rate250ML,
      });
    } else {
      const originalBackupId = backupIdMap.get(`${name.toLowerCase()}|${routeName.toLowerCase()}`);
      let finalId = originalBackupId;
      if (!finalId || usedCustomerIds.has(finalId)) {
        finalId = cuid();
      }
      usedCustomerIds.add(finalId);

      toInsert.push({
        id: finalId,
        name,
        routeId: routeInfo.id,
        areaId,
        contact,
        address: `${areaName ? areaName + ', ' : ''}${routeName}, Dahod`,
        openingBalancePaise: 0,
        openingBalanceType: 'DEBIT',
        rate1L,
        rate500ML,
        rate250ML,
      });
    }
  }

  console.log(`Reconciled: ${toRetainAndUpdate.length} to retain & update, ${toInsert.length} to insert. Total: ${toRetainAndUpdate.length + toInsert.length}`);

  if (toRetainAndUpdate.length !== 153 || toInsert.length !== 180) {
    throw new Error('Pre-execution sanity check failed! Aborting.');
  }

  // --- PART 1: EXECUTE ON TURSO PRODUCTION ---
  console.log('\n>>> 1. Updating 153 existing customers on Turso...');
  for (const u of toRetainAndUpdate) {
    await turso.execute({
      sql: `UPDATE Customer SET 
              routeId = ?, areaId = ?, contact = ?, address = ?, updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?;`,
      args: [u.routeId, u.areaId, u.contact, u.address, u.id]
    });
  }

  console.log(`>>> 2. Inserting ${toInsert.length} missing customer outlets into Turso...`);
  for (const ins of toInsert) {
    await turso.execute({
      sql: `INSERT INTO Customer (
              id, customerName, contact, address, stateId, cityId, routeId, areaId,
              openingBalance, openingBalanceType, category, status, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'RETAILER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
      args: [
        ins.id,
        ins.name,
        ins.contact,
        ins.address,
        defaultStateId,
        defaultCityId,
        ins.routeId,
        ins.areaId,
        ins.openingBalancePaise,
        ins.openingBalanceType
      ]
    });
  }

  console.log('>>> 3. Upserting customer product rates for all 333 outlets in Turso...');
  const all333 = [...toRetainAndUpdate, ...toInsert];
  let ratesProcessed = 0;

  for (const c of all333) {
    const rates = [
      { prodId: p1L, ratePaise: c.rate1L * 100 },
      { prodId: p500, ratePaise: c.rate500ML * 100 },
      { prodId: p250, ratePaise: c.rate250ML * 100 },
    ];

    for (const r of rates) {
      const existing = await turso.execute({
        sql: 'SELECT id FROM CustomerProductRate WHERE customerId = ? AND productId = ?;',
        args: [c.id, r.prodId]
      });

      if (existing.rows.length > 0) {
        await turso.execute({
          sql: 'UPDATE CustomerProductRate SET rate = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?;',
          args: [r.ratePaise, existing.rows[0].id]
        });
      } else {
        await turso.execute({
          sql: 'INSERT INTO CustomerProductRate (id, customerId, productId, rate, createdAt, updatedAt) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);',
          args: [cuid(), c.id, r.prodId, r.ratePaise]
        });
      }
      ratesProcessed++;
    }
  }

  console.log(`✓ Processed ${ratesProcessed} customer product rate rows on Turso.`);

  // --- PART 2: SYNC LOCAL DEV.DB DATABASE ---
  console.log('\n>>> 4. Synchronizing local dev.db database...');
  const localDb = createClient({ url: 'file:d:/alvoun/prisma/dev.db' });
  const localRoutes = (await localDb.execute('SELECT id, name, cityId FROM Route;')).rows as unknown as { id: string; name: string; cityId: string }[];
  const localRouteMap = new Map<string, string>();
  localRoutes.forEach(r => localRouteMap.set(r.name.trim().toLowerCase(), r.id));

  const localProducts = (await localDb.execute('SELECT id, name FROM Product;')).rows as unknown as { id: string; name: string }[];
  const localP1L = localProducts.find(p => p.name.toLowerCase().includes('1 lit'))?.id;
  const localP500 = localProducts.find(p => p.name.toLowerCase().includes('500'))?.id;
  const localP250 = localProducts.find(p => p.name.toLowerCase().includes('250'))?.id;

  const localCityId = localRoutes[0].cityId;
  const localStateId = (await localDb.execute({ sql: 'SELECT stateId FROM City WHERE id = ?;', args: [localCityId] })).rows[0].stateId as string;

  await localDb.execute('DELETE FROM CustomerProductRate;');
  await localDb.execute('DELETE FROM Customer;');

  for (const c of all333) {
    const routeId = localRouteMap.get(c.routeId ? (routeMap.get(c.routeId) ? c.routeId : 'new route') : 'new route') || localRoutes[0].id;
    // Map by route name
    const targetRouteName = c.routeName || 'Indore Highway';
    const resolvedLocalRouteId = localRouteMap.get(targetRouteName.toLowerCase()) || localRoutes[0].id;

    await localDb.execute({
      sql: `INSERT INTO Customer (
              id, customerName, contact, address, stateId, cityId, routeId, areaId,
              openingBalance, openingBalanceType, category, status, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, null, ?, ?, 'RETAILER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
      args: [
        c.id,
        c.name,
        c.contact || '',
        c.address,
        localStateId,
        localCityId,
        resolvedLocalRouteId,
        c.openingBalancePaise,
        c.openingBalanceType
      ]
    });

    const rates = [
      { prodId: localP1L!, ratePaise: c.rate1L * 100 },
      { prodId: localP500!, ratePaise: c.rate500ML * 100 },
      { prodId: localP250!, ratePaise: c.rate250ML * 100 },
    ];

    for (const r of rates) {
      await localDb.execute({
        sql: `INSERT INTO CustomerProductRate (id, customerId, productId, rate, createdAt, updatedAt) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
        args: [cuid(), c.id, r.prodId, r.ratePaise]
      });
    }
  }

  console.log('✓ Synchronized local dev.db successfully.');

  // --- PART 3: POST-RESTORATION VERIFICATION ON LIVE TURSO ---
  console.log('\n======================================================================');
  console.log(' POST-RESTORATION VERIFICATION (LIVE TURSO PRODUCTION)');
  console.log('======================================================================');

  const totalCust = Number((await turso.execute('SELECT count(*) as cnt FROM Customer;')).rows[0].cnt);
  const activeCust = Number((await turso.execute("SELECT count(*) as cnt FROM Customer WHERE status = 'ACTIVE';")).rows[0].cnt);
  const inactiveCust = Number((await turso.execute("SELECT count(*) as cnt FROM Customer WHERE status = 'INACTIVE';")).rows[0].cnt);
  const totalRates = Number((await turso.execute('SELECT count(*) as cnt FROM CustomerProductRate;')).rows[0].cnt);
  const r250Check = Number((await turso.execute('SELECT count(*) as cnt FROM CustomerProductRate WHERE rate = 8000;')).rows[0].cnt);

  const debitSum = Number((await turso.execute("SELECT sum(openingBalance) as sum FROM Customer WHERE openingBalanceType = 'DEBIT';")).rows[0].sum);
  const creditSum = Number((await turso.execute("SELECT sum(openingBalance) as sum FROM Customer WHERE openingBalanceType = 'CREDIT';")).rows[0].sum);

  const routesDist = (await turso.execute(`
    SELECT r.name, count(c.id) as cnt 
    FROM Customer c 
    JOIN Route r ON c.routeId = r.id 
    GROUP BY r.name 
    ORDER BY cnt DESC;
  `)).rows;

  console.log(`Total Customers in Turso: ${totalCust} (Expected: 333)`);
  console.log(`Active Customers in Turso: ${activeCust} (Expected: 333)`);
  console.log(`Inactive Customers in Turso: ${inactiveCust} (Expected: 0)`);
  console.log(`CustomerProductRate rows: ${totalRates} (Expected: 999 = 333 * 3)`);
  console.log(`250ml Rates at 8000 paise (₹80): ${r250Check} (Expected: 333)`);
  console.log(`Debit Opening Balances Sum: ₹${(debitSum / 100).toFixed(2)} (Expected: ₹22,980.00)`);
  console.log(`Credit Opening Balances Sum: ₹${(creditSum / 100).toFixed(2)} (Expected: ₹5,070.00)`);
  console.log(`Net Market Dues: ₹${((debitSum - creditSum) / 100).toFixed(2)} (Expected: ₹17,910.00)`);
  console.log('\nRoute Distribution:');
  console.table(routesDist);

  if (totalCust !== 333 || activeCust !== 333 || totalRates !== 999 || debitSum !== 2298000 || creditSum !== 507000) {
    throw new Error('VERIFICATION FAILED: Metrics do not match expected values!');
  }

  console.log('\n======================================================================');
  console.log(' RESTORATION COMPLETE AND 100% VERIFIED!');
  console.log('======================================================================');
}

executeRestoration().catch((err) => {
  console.error('EXECUTION ERROR:', err);
  process.exit(1);
});
