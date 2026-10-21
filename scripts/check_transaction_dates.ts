import * as xlsx from 'xlsx';

function excelDateToJS(serial: number) {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  return new Date(utc_value * 1000);
}

const wb = xlsx.readFile('d:/alvoun/Book1.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = (xlsx.utils.sheet_to_json(ws, { header: 1 }) as any[][]).slice(1);

console.log('Total transaction rows in Book1.xlsx:', rows.length);

const dates = rows.map(r => r[0]).filter(Boolean);
const minDate = Math.min(...dates);
const maxDate = Math.max(...dates);

console.log('Min date serial:', minDate, '->', excelDateToJS(minDate).toISOString().slice(0, 10));
console.log('Max date serial:', maxDate, '->', excelDateToJS(maxDate).toISOString().slice(0, 10));

let totalSalesVal = 0;
let totalCashVal = 0;
let totalDebitVal = 0;

for (const r of rows) {
  const totalAmt = Number(r[13]) || 0;
  const cashAmt = Number(r[15]) || 0;
  const debitAmt = Number(r[16]) || 0;
  totalSalesVal += totalAmt;
  totalCashVal += cashAmt;
  totalDebitVal += debitAmt;
}

console.log('Total Sales Amount in Book1:', totalSalesVal);
console.log('Total Cash (Collected) in Book1:', totalCashVal);
console.log('Total Debit in Book1:', totalDebitVal);
