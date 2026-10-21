import * as xlsx from 'xlsx';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/alvoun/.env.local' });
import { createClient } from '@libsql/client';

async function investigate() {
  console.log('======================================================================');
  console.log(' INVESTIGATION: ALVOUN CUSTOMER COUNT DISCREPANCY');
  console.log('======================================================================\n');

  // --- 1. INSPECT BOOK1.XLSX AND ALL WORKSHEETS ---
  console.log('>>> 1. INSPECTING BOOK1.XLSX WORKSHEETS...');
  const wb = xlsx.readFile('d:/alvoun/Book1.xlsx');
  console.log('All Sheet Names in Book1.xlsx:', wb.SheetNames);

  for (const sName of wb.SheetNames) {
    const ws = wb.Sheets[sName];
    const data: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1 });
    console.log(`Sheet "${sName}": ${data.length} total rows`);
    if (data.length > 0) {
      console.log(`  Header row:`, data[0]);
      if (data.length > 1) {
        console.log(`  Row 1:`, data[1]);
      }
    }
  }

  // Check if there are other columns or customer names in Sheet3
  const ws3 = wb.Sheets['Sheet3'];
  const data3: any[][] = xlsx.utils.sheet_to_json(ws3, { header: 1 });
  const rows3 = data3.slice(1);
  const distinctInSheet3 = new Set<string>();
  for (const r of rows3) {
    if (r[4]) distinctInSheet3.add(String(r[4]).trim());
  }
  console.log(`\nDistinct Customer Names in Sheet3: ${distinctInSheet3.size}`);

  // Check if any customer names appear in other columns of Sheet3 (like Remark, Salesman, Type, etc.)
  console.log('\nChecking if any other column has customer names in Sheet3...');
  const remarksWithCustomer = rows3.filter(r => r[17] && (String(r[17]).toLowerCase().includes('cust') || String(r[17]).toLowerCase().includes('hotel') || String(r[17]).toLowerCase().includes('store')));
  console.log(`Rows with potential customer references in Remark column: ${remarksWithCustomer.length}`);

  // Check other files in project
  console.log('\n>>> 2. INSPECTING OTHER DATA FILES IN THE REPOSITORY...');
  const rootFiles = fs.readdirSync('.').filter(f => f.endsWith('.xlsx') || f.endsWith('.csv') || f.endsWith('.xls') || f.endsWith('.json'));
  console.log('Files in root:', rootFiles);
  const scriptFiles = fs.readdirSync('scripts').filter(f => f.endsWith('.xlsx') || f.endsWith('.csv') || f.endsWith('.xls') || f.endsWith('.json'));
  console.log('Files in scripts:', scriptFiles);

  // Check ALVOUN_FINAL_CUSTOMERS.csv
  if (fs.existsSync('scripts/ALVOUN_FINAL_CUSTOMERS.csv')) {
    const csvContent = fs.readFileSync('scripts/ALVOUN_FINAL_CUSTOMERS.csv', 'utf8');
    const lines = csvContent.split('\n').filter(Boolean);
    console.log(`\nscripts/ALVOUN_FINAL_CUSTOMERS.csv: ${lines.length} lines`);
    console.log(`CSV Header: ${lines[0]}`);
    console.log(`Sample Row: ${lines[1]}`);
  }

  // --- 3. INSPECT PRE-MIGRATION BACKUP (320 CUSTOMERS) ---
  console.log('\n>>> 3. INSPECTING PRE-MIGRATION BACKUP...');
  const rawBackup = JSON.parse(fs.readFileSync('backups/pre_migration_turso_raw_backup_2026-10-21.json', 'utf8'));
  const backupCustomers: any[] = rawBackup.Customer || [];
  console.log(`Pre-migration backup customer count: ${backupCustomers.length}`);

  const backupRouteMap = new Map<string, string>();
  (rawBackup.Route || []).forEach((r: any) => backupRouteMap.set(r.id, r.name));

  const backupAreaMap = new Map<string, string>();
  (rawBackup.Area || []).forEach((a: any) => backupAreaMap.set(a.id, a.name));

  const backupByRoute: Record<string, number> = {};
  backupCustomers.forEach(c => {
    const rName = backupRouteMap.get(c.routeId) || 'Unknown Route';
    backupByRoute[rName] = (backupByRoute[rName] || 0) + 1;
  });
  console.log('Backup Customers by Route:');
  console.table(backupByRoute);

  // --- 4. INSPECT CURRENT LIVE TURSO PRODUCTION DATABASE ---
  console.log('\n>>> 4. INSPECTING LIVE TURSO PRODUCTION DATABASE...');
  const turso = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const totalCustRes = await turso.execute('SELECT count(*) as cnt FROM Customer;');
  const activeCustRes = await turso.execute("SELECT count(*) as cnt FROM Customer WHERE status = 'ACTIVE';");
  const inactiveCustRes = await turso.execute("SELECT count(*) as cnt FROM Customer WHERE status = 'INACTIVE';");
  console.log(`Total Customers in Turso: ${totalCustRes.rows[0].cnt}`);
  console.log(`Active Customers in Turso: ${activeCustRes.rows[0].cnt}`);
  console.log(`Inactive Customers in Turso: ${inactiveCustRes.rows[0].cnt}`);

  const routeCustRes = await turso.execute(`
    SELECT r.name as routeName, count(c.id) as cnt 
    FROM Customer c 
    LEFT JOIN Route r ON c.routeId = r.id 
    GROUP BY r.name;
  `);
  console.log('\nLive Turso Customers Grouped by Route:');
  console.table(routeCustRes.rows);

  const areaCustRes = await turso.execute(`
    SELECT a.name as areaName, count(c.id) as cnt 
    FROM Customer c 
    LEFT JOIN Area a ON c.areaId = a.id 
    GROUP BY a.name 
    ORDER BY cnt DESC;
  `);
  console.log('\nLive Turso Customers Grouped by Area (Top 15):');
  console.table(areaCustRes.rows.slice(0, 15));

  // --- 5. RECONCILIATION: WHICH CUSTOMERS FROM BACKUP ARE ABSENT? ---
  console.log('\n>>> 5. RECONCILING BACKUP VS CURRENT DATABASE...');
  const currentCustRes = await turso.execute('SELECT id, customerName, routeId, areaId, contact, address FROM Customer;');
  const currentCusts = currentCustRes.rows;
  const currentNameSet = new Set(currentCusts.map(c => String(c.customerName).trim().toLowerCase()));

  const absentFromCurrent: any[] = [];
  const presentInCurrent: any[] = [];

  for (const bc of backupCustomers) {
    const bName = String(bc.customerName).trim().toLowerCase();
    if (currentNameSet.has(bName)) {
      presentInCurrent.push(bc);
    } else {
      absentFromCurrent.push(bc);
    }
  }

  console.log(`Total in Pre-Migration Backup: ${backupCustomers.length}`);
  console.log(`Present in Current Master (from backup): ${presentInCurrent.length}`);
  console.log(`Absent from Current Master (present in backup but absent now): ${absentFromCurrent.length}`);

  // Breakdown of absent customers by route
  const absentByRoute: Record<string, number> = {};
  absentFromCurrent.forEach(c => {
    const rName = backupRouteMap.get(c.routeId) || 'Unknown Route';
    absentByRoute[rName] = (absentByRoute[rName] || 0) + 1;
  });
  console.log('\nAbsent Customers Grouped by Route:');
  console.table(absentByRoute);

  console.log('\nFirst 20 Absent Customer Names from Backup:');
  console.table(absentFromCurrent.slice(0, 20).map(c => ({
    name: c.customerName,
    route: backupRouteMap.get(c.routeId),
    area: backupAreaMap.get(c.areaId),
    contact: c.contact,
    code: c.code
  })));
}

investigate().catch(console.error);
