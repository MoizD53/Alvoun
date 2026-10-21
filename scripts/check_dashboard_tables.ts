import dotenv from 'dotenv';
dotenv.config({ path: 'd:/alvoun/.env.local', override: true });
import { createClient } from '@libsql/client';

async function check() {
  const turso = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const tables = [
    'Customer', 'Sale', 'SaleItem', 'Payment', 'Expense', 
    'ProductionBatch', 'RawMaterial', 'StaffMember', 
    'StaffAttendance', 'PayrollRecord', 'Visit', 'WorkSession'
  ];
  for (const t of tables) {
    const res = await turso.execute('SELECT COUNT(*) as count FROM ' + t);
    console.log(`${t} count: ${res.rows[0].count}`);
  }

  const latestSale = await turso.execute('SELECT MAX(saleDate) as maxDate, MIN(saleDate) as minDate FROM Sale');
  console.log('Sale date range:', latestSale.rows[0]);
  const latestPay = await turso.execute('SELECT MAX(paymentDate) as maxDate, MIN(paymentDate) as minDate FROM Payment');
  console.log('Payment date range:', latestPay.rows[0]);
  const latestExp = await turso.execute('SELECT MAX(expenseDate) as maxDate, MIN(expenseDate) as minDate FROM Expense');
  console.log('Expense date range:', latestExp.rows[0]);
  const latestProd = await turso.execute('SELECT MAX(productionDate) as maxDate, MIN(productionDate) as minDate FROM ProductionBatch');
  console.log('Production date range:', latestProd.rows[0]);
}

check().catch(console.error);
