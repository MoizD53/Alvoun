import * as xlsx from 'xlsx';

const wb = xlsx.readFile('d:/alvoun/Book1.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = (xlsx.utils.sheet_to_json(ws, { header: 1 }) as any[][]).slice(1);

let sumTotalAmt = 0;
let sumCreditAmt = 0;
let sumDebitAmt = 0;
let sum1LAmt = 0;
let sum500Amt = 0;
let sum1LQty = 0;
let sum500Qty = 0;

let mismatchTotalAmtCount = 0;
let purePaymentRows = 0; // TotalAmt == 0, CreditAmt > 0
let pureCreditSaleRows = 0; // TotalAmt > 0, CreditAmt == 0
let cashSaleRows = 0; // TotalAmt > 0, CreditAmt > 0
let partialPaymentRows = 0; // TotalAmt > 0, CreditAmt > 0, TotalAmt != CreditAmt

for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  if (!r || r.length === 0) continue;

  const q1 = Number(r[6]) || 0;
  const r1 = Number(r[7]) || 0;
  const a1 = Number(r[8]) || 0;

  const q5 = Number(r[9]) || 0;
  const r5 = Number(r[10]) || 0;
  const a5 = Number(r[11]) || 0;

  const totalBags = Number(r[12]) || 0;
  const totalAmt = Number(r[13]) || 0;
  const payMode = String(r[14] || '').trim();
  const creditAmt = Number(r[15]) || 0;
  const debitAmt = Number(r[16]) || 0;

  sum1LQty += q1;
  sum500Qty += q5;
  sum1LAmt += a1;
  sum500Amt += a5;
  sumTotalAmt += totalAmt;
  sumCreditAmt += creditAmt;
  sumDebitAmt += debitAmt;

  if (a1 + a5 !== totalAmt) {
    mismatchTotalAmtCount++;
    console.log(`Row ${i + 2} mismatch: a1(${a1}) + a5(${a5}) = ${a1 + a5} vs totalAmt(${totalAmt})`);
  }

  if (totalAmt === 0 && creditAmt > 0) {
    purePaymentRows++;
  } else if (totalAmt > 0 && creditAmt === 0) {
    pureCreditSaleRows++;
  } else if (totalAmt > 0 && creditAmt === totalAmt) {
    cashSaleRows++;
  } else if (totalAmt > 0 && creditAmt > 0 && creditAmt !== totalAmt) {
    partialPaymentRows++;
    console.log(`Row ${i + 2} partial: totalAmt=${totalAmt}, creditAmt=${creditAmt}, mode=${payMode}, cust=${r[4]}`);
  }
}

console.log('--- RECONCILIATION TOTALS ---');
console.log('Total Rows:', rows.length);
console.log('Total 1L Qty (Crates):', sum1LQty);
console.log('Total 1L Amount:', sum1LAmt);
console.log('Total 500ml Qty (Crates):', sum500Qty);
console.log('Total 500ml Amount:', sum500Amt);
console.log('Sum(1L Amt + 500ml Amt):', sum1LAmt + sum500Amt);
console.log('Sum(Total Amt / Gross Sales):', sumTotalAmt);
console.log('Sum(Credit Amt / Collections Received):', sumCreditAmt);
console.log('Sum(Debit Amt):', sumDebitAmt);
console.log('Net Difference (Gross Sales - Collections):', sumTotalAmt - sumCreditAmt);
console.log('Mismatch TotalAmt vs (1L + 500ml):', mismatchTotalAmtCount);

console.log('--- ROW CLASSIFICATION ---');
console.log('Pure Payment Rows (No sale, collection only):', purePaymentRows);
console.log('Pure Credit Sale Rows (Sale, 0 payment):', pureCreditSaleRows);
console.log('Full Cash/UPI Sale Rows (Sale amount == payment amount):', cashSaleRows);
console.log('Partial Payment Rows (Sale made, different payment amount):', partialPaymentRows);
