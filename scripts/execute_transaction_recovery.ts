import * as xlsx from 'xlsx';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/alvoun/.env.local', override: true });
import { createClient } from '@libsql/client';
import crypto from 'crypto';

function cuid(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 10);
  return `c${ts}${rand}`;
}

function excelDateToIST(serial: number, hourOffset = 10): Date {
  const utc_days = Math.floor(serial - 25569);
  // Create UTC date for midnight of that day
  const d = new Date(utc_days * 86400 * 1000);
  // We want it to be 10:00:00 AM IST on that day
  // 10:00 AM IST = 04:30 AM UTC
  const istDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 4, 30, 0));
  return istDate;
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`=== ALVOUN HISTORICAL TRANSACTION RECOVERY (Mode: ${isDryRun ? 'DRY-RUN' : 'LIVE PRODUCTION'}) ===\n`);

  const turso = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  // 1. Fetch reference data from DB
  const [custRows, prodRows, routeRows, salesmanRows, profileRows] = await Promise.all([
    turso.execute(`
      SELECT c.id, c.customerName, c.openingBalance, c.openingBalanceType, r.name as routeName, a.name as areaName
      FROM Customer c
      JOIN Route r ON c.routeId = r.id
      LEFT JOIN Area a ON c.areaId = a.id;
    `),
    turso.execute('SELECT id, name, bottlesPerCrate FROM Product;'),
    turso.execute('SELECT id, name FROM Route;'),
    turso.execute('SELECT id, name, employeeCode FROM Salesman;'),
    turso.execute('SELECT id, email, role FROM Profile;')
  ]);

  const dbCusts = custRows.rows as any[];
  const dbProds = prodRows.rows as any[];
  console.log(`Live DB: ${dbCusts.length} Customers, ${dbProds.length} Products, ${salesmanRows.rows.length} Salesmen, ${profileRows.rows.length} Profiles.`);

  const prod1L = dbProds.find(p => p.name.includes('1'));
  const prod500ml = dbProds.find(p => p.name.includes('500'));
  const prod250ml = dbProds.find(p => p.name.includes('250'));

  if (!prod1L || !prod500ml) {
    throw new Error('Required products (1L, 500ml) not found in database!');
  }
  console.log(`Product 1L ID: ${prod1L.id}, Product 500ml ID: ${prod500ml.id}`);

  // 2. Read and parse Book1.xlsx
  const wb = xlsx.readFile('d:/alvoun/Book1.xlsx');
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = (xlsx.utils.sheet_to_json(ws, { header: 1 }) as any[][]).slice(1);
  console.log(`Book1.xlsx: Loaded ${rows.length} transaction rows.`);

  // 3. Match customers
  const customerMap = new Map<string, string>(); // 'name|route' -> custId
  for (const c of dbCusts) {
    const key = `${c.customerName.trim().toLowerCase()}|${c.routeName.trim().toLowerCase()}`;
    customerMap.set(key, c.id);
  }

  // 4. Salesman mapping
  const knownSalesmen = [
    { name: 'Moin', code: 'SALES-001', email: 'moin@alvoun.local' },
    { name: 'Sufiyan', code: 'SALES-002', email: 'sufiyan@alvoun.local' },
    { name: 'Salim Bhai', code: 'SALES-003', email: 'salimbhai@alvoun.local' },
    { name: 'Sumit', code: 'SALES-004', email: 'sumit@alvoun.local' },
    { name: 'Husain', code: 'SALES-005', email: 'husain@alvoun.local' },
    { name: 'Waqar', code: 'SALES-006', email: 'waqar@alvoun.local' },
    { name: 'Sonu', code: 'SALES-007', email: 'sonu@alvoun.local' },
    { name: 'Kalpesh', code: 'SALES-008', email: 'kalpesh@alvoun.local' },
    { name: 'Alvoun Delivery', code: 'SALES-009', email: 'delivery@alvoun.local' }
  ];

  const salesmanIdMap = new Map<string, string>();
  for (const s of salesmanRows.rows as any[]) {
    salesmanIdMap.set(s.name.toLowerCase(), s.id);
  }

  // Prepare salesman creation statements if salesmen don't exist
  const salesmanStatements: any[] = [];
  for (const s of knownSalesmen) {
    let sId = salesmanIdMap.get(s.name.toLowerCase());
    if (!sId) {
      sId = cuid();
      const pId = cuid();
      salesmanIdMap.set(s.name.toLowerCase(), sId);
      salesmanStatements.push({
        sql: `INSERT INTO Profile (id, email, password, name, role, isActive, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, 'SALESMAN', 1, datetime('now'), datetime('now'));`,
        args: [pId, s.email, '$2b$10$RqS2BPsXZNlJQR2rqchPcOT4AljNhecEBaBZXPFQK7ibWtpZB.lK2', s.name]
      });
      salesmanStatements.push({
        sql: `INSERT INTO Salesman (id, profileId, employeeCode, name, phone, isActive, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, '9876543210', 1, datetime('now'), datetime('now'));`,
        args: [sId, pId, s.code, s.name]
      });
    }
  }

  function resolveSalesmanId(driver1: string, driver2: string): string {
    const d1 = driver1.trim().toLowerCase();
    const d2 = driver2.trim().toLowerCase();
    if (d1 && salesmanIdMap.has(d1)) return salesmanIdMap.get(d1)!;
    if (d2 && salesmanIdMap.has(d2)) return salesmanIdMap.get(d2)!;
    return salesmanIdMap.get('alvoun delivery')!;
  }

  // 5. Parse transactions
  let totalGrossSalesPaise = 0;
  let totalCollectionsPaise = 0;
  let total1LCrates = 0;
  let total500mlCrates = 0;

  const saleStatements: any[] = [];
  const saleItemStatements: any[] = [];
  const paymentStatements: any[] = [];

  const customerLedgerCheck = new Map<string, { salesPaise: number; paymentsPaise: number }>();

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    if (!r || !r[4]) continue;

    const rowNum = idx + 2;
    const dateSerial = Number(r[0]);
    const route = String(r[1] || '').trim();
    const driver1 = String(r[2] || '').trim();
    const driver2 = String(r[3] || '').trim();
    const custName = String(r[4]).trim();

    const q1 = Number(r[6]) || 0;
    const r1 = Number(r[7]) || 0;
    const a1 = Number(r[8]) || 0;

    const q5 = Number(r[9]) || 0;
    const r5 = Number(r[10]) || 0;
    const a5 = Number(r[11]) || 0;

    const totalAmt = Number(r[13]) || 0;
    const payMode = String(r[14] || '').trim();
    const creditAmt = Number(r[15]) || 0;

    // Find customer ID
    let custId = customerMap.get(`${custName.toLowerCase()}|${route.toLowerCase()}`);
    if (!custId) {
      // Fallback: match by name
      const matches = dbCusts.filter(c => c.customerName.trim().toLowerCase() === custName.toLowerCase());
      if (matches.length === 1) {
        custId = matches[0].id;
      } else {
        throw new Error(`Row ${rowNum}: Cannot uniquely resolve customer '${custName}' on route '${route}'`);
      }
    }

    if (!custId) {
      throw new Error(`Row ${rowNum}: Customer ID could not be determined for '${custName}'`);
    }

    const txDate = excelDateToIST(dateSerial);
    const txDateStr = txDate.toISOString();
    const salesmanId = resolveSalesmanId(driver1, driver2);

    // Track ledger
    const ledger = customerLedgerCheck.get(custId) || { salesPaise: 0, paymentsPaise: 0 };

    // 5A. Handle Sale (if totalAmt > 0 or crates delivered)
    if (totalAmt > 0 || q1 > 0 || q5 > 0) {
      const saleId = cuid();
      const saleAmtPaise = Math.round(totalAmt * 100);
      totalGrossSalesPaise += saleAmtPaise;
      ledger.salesPaise += saleAmtPaise;

      saleStatements.push({
        sql: `INSERT INTO Sale (id, customerId, salesmanId, saleDate, totalAmount, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?);`,
        args: [saleId, custId, salesmanId, txDateStr, saleAmtPaise, txDateStr, txDateStr]
      });

      // 1L Item
      if (q1 > 0) {
        total1LCrates += q1;
        const itemAmtPaise = Math.round(a1 * 100);
        const ratePaise = Math.round(r1 * 100);
        saleItemStatements.push({
          sql: `INSERT INTO SaleItem (id, saleId, productId, crates, looseBottles, standardRate, actualRate, amount, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?);`,
          args: [cuid(), saleId, prod1L.id, q1, ratePaise, ratePaise, itemAmtPaise, txDateStr, txDateStr]
        });
      }

      // 500ml Item
      if (q5 > 0) {
        total500mlCrates += q5;
        const itemAmtPaise = Math.round(a5 * 100);
        const ratePaise = Math.round(r5 * 100);
        saleItemStatements.push({
          sql: `INSERT INTO SaleItem (id, saleId, productId, crates, looseBottles, standardRate, actualRate, amount, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?);`,
          args: [cuid(), saleId, prod500ml.id, q5, ratePaise, ratePaise, itemAmtPaise, txDateStr, txDateStr]
        });
      }
    }

    // 5B. Handle Payment (if creditAmt > 0)
    if (creditAmt > 0) {
      const paymentId = cuid();
      const payAmtPaise = Math.round(creditAmt * 100);
      totalCollectionsPaise += payAmtPaise;
      ledger.paymentsPaise += payAmtPaise;

      const normalizedPayMode = payMode.toUpperCase() === 'UPI' ? 'UPI' : 'Cash';
      const refNumber = `Book1 Row ${rowNum}`;

      paymentStatements.push({
        sql: `INSERT INTO Payment (id, customerId, salesmanId, amount, paymentMethod, referenceNumber, paymentDate, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [paymentId, custId, salesmanId, payAmtPaise, normalizedPayMode, refNumber, txDateStr, txDateStr, txDateStr]
      });
    }

    customerLedgerCheck.set(custId, ledger);
  }

  // 6. Verify ledger against current Turso opening balances
  console.log('\n--- FINANCIAL RECONCILIATION AUDIT ---');
  console.log(`Total Sales to Insert: ${saleStatements.length} records`);
  console.log(`Total SaleItems to Insert: ${saleItemStatements.length} line items`);
  console.log(`Total Payments to Insert: ${paymentStatements.length} records`);
  console.log(`Total 1L Volume: ${total1LCrates} crates`);
  console.log(`Total 500ml Volume: ${total500mlCrates} crates`);
  console.log(`Gross Sales: ₹${(totalGrossSalesPaise / 100).toLocaleString('en-IN')}`);
  console.log(`Collections Received: ₹${(totalCollectionsPaise / 100).toLocaleString('en-IN')}`);
  console.log(`Net Difference: ₹${((totalGrossSalesPaise - totalCollectionsPaise) / 100).toLocaleString('en-IN')}`);

  let customerAuditPass = 0;
  let customerAuditFail = 0;
  const updateBalanceStatements: any[] = [];

  for (const [custId, ledger] of customerLedgerCheck.entries()) {
    const cust = dbCusts.find(c => c.id === custId);
    if (!cust) continue;

    const expectedNetPaise = ledger.salesPaise - ledger.paymentsPaise;
    const currentBalanceSigned = cust.openingBalanceType === 'DEBIT' ? cust.openingBalance : -cust.openingBalance;

    if (expectedNetPaise === currentBalanceSigned) {
      customerAuditPass++;
      // Since transactions are now inserted, reset customer.openingBalance to 0
      // so outstanding = 0 + sales - payments = expectedNetPaise (NO DOUBLE COUNTING!)
      updateBalanceStatements.push({
        sql: `UPDATE Customer SET openingBalance = 0, openingBalanceType = 'DEBIT', updatedAt = datetime('now') WHERE id = ?;`,
        args: [custId]
      });
    } else {
      customerAuditFail++;
      console.error(`Ledger MISMATCH for customer ${cust.customerName} (${custId}): expected ${expectedNetPaise} paise vs current ${currentBalanceSigned} paise!`);
    }
  }

  console.log(`\nCustomer Ledger Verification: ${customerAuditPass} PASSED, ${customerAuditFail} FAILED out of ${customerLedgerCheck.size} transacting customers.`);

  if (customerAuditFail > 0) {
    throw new Error(`ABORTING: ${customerAuditFail} customer ledgers did not reconcile exactly!`);
  }

  if (totalGrossSalesPaise !== 31220500) {
    throw new Error(`ABORTING: Gross sales ${totalGrossSalesPaise} paise does not equal expected 31,220,500 paise!`);
  }

  if (totalCollectionsPaise !== 29429500) {
    throw new Error(`ABORTING: Collections ${totalCollectionsPaise} paise does not equal expected 29,429,500 paise!`);
  }

  console.log('✓ ALL MATHEMATICAL AND LEDGER INTEGRITY CHECKS PASSED WITH 100% PRECISION.\n');

  if (isDryRun) {
    console.log('=== DRY-RUN COMPLETE. NO WRITES WERE PERFORMED TO PRODUCTION DATABASE. ===');
    return;
  }

  // 7. LIVE EXECUTION
  console.log('--- EXECUTING PRODUCTION WRITES IN BATCHES ---');

  // Step A: Upsert Salesmen
  if (salesmanStatements.length > 0) {
    console.log(`Step 1/5: Inserting ${salesmanStatements.length} Salesmen and Profiles...`);
    for (let i = 0; i < salesmanStatements.length; i += 50) {
      const batch = salesmanStatements.slice(i, i + 50);
      await turso.batch(batch, 'write');
    }
    console.log('✓ Salesmen created successfully.');
  } else {
    console.log('Step 1/5: Salesmen already present.');
  }

  // Step B: Insert Sales
  console.log(`Step 2/5: Inserting ${saleStatements.length} Sale records...`);
  for (let i = 0; i < saleStatements.length; i += 50) {
    const batch = saleStatements.slice(i, i + 50);
    await turso.batch(batch, 'write');
  }
  console.log('✓ Sale records inserted successfully.');

  // Step C: Insert SaleItems
  console.log(`Step 3/5: Inserting ${saleItemStatements.length} SaleItem line items...`);
  for (let i = 0; i < saleItemStatements.length; i += 50) {
    const batch = saleItemStatements.slice(i, i + 50);
    await turso.batch(batch, 'write');
  }
  console.log('✓ SaleItem line items inserted successfully.');

  // Step D: Insert Payments
  console.log(`Step 4/5: Inserting ${paymentStatements.length} Payment records...`);
  for (let i = 0; i < paymentStatements.length; i += 50) {
    const batch = paymentStatements.slice(i, i + 50);
    await turso.batch(batch, 'write');
  }
  console.log('✓ Payment records inserted successfully.');

  // Step E: Reset Transacting Customers openingBalance to 0 (Double-Counting Prevention)
  console.log(`Step 5/5: Updating ${updateBalanceStatements.length} transacting customer opening balances to 0...`);
  for (let i = 0; i < updateBalanceStatements.length; i += 50) {
    const batch = updateBalanceStatements.slice(i, i + 50);
    await turso.batch(batch, 'write');
  }
  console.log('✓ Customer opening balances updated to 0 successfully.');

  console.log('\n=== PRODUCTION IMPORT COMPLETED SUCCESSFULLY ===');
}

main().catch(err => {
  console.error('\nEXECUTION FAILED:', err);
  process.exit(1);
});
