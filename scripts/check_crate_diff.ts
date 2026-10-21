import * as xlsx from 'xlsx';

const wb = xlsx.readFile('d:/alvoun/Book1.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = (xlsx.utils.sheet_to_json(ws, { header: 1 }) as any[][]).slice(1);

for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  if (!r || !r[4]) continue;
  const q1 = Number(r[6]) || 0;
  const q5 = Number(r[9]) || 0;
  const totalAmt = Number(r[13]) || 0;
  if (totalAmt === 0 && (q1 > 0 || q5 > 0)) {
    console.log(i + 2, r[4], 'q1:', q1, 'r1:', r[7], 'a1:', r[8], 'q5:', q5, 'r5:', r[10], 'a5:', r[11]);
  }
}
