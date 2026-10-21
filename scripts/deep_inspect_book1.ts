import * as xlsx from 'xlsx';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/alvoun/.env.local' });
import { createClient } from '@libsql/client';

interface CustomerData {
  name: string;
  route: string;
  salesmen: Set<string>;
  rate1L: number;
  rate500ML: number;
  rate250ML: number;
  rates1LSeen: Set<number>;
  rates500MLSeen: Set<number>;
  totalDebit: number;
  totalCredit: number;
  netOutstanding: number;
  txCount: number;
  firstDate: number;
  lastDate: number;
}

async function inspect() {
  const wb = xlsx.readFile('d:/alvoun/Book1.xlsx');
  const ws = wb.Sheets['Sheet3'];
  const rawRows: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const rows = rawRows.slice(1);

  console.log(`Total rows in Sheet3: ${rows.length}`);

  const turso = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const routesResult = await turso.execute('SELECT id, name FROM Route;');
  const dbRoutes = routesResult.rows as unknown as { id: string; name: string }[];
  console.log('DB Routes:', dbRoutes);

  const areasResult = await turso.execute('SELECT id, name, routeId FROM Area;');
  const dbAreas = areasResult.rows as unknown as { id: string; name: string; routeId: string }[];
  console.log(`DB Areas count: ${dbAreas.length}`);

  const productsResult = await turso.execute('SELECT id, name, bottlesPerCrate FROM Product;');
  const dbProducts = productsResult.rows as unknown as { id: string; name: string; bottlesPerCrate: number }[];
  console.log('DB Products:', dbProducts);

  const customers: Record<string, CustomerData> = {};

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rawName = r[4];
    if (!rawName) continue;
    const name = String(rawName).trim();
    if (!name) continue;

    const route = r[1] ? String(r[1]).trim() : '';
    const salesman = r[2] ? String(r[2]).trim() : '';
    const r1L = Number(r[7]) || 0;
    const r500 = Number(r[10]) || 0;
    const credit = Number(r[15]) || 0;
    const debit = Number(r[16]) || 0;
    const date = Number(r[0]) || 0;

    if (!customers[name]) {
      customers[name] = {
        name,
        route,
        salesmen: new Set<string>(),
        rate1L: 0,
        rate500ML: 0,
        rate250ML: 80, // Default 250ml crate rate = Rs. 80
        rates1LSeen: new Set<number>(),
        rates500MLSeen: new Set<number>(),
        totalDebit: 0,
        totalCredit: 0,
        netOutstanding: 0,
        txCount: 0,
        firstDate: date,
        lastDate: date,
      };
    }

    const c = customers[name];
    if (route) c.route = route;
    if (salesman) c.salesmen.add(salesman);
    if (r1L > 0) {
      c.rates1LSeen.add(r1L);
      c.rate1L = r1L; // most recent or seen
    }
    if (r500 > 0) {
      c.rates500MLSeen.add(r500);
      c.rate500ML = r500;
    }
    c.totalDebit += debit;
    c.totalCredit += credit;
    c.netOutstanding = c.totalDebit - c.totalCredit;
    c.txCount++;
    if (date > c.lastDate) c.lastDate = date;
    if (date < c.firstDate) c.firstDate = date;
  }

  const custList = Object.values(customers);
  console.log(`\nDistinct Customer Names: ${custList.length}`);

  // Route breakdown
  const routeCounts: Record<string, number> = {};
  for (const c of custList) {
    routeCounts[c.route] = (routeCounts[c.route] || 0) + 1;
  }
  console.log('\nRoute distribution:');
  console.table(routeCounts);

  // Rate analysis
  const missing1LRate = custList.filter(c => c.rate1L === 0);
  const missing500Rate = custList.filter(c => c.rate500ML === 0);
  const multi1LRates = custList.filter(c => c.rates1LSeen.size > 1);
  const multi500Rates = custList.filter(c => c.rates500MLSeen.size > 1);

  console.log(`Customers missing 1L rate: ${missing1LRate.length}`);
  if (missing1LRate.length > 0) {
    console.log('Missing 1L customers:', missing1LRate.map(c => c.name));
  }
  console.log(`Customers missing 500ML rate: ${missing500Rate.length}`);
  if (missing500Rate.length > 0) {
    console.log('Missing 500ML customers:', missing500Rate.map(c => c.name));
  }
  console.log(`Customers with multiple 1L rates seen: ${multi1LRates.length}`);
  if (multi1LRates.length > 0) {
    console.log('Multi 1L rates:', multi1LRates.map(c => ({ name: c.name, rates: Array.from(c.rates1LSeen) })));
  }
  console.log(`Customers with multiple 500ML rates seen: ${multi500Rates.length}`);
  if (multi500Rates.length > 0) {
    console.log('Multi 500ML rates:', multi500Rates.map(c => ({ name: c.name, rates: Array.from(c.rates500MLSeen) })));
  }

  // Outstanding breakdown
  const debitCust = custList.filter(c => c.netOutstanding > 0);
  const creditCust = custList.filter(c => c.netOutstanding < 0);
  const zeroCust = custList.filter(c => c.netOutstanding === 0);

  const totalDebitSum = debitCust.reduce((s, c) => s + c.netOutstanding, 0);
  const totalCreditSum = creditCust.reduce((s, c) => s + Math.abs(c.netOutstanding), 0);
  const netDiff = custList.reduce((s, c) => s + c.netOutstanding, 0);

  console.log('\n--- BALANCE BREAKDOWN ---');
  console.log(`Customers owing money (DEBIT balance): ${debitCust.length}, Total Rs. ${totalDebitSum} (${totalDebitSum * 100} paise)`);
  console.log(`Customers with advance/overpaid (CREDIT balance): ${creditCust.length}, Total Rs. ${totalCreditSum} (${totalCreditSum * 100} paise)`);
  console.log(`Customers with zero balance: ${zeroCust.length}`);
  console.log(`Overall Net Balance across all customers: Rs. ${netDiff}`);

  console.log('\nAll DEBIT customers:');
  console.table(debitCust.map(c => ({
    name: c.name,
    route: c.route,
    rate1L: c.rate1L,
    rate500ML: c.rate500ML,
    debit: c.netOutstanding,
  })));

  console.log('\nAll CREDIT customers (advance):');
  console.table(creditCust.map(c => ({
    name: c.name,
    route: c.route,
    rate1L: c.rate1L,
    rate500ML: c.rate500ML,
    credit: Math.abs(c.netOutstanding),
  })));
}

inspect().catch(console.error);
