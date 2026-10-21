import fs from 'fs';
import * as xlsx from 'xlsx';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/alvoun/.env.local' });
import { createClient } from '@libsql/client';

async function detailedAudit() {
  const turso = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  // 1. Current live database state
  const liveTotalRes = await turso.execute('SELECT count(*) as cnt FROM Customer;');
  const liveActiveRes = await turso.execute("SELECT count(*) as cnt FROM Customer WHERE status = 'ACTIVE';");
  const liveInactiveRes = await turso.execute("SELECT count(*) as cnt FROM Customer WHERE status = 'INACTIVE';");
  
  const liveRoutesRes = await turso.execute(`
    SELECT r.name as routeName, count(c.id) as cnt 
    FROM Customer c 
    JOIN Route r ON c.routeId = r.id 
    GROUP BY r.name;
  `);

  const liveAreasRes = await turso.execute(`
    SELECT a.name as areaName, count(c.id) as cnt 
    FROM Customer c 
    LEFT JOIN Area a ON c.areaId = a.id 
    GROUP BY a.name 
    ORDER BY cnt DESC;
  `);

  // 2. Pre-migration backup
  const backup = JSON.parse(fs.readFileSync('backups/pre_migration_turso_raw_backup_2026-10-21.json', 'utf8'));
  const backupCusts: any[] = backup.Customer;
  const backupRouteMap = new Map<string, string>();
  backup.Route.forEach((r: any) => backupRouteMap.set(r.id, r.name));
  const backupAreaMap = new Map<string, string>();
  backup.Area.forEach((a: any) => backupAreaMap.set(a.id, a.name));

  // Current live customers
  const liveCusts = (await turso.execute('SELECT id, customerName, routeId, areaId FROM Customer;')).rows;
  const liveNameSet = new Set(liveCusts.map(c => String(c.customerName).trim().toLowerCase()));

  // Categorize
  const absentCusts = backupCusts.filter(c => !liveNameSet.has(String(c.customerName).trim().toLowerCase()));
  const retainedCusts = backupCusts.filter(c => liveNameSet.has(String(c.customerName).trim().toLowerCase()));

  // New in Book1 not in backup
  const backupNameSet = new Set(backupCusts.map(c => String(c.customerName).trim().toLowerCase()));
  const newInBook1 = liveCusts.filter(c => !backupNameSet.has(String(c.customerName).trim().toLowerCase()));

  console.log('--- RECONCILIATION AUDIT ---');
  console.log(`Live Turso Total: ${liveTotalRes.rows[0].cnt}`);
  console.log(`Live Turso Active: ${liveActiveRes.rows[0].cnt}`);
  console.log(`Live Turso Inactive: ${liveInactiveRes.rows[0].cnt}`);
  console.log(`Pre-Migration Backup Total: ${backupCusts.length}`);
  console.log(`Retained from Backup: ${retainedCusts.length}`);
  console.log(`Absent from Backup: ${absentCusts.length}`);
  console.log(`Brand New from Book1.xlsx (not in original 320): ${newInBook1.length}`);
  console.log(`Total if combined (320 original + 7 new): ${backupCusts.length + newInBook1.length}`);

  // Route breakdown of absent customers
  const absentByRoute: Record<string, number> = {};
  for (const c of absentCusts) {
    const r = backupRouteMap.get(c.routeId) || 'Unknown';
    absentByRoute[r] = (absentByRoute[r] || 0) + 1;
  }
  console.log('\nAbsent customers by Route:');
  console.table(absentByRoute);

  // Area breakdown of absent customers
  const absentByArea: Record<string, number> = {};
  for (const c of absentCusts) {
    const a = backupAreaMap.get(c.areaId) || 'Unassigned';
    absentByArea[a] = (absentByArea[a] || 0) + 1;
  }
  console.log('\nTop 15 Areas with absent customers:');
  console.table(Object.entries(absentByArea).sort((a,b) => b[1] - a[1]).slice(0, 15).map(([area, cnt]) => ({ area, count: cnt })));

  // Write full list of absent customers to a JSON for reference
  fs.writeFileSync('backups/absent_customers_list.json', JSON.stringify(absentCusts.map(c => ({
    name: c.customerName,
    route: backupRouteMap.get(c.routeId),
    area: backupAreaMap.get(c.areaId),
    contact: c.contact,
    address: c.address,
    code: c.code
  })), null, 2));

  console.log('\nFull list of 170 absent customers saved to backups/absent_customers_list.json');
}

detailedAudit().catch(console.error);
