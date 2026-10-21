import dotenv from 'dotenv';
dotenv.config({ path: 'd:/alvoun/.env.local', override: true });
import { createClient } from '@libsql/client';

async function verify() {
  console.log('=== VERIFYING LIVE PRODUCTION DATABASE POST-IMPORT ===\n');
  const turso = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  // 1. Table Counts & Financial Sums
  const [salesRes, paymentsRes, itemsRes, salesmenRes] = await Promise.all([
    turso.execute(`
      SELECT 
        COUNT(*) as totalSales,
        SUM(totalAmount) as sumGrossSalesPaise,
        MIN(saleDate) as minDate,
        MAX(saleDate) as maxDate
      FROM Sale;
    `),
    turso.execute(`
      SELECT 
        COUNT(*) as totalPayments,
        SUM(amount) as sumCollectionsPaise,
        MIN(paymentDate) as minDate,
        MAX(paymentDate) as maxDate
      FROM Payment;
    `),
    turso.execute(`
      SELECT 
        COUNT(*) as totalItems,
        p.name as productName,
        SUM(si.crates) as totalCrates,
        SUM(si.amount) as totalItemPaise
      FROM SaleItem si
      JOIN Product p ON si.productId = p.id
      GROUP BY p.name;
    `),
    turso.execute('SELECT COUNT(*) as count FROM Salesman;')
  ]);

  const sales = salesRes.rows[0];
  const payments = paymentsRes.rows[0];

  console.log('--- 1. TRANSACTION TABLES & TOTALS ---');
  console.log('Sales Count:', sales.totalSales, '(Expected: 951)');
  console.log('Gross Sales:', `₹${(Number(sales.sumGrossSalesPaise) / 100).toLocaleString('en-IN')}`, '(Expected: ₹3,12,205.00)');
  console.log('Sales Date Range:', sales.minDate, 'to', sales.maxDate);
  console.log('Payments Count:', payments.totalPayments, '(Expected: 865)');
  console.log('Total Collections:', `₹${(Number(payments.sumCollectionsPaise) / 100).toLocaleString('en-IN')}`, '(Expected: ₹2,94,295.00)');
  console.log('Payments Date Range:', payments.minDate, 'to', payments.maxDate);
  console.log('Active Salesmen:', salesmenRes.rows[0].count);

  console.log('\n--- 2. PRODUCT VOLUME BREAKDOWN ---');
  let totalCratesSum = 0;
  for (const item of itemsRes.rows) {
    console.log(`Product: ${item.productName} -> ${item.totalCrates} crates, ₹${(Number(item.totalItemPaise) / 100).toLocaleString('en-IN')}`);
    totalCratesSum += Number(item.totalCrates);
  }
  console.log(`Total Volume across all products: ${totalCratesSum} crates (Expected: 3,050 crates)`);

  // 3. Customer Ledger & Outstanding Dues Verification
  const custLedgerRes = await turso.execute(`
    SELECT 
      c.id,
      c.customerName,
      c.openingBalance,
      c.openingBalanceType,
      COALESCE(s.totalSalesPaise, 0) as totalSalesPaise,
      COALESCE(p.totalPaymentsPaise, 0) as totalPaymentsPaise
    FROM Customer c
    LEFT JOIN (
      SELECT customerId, SUM(totalAmount) as totalSalesPaise
      FROM Sale
      GROUP BY customerId
    ) s ON c.id = s.customerId
    LEFT JOIN (
      SELECT customerId, SUM(amount) as totalPaymentsPaise
      FROM Payment
      GROUP BY customerId
    ) p ON c.id = p.customerId;
  `);

  let totalOutstandingDebitPaise = 0;
  let totalOutstandingCreditPaise = 0;
  let debitAccounts = 0;
  let creditAccounts = 0;
  let zeroAccounts = 0;

  for (const row of custLedgerRes.rows) {
    const openingSigned = (row.openingBalanceType === 'DEBIT' ? Number(row.openingBalance) : -Number(row.openingBalance)) || 0;
    const netDuesPaise = openingSigned + Number(row.totalSalesPaise) - Number(row.totalPaymentsPaise);

    if (netDuesPaise > 0) {
      debitAccounts++;
      totalOutstandingDebitPaise += netDuesPaise;
    } else if (netDuesPaise < 0) {
      creditAccounts++;
      totalOutstandingCreditPaise += Math.abs(netDuesPaise);
    } else {
      zeroAccounts++;
    }
  }

  const netClosingDuesPaise = totalOutstandingDebitPaise - totalOutstandingCreditPaise;

  console.log('\n--- 3. CUSTOMER OUTSTANDING AUDIT (333 OUTLETS) ---');
  console.log(`Debit Accounts (Receivables): ${debitAccounts} (Total: ₹${(totalOutstandingDebitPaise / 100).toLocaleString('en-IN')})`);
  console.log(`Credit Accounts (Advance): ${creditAccounts} (Total: ₹${(totalOutstandingCreditPaise / 100).toLocaleString('en-IN')})`);
  console.log(`Zero Balance Accounts: ${zeroAccounts}`);
  console.log(`Net Closing Balance: ₹${(netClosingDuesPaise / 100).toLocaleString('en-IN')} (Expected: ₹17,910.00)`);

  const pass = 
    Number(sales.totalSales) === 951 &&
    Number(sales.sumGrossSalesPaise) === 31220500 &&
    Number(payments.totalPayments) === 865 &&
    Number(payments.sumCollectionsPaise) === 29429500 &&
    netClosingDuesPaise === 1791000 &&
    debitAccounts === 36 &&
    creditAccounts === 17 &&
    zeroAccounts === 280;

  if (pass) {
    console.log('\n✓ PRODUCTION VERIFICATION PASSED WITH ZERO DISCREPANCIES!');
  } else {
    console.error('\n✗ PRODUCTION VERIFICATION FAILED CRITICAL CHECKS!');
    process.exit(1);
  }
}

verify().catch(console.error);
