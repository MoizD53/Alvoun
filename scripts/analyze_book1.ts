import * as xlsx from 'xlsx';

const wb = xlsx.readFile('d:/alvoun/Book1.xlsx');
const ws = wb.Sheets['Sheet3'];
const data: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1 });
const headers = data[0];
const rows = data.slice(1);

console.log('--- SAMPLE ROWS ---');
for (let i = 0; i < 15; i++) {
  console.log(`Row ${i+1}:`, JSON.stringify(rows[i]));
}

console.log('\n--- CUSTOMER RATE & BALANCE ANALYSIS ---');
const customerMap = new Map<string, any>();

for (const r of rows) {
  const custName = r[4] ? String(r[4]).trim() : '';
  if (!custName) continue;

  if (!customerMap.has(custName)) {
    customerMap.set(custName, {
      name: custName,
      routes: new Set(),
      salesmen: new Set(),
      rates1L: new Set(),
      rates500ML: new Set(),
      creditAmts: [],
      debitAmts: [],
      totalAmts: [],
      rows: []
    });
  }

  const entry = customerMap.get(custName);
  if (r[1]) entry.routes.add(String(r[1]).trim());
  if (r[2]) entry.salesmen.add(String(r[2]).trim());
  if (r[3] && r[3] !== '-') entry.salesmen.add(String(r[3]).trim());
  if (r[7] !== undefined && r[7] !== null && r[7] !== '') entry.rates1L.add(Number(r[7]));
  if (r[10] !== undefined && r[10] !== null && r[10] !== '') entry.rates500ML.add(Number(r[10]));
  if (r[15] !== undefined) entry.creditAmts.push(Number(r[15]));
  if (r[16] !== undefined) entry.debitAmts.push(Number(r[16]));
  if (r[13] !== undefined) entry.totalAmts.push(Number(r[13]));
  entry.rows.push(r);
}

console.log(`Total Unique Customers: ${customerMap.size}`);

// Print analysis for 10 customers
let count = 0;
for (const [name, c] of customerMap.entries()) {
  if (count++ >= 10) break;
  console.log(`\nCustomer: "${name}"`);
  console.log(`  Routes: ${Array.from(c.routes).join(', ')}`);
  console.log(`  Salesmen: ${Array.from(c.salesmen).join(', ')}`);
  console.log(`  1L Rates: ${Array.from(c.rates1L).join(', ')}`);
  console.log(`  500ML Rates: ${Array.from(c.rates500ML).join(', ')}`);
  console.log(`  Transactions count: ${c.rows.length}`);
  console.log(`  First row date: ${c.rows[0][0]}, Last row date: ${c.rows[c.rows.length - 1][0]}`);
  console.log(`  First row: TotalAmt=${c.rows[0][13]}, CreditAmt=${c.rows[0][15]}, DebitAmt=${c.rows[0][16]}`);
  console.log(`  Last row:  TotalAmt=${c.rows[c.rows.length - 1][13]}, CreditAmt=${c.rows[c.rows.length - 1][15]}, DebitAmt=${c.rows[c.rows.length - 1][16]}`);
}
