import * as xlsx from 'xlsx';

const wb = xlsx.readFile('d:/alvoun/Book1.xlsx');
console.log('Sheet names:', wb.SheetNames);
const ws = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(ws, { header: 1 }) as any[][];

console.log('Total rows in sheet (including header):', data.length);
console.log('Header row (index 0):', data[0]);

for (let i = 1; i <= 5; i++) {
  console.log(`Row ${i}:`, data[i]);
}

// Check row types and column distribution
const types = new Set();
const paymentTypes = new Set();
const salesmen = new Set();
const routes = new Set();

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  if (!row || row.length === 0) continue;
  types.add(row[5]);
  paymentTypes.add(row[14]);
  if (row[1]) routes.add(row[1]);
  if (row[2]) salesmen.add(row[2]);
  if (row[3]) salesmen.add(row[3]);
}

console.log('Unique Row Types (col 5):', Array.from(types));
console.log('Unique Payment Types (col 14):', Array.from(paymentTypes));
console.log('Unique Routes (col 1):', Array.from(routes));
console.log('Unique Salesmen (cols 2, 3):', Array.from(salesmen));
