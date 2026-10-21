import * as xlsx from 'xlsx';

const wb = xlsx.readFile('d:/alvoun/Book1.xlsx');
const ws = wb.Sheets['Sheet3'];
const data: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1 });
const rows = data.slice(1);

console.log('Searching for any balance / opening keywords...');
for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  const rowStr = JSON.stringify(r).toLowerCase();
  if (rowStr.includes('open') || rowStr.includes('bal') || rowStr.includes('b/f') || rowStr.includes('c/f') || rowStr.includes('due') || rowStr.includes('udhar')) {
    console.log(`Row ${i+1}:`, r);
  }
}

// Let's calculate the Net Outstanding for all 153 customers
const customerSummary: Record<string, {
  name: string;
  route: string;
  salesman: string;
  rate1L: number;
  rate500ML: number;
  totalDebit: number;
  totalCredit: number;
  netOutstanding: number;
  txCount: number;
}> = {};

for (const r of rows) {
  const name = r[4] ? String(r[4]).trim() : '';
  if (!name) continue;

  if (!customerSummary[name]) {
    customerSummary[name] = {
      name,
      route: r[1] ? String(r[1]).trim() : '',
      salesman: r[2] ? String(r[2]).trim() : '',
      rate1L: Number(r[7]) || 0,
      rate500ML: Number(r[10]) || 0,
      totalDebit: 0,
      totalCredit: 0,
      netOutstanding: 0,
      txCount: 0,
    };
  }

  const s = customerSummary[name];
  if (r[7] && !s.rate1L) s.rate1L = Number(r[7]);
  if (r[10] && !s.rate500ML) s.rate500ML = Number(r[10]);
  if (r[1]) s.route = String(r[1]).trim();
  if (r[2]) s.salesman = String(r[2]).trim();

  const credit = Number(r[15]) || 0;
  const debit = Number(r[16]) || 0;

  s.totalDebit += debit;
  s.totalCredit += credit;
  s.netOutstanding = s.totalDebit - s.totalCredit;
  s.txCount++;
}

const list = Object.values(customerSummary);
console.log('\n--- CUSTOMER BALANCE SUMMARY ---');
console.log(`Total customers: ${list.length}`);
const withOutstanding = list.filter(c => c.netOutstanding !== 0);
console.log(`Customers with non-zero net outstanding: ${withOutstanding.length}`);
console.log(`Customers with zero balance: ${list.filter(c => c.netOutstanding === 0).length}`);
console.log(`Total net outstanding across all customers: Rs. ${list.reduce((sum, c) => sum + c.netOutstanding, 0)}`);

console.log('\nSample 15 customers with non-zero outstanding:');
console.table(withOutstanding.slice(0, 15).map(c => ({
  name: c.name,
  route: c.route,
  salesman: c.salesman,
  rate1L: c.rate1L,
  rate500ML: c.rate500ML,
  totalDebit: c.totalDebit,
  totalCredit: c.totalCredit,
  netOutstanding: c.netOutstanding
})));
