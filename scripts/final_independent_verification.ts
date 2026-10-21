import dotenv from 'dotenv';
dotenv.config({ path: 'd:/alvoun/.env.local', override: true });
import { createClient } from '@libsql/client';

async function finalVerify() {
  const turso = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const total = Number((await turso.execute('SELECT count(*) as cnt FROM Customer;')).rows[0].cnt);
  const active = Number((await turso.execute("SELECT count(*) as cnt FROM Customer WHERE status = 'ACTIVE';")).rows[0].cnt);
  const inactive = Number((await turso.execute("SELECT count(*) as cnt FROM Customer WHERE status = 'INACTIVE';")).rows[0].cnt);

  // 250ml rate check
  const p250Res = await turso.execute("SELECT id FROM Product WHERE name LIKE '%250%';");
  const p250Id = p250Res.rows[0].id;
  const rates250Res = await turso.execute({
    sql: 'SELECT count(*) as cnt FROM CustomerProductRate WHERE productId = ? AND rate = 8000;',
    args: [p250Id]
  });

  // Balance checks
  const debitRes = await turso.execute("SELECT sum(openingBalance) as sum, count(*) as cnt FROM Customer WHERE openingBalanceType = 'DEBIT' AND openingBalance > 0;");
  const creditRes = await turso.execute("SELECT sum(openingBalance) as sum, count(*) as cnt FROM Customer WHERE openingBalanceType = 'CREDIT' AND openingBalance > 0;");
  const zeroRes = await turso.execute("SELECT count(*) as cnt FROM Customer WHERE openingBalance = 0;");

  console.log('--- FINAL INDEPENDENT PRODUCTION VERIFICATION ---');
  console.log(`Total Customers: ${total}`);
  console.log(`Active Customers: ${active}`);
  console.log(`Inactive Customers: ${inactive}`);
  console.log(`250ml Rates at ₹80 (8000 paise): ${rates250Res.rows[0].cnt} / ${total}`);
  console.log(`Debit Opening Accounts: ${debitRes.rows[0].cnt}, Total: ₹${((Number(debitRes.rows[0].sum) || 0) / 100).toFixed(2)}`);
  console.log(`Credit Opening Accounts: ${creditRes.rows[0].cnt}, Total: ₹${((Number(creditRes.rows[0].sum) || 0) / 100).toFixed(2)}`);
  console.log(`Zero Balance Accounts: ${zeroRes.rows[0].cnt}`);
  console.log(`Net Market Dues: ₹${(((Number(debitRes.rows[0].sum) || 0) - (Number(creditRes.rows[0].sum) || 0)) / 100).toFixed(2)}`);

  // Verify multi-branch outlets
  const multiNames = ['Zupda Hotel', 'Mahadev Rajwadi Tea', 'Jay Ambe Rajwadi', 'Kesar Rajwadi Tea'];
  for (const n of multiNames) {
    const outlets = (await turso.execute({
      sql: `SELECT c.id, c.customerName, r.name as routeName, a.name as areaName, c.openingBalance, c.openingBalanceType
            FROM Customer c
            JOIN Route r ON c.routeId = r.id
            LEFT JOIN Area a ON c.areaId = a.id
            WHERE lower(c.customerName) = lower(?);`,
      args: [n]
    })).rows;
    console.log(`\nVerified Outlets for "${n}": ${outlets.length} branches:`);
    console.table(outlets);
  }
}

finalVerify().catch(console.error);
