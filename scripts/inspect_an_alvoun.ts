import * as xlsx from 'xlsx';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/alvoun/.env.local' });
import { createClient } from '@libsql/client';

async function inspectAnAlvoun() {
  console.log('======================================================================');
  console.log(' INSPECTING "an Alvoun.xlsx"');
  console.log('======================================================================\n');

  const filePath = 'd:/alvoun/an Alvoun.xlsx';
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const wb = xlsx.readFile(filePath);
  console.log('Worksheet names in an Alvoun.xlsx:', wb.SheetNames);

  let totalRowsAcrossSheets = 0;
  const sheetSummaries: any[] = [];

  for (const sName of wb.SheetNames) {
    const ws = wb.Sheets[sName];
    const data: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1 });
    totalRowsAcrossSheets += data.length;
    sheetSummaries.push({
      sheetName: sName,
      rowCount: data.length,
      headers: data[0] || [],
      sampleRow: data[1] || []
    });
  }

  console.log('\nSheet Summaries:');
  for (const s of sheetSummaries) {
    console.log(`\nSheet: "${s.sheetName}" (${s.rowCount} rows)`);
    console.log('Headers:', s.headers);
    console.log('Sample Row 1:', s.sampleRow);
  }

  // Deep inspection across all sheets
  const allCustomers: any[] = [];
  const distinctNames = new Set<string>();

  for (const s of sheetSummaries) {
    const ws = wb.Sheets[s.sheetName];
    const data: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1 });
    const rows = data.slice(1);

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length === 0) continue;
      allCustomers.push({
        sheet: s.sheetName,
        rowIdx: i + 2,
        raw: r
      });
    }
  }

  console.log(`\nTotal customer rows parsed across all sheets: ${allCustomers.length}`);
}

inspectAnAlvoun().catch(console.error);
