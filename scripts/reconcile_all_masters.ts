import * as xlsx from 'xlsx';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/alvoun/.env.local' });
import { createClient } from '@libsql/client';

async function reconcileAll() {
  console.log('======================================================================');
  console.log(' COMPLETE CUSTOMER MASTER RECONCILIATION: "an Alvoun.xlsx"');
  console.log('======================================================================\n');

  // 1. Read an Alvoun.xlsx
  const wb = xlsx.readFile('d:/alvoun/an Alvoun.xlsx');
  const ws = wb.Sheets['Account'];
  const rawRows: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const header = rawRows[0];
  const rows = rawRows.slice(1);

  console.log(`an Alvoun.xlsx -> Total rows in "Account": ${rows.length}`);
  console.log('Headers:', header);

  interface MasterItem {
    rowIdx: number;
    name: string;
    route: string;
    area: string;
    contact: string;
    rate1L: number;
    rate500ML: number;
  }

  const masterList: MasterItem[] = [];
  const nameCounts: Record<string, number> = {};
  const duplicateRows: { name: string; rows: any[] }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    const rawName = r[0];
    if (!rawName) continue;
    const name = String(rawName).trim();
    if (!name) continue;

    nameCounts[name.toLowerCase()] = (nameCounts[name.toLowerCase()] || 0) + 1;

    masterList.push({
      rowIdx: i + 2,
      name,
      route: r[1] ? String(r[1]).trim() : '',
      area: r[2] ? String(r[2]).trim() : '',
      contact: r[3] !== undefined && r[3] !== null ? String(r[3]).trim() : '',
      rate1L: Number(r[4]) || 0,
      rate500ML: Number(r[5]) || 0,
    });
  }

  console.log(`\nValid Customer Rows parsed from "an Alvoun.xlsx": ${masterList.length}`);
  const distinctNames = new Set(masterList.map(m => m.name.toLowerCase()));
  console.log(`Distinct Customer Names: ${distinctNames.size}`);

  // Check duplicates in an Alvoun.xlsx
  const dupes = Object.entries(nameCounts).filter(([_, count]) => count > 1);
  console.log(`Duplicate names in "an Alvoun.xlsx": ${dupes.length}`);
  if (dupes.length > 0) {
    console.log('Duplicate names and frequencies:');
    dupes.forEach(([n, c]) => {
      const occurrences = masterList.filter(m => m.name.toLowerCase() === n);
      console.log(`  - "${occurrences[0].name}" appears ${c} times (Rows: ${occurrences.map(o => o.rowIdx).join(', ')})`);
      occurrences.forEach(o => {
        console.log(`      Row ${o.rowIdx}: Route="${o.route}", Area="${o.area}", Contact="${o.contact}", 1L=${o.rate1L}, 500ML=${o.rate500ML}`);
      });
    });
  }

  // 2. Read Book1.xlsx (18-day transaction ledger with 153 transacting customers)
  const wbBook1 = xlsx.readFile('d:/alvoun/Book1.xlsx');
  const wsBook1 = wbBook1.Sheets['Sheet3'];
  const book1Rows = (xlsx.utils.sheet_to_json(wsBook1, { header: 1 }) as any[][]).slice(1);
  const book1CustBalances: Record<string, {
    name: string;
    route: string;
    totalDebit: number;
    totalCredit: number;
    netOutstanding: number;
    rate1L: number;
    rate500ML: number;
  }> = {};

  for (const r of book1Rows) {
    const rawName = r[4];
    if (!rawName) continue;
    const name = String(rawName).trim();
    if (!name) continue;

    if (!book1CustBalances[name.toLowerCase()]) {
      book1CustBalances[name.toLowerCase()] = {
        name,
        route: r[1] ? String(r[1]).trim() : '',
        totalDebit: 0,
        totalCredit: 0,
        netOutstanding: 0,
        rate1L: Number(r[7]) || 0,
        rate500ML: Number(r[10]) || 0,
      };
    }
    const b = book1CustBalances[name.toLowerCase()];
    if (r[7] && Number(r[7]) > 0) b.rate1L = Number(r[7]);
    if (r[10] && Number(r[10]) > 0) b.rate500ML = Number(r[10]);
    b.totalCredit += Number(r[15]) || 0;
    b.totalDebit += Number(r[16]) || 0;
    b.netOutstanding = b.totalDebit - b.totalCredit;
  }
  const book1DistinctCount = Object.keys(book1CustBalances).length;
  console.log(`\nDistinct Transacting Customers in Book1.xlsx: ${book1DistinctCount}`);

  // 3. Read Pre-Migration Backup (320 customers)
  const backup = JSON.parse(fs.readFileSync('backups/pre_migration_turso_raw_backup_2026-10-21.json', 'utf8'));
  const backupCustomers: any[] = backup.Customer || [];
  console.log(`Pre-migration Backup Customers count: ${backupCustomers.length}`);

  // 4. Read Live Turso DB (153 customers currently)
  const turso = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
  const liveTursoCusts = (await turso.execute('SELECT id, customerName, routeId, areaId, contact, address, openingBalance, openingBalanceType FROM Customer;')).rows;
  console.log(`Current Live Turso Customers count: ${liveTursoCusts.length}`);

  // Cross-compare an Alvoun.xlsx vs Book1.xlsx
  console.log('\n--- CROSS-COMPARISON: "an Alvoun.xlsx" vs "Book1.xlsx" ---');
  let book1InAnAlvoun = 0;
  const book1NotInAnAlvoun: string[] = [];
  for (const [lowerName, b] of Object.entries(book1CustBalances)) {
    if (distinctNames.has(lowerName)) {
      book1InAnAlvoun++;
    } else {
      book1NotInAnAlvoun.push(b.name);
    }
  }
  console.log(`Book1.xlsx customers present in "an Alvoun.xlsx": ${book1InAnAlvoun} / ${book1DistinctCount}`);
  console.log(`Book1.xlsx customers NOT in "an Alvoun.xlsx": ${book1NotInAnAlvoun.length}`);
  if (book1NotInAnAlvoun.length > 0) {
    console.log('Book1 customers not in an Alvoun.xlsx:', book1NotInAnAlvoun);
  }

  // Cross-compare an Alvoun.xlsx vs Pre-Migration Backup
  console.log('\n--- CROSS-COMPARISON: "an Alvoun.xlsx" vs Pre-Migration Backup (320) ---');
  const backupNameMap = new Map<string, any>();
  backupCustomers.forEach(c => backupNameMap.set(String(c.customerName).trim().toLowerCase(), c));

  let anAlvounInBackup = 0;
  const anAlvounNotInBackup: MasterItem[] = [];
  for (const m of masterList) {
    if (backupNameMap.has(m.name.toLowerCase())) {
      anAlvounInBackup++;
    } else {
      anAlvounNotInBackup.push(m);
    }
  }
  console.log(`"an Alvoun.xlsx" customers present in 320 Backup: ${anAlvounInBackup} / ${masterList.length}`);
  console.log(`"an Alvoun.xlsx" customers NOT in 320 Backup (Brand New Accounts): ${anAlvounNotInBackup.length}`);
  if (anAlvounNotInBackup.length > 0) {
    console.log('Brand New Accounts in an Alvoun.xlsx:', anAlvounNotInBackup.map(m => `Row ${m.rowIdx}: "${m.name}" (${m.route})`));
  }

  let backupNotInAnAlvoun = 0;
  const backupNamesNotInAnAlvoun: string[] = [];
  for (const bc of backupCustomers) {
    const bName = String(bc.customerName).trim().toLowerCase();
    if (!distinctNames.has(bName)) {
      backupNotInAnAlvoun++;
      backupNamesNotInAnAlvoun.push(bc.customerName);
    }
  }
  console.log(`320 Backup customers NOT in "an Alvoun.xlsx": ${backupNotInAnAlvoun}`);
  if (backupNamesNotInAnAlvoun.length > 0) {
    console.log('Backup customers not in an Alvoun.xlsx sample (first 15):', backupNamesNotInAnAlvoun.slice(0, 15));
  }

  // Route breakdown of an Alvoun.xlsx
  console.log('\n--- ROUTE BREAKDOWN IN "an Alvoun.xlsx" ---');
  const routeDist: Record<string, number> = {};
  for (const m of masterList) {
    routeDist[m.route] = (routeDist[m.route] || 0) + 1;
  }
  console.table(routeDist);

  // Rate breakdown in an Alvoun.xlsx
  console.log('\n--- RATE BREAKDOWN IN "an Alvoun.xlsx" ---');
  const rates1L: Record<string, number> = {};
  const rates500ML: Record<string, number> = {};
  for (const m of masterList) {
    rates1L[String(m.rate1L)] = (rates1L[String(m.rate1L)] || 0) + 1;
    rates500ML[String(m.rate500ML)] = (rates500ML[String(m.rate500ML)] || 0) + 1;
  }
  console.log('1 Litre Rates distribution:');
  console.table(rates1L);
  console.log('500 ml Rates distribution:');
  console.table(rates500ML);

  // Opening Balance matching:
  // How many of the 333 master list have non-zero opening balances from Book1 transactions?
  let masterWithBook1Balance = 0;
  let masterWithZeroBalance = 0;
  for (const m of masterList) {
    const b = book1CustBalances[m.name.toLowerCase()];
    if (b && b.netOutstanding !== 0) {
      masterWithBook1Balance++;
    } else {
      masterWithZeroBalance++;
    }
  }
  console.log('\n--- OPENING BALANCE LINKAGE ---');
  console.log(`Customers with pending/credit balance from Book1 18-day transactions: ${masterWithBook1Balance}`);
  console.log(`Customers with clean ₹0 starting balance (no pending dues in Book1): ${masterWithZeroBalance}`);
}

reconcileAll().catch(console.error);
