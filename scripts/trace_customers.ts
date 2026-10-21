import * as xlsx from 'xlsx';

const wb = xlsx.readFile('d:/alvoun/Book1.xlsx');
const ws = wb.Sheets['Sheet3'];
const data: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1 });
const rows = data.slice(1);

// Let's trace a few customers completely across all their dates
const targetCustomers = [
  'Bapa Sitaram Tea Stall : 1',
  'Moti Pan Corner',
  'Swad Farsan & Sweets (Pradeepbhai)',
  'Kalpanaben',
  'Hemchand Damor (Alcohol)'
];

for (const target of targetCustomers) {
  console.log(`\n========================================`);
  console.log(`CUSTOMER: ${target}`);
  console.log(`========================================`);
  const custRows = rows.filter(r => r[4] && String(r[4]).trim() === target);
  
  let cumDebit = 0;
  let cumCredit = 0;

  for (const r of custRows) {
    const date = r[0];
    const route = r[1];
    const salesman = `${r[2]} / ${r[3]}`;
    const qty1L = r[6] || 0;
    const rate1L = r[7] || 0;
    const qty500 = r[9] || 0;
    const rate500 = r[10] || 0;
    const totalBag = r[12] || 0;
    const totalAmt = r[13] || 0;
    const payMode = r[14] || '';
    const credit = Number(r[15]) || 0;
    const debit = Number(r[16]) || 0;

    cumDebit += debit;
    cumCredit += credit;
    const netOutstanding = cumDebit - cumCredit;

    console.log(`Date: ${date} | 1L: ${qty1L}@${rate1L} | 500: ${qty500}@${rate500} | Bags: ${totalBag} | TotalAmt: ${totalAmt} | Mode: ${payMode} | Credit: ${credit} | Debit: ${debit} | CumDebit: ${cumDebit} | CumCredit: ${cumCredit} | Net: ${netOutstanding}`);
  }
}
