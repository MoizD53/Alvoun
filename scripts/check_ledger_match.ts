import * as xlsx from 'xlsx';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/alvoun/.env.local', override: true });
import { createClient } from '@libsql/client';

async function checkCustomerLedgers() {
  const turso = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const dbCusts = (await turso.execute(`
    SELECT c.id, c.customerName, c.openingBalance, c.openingBalanceType, r.name as routeName
    FROM Customer c
    JOIN Route r ON c.routeId = r.id;
  `)).rows as unknown as {
    id: string;
    customerName: string;
    openingBalance: number;
    openingBalanceType: string;
    routeName: string;
  }[];

  const dbMap = new Map<string, { id: string; balance: number; type: string }>();
  for (const c of dbCusts) {
    const key = `${c.customerName.trim().toLowerCase()}|${c.routeName.trim().toLowerCase()}`;
    dbMap.set(key, { id: c.id, balance: c.openingBalance, type: c.openingBalanceType });
  }

  const wb = xlsx.readFile('d:/alvoun/Book1.xlsx');
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = (xlsx.utils.sheet_to_json(ws, { header: 1 }) as any[][]).slice(1);

  const b1Ledger = new Map<string, { sales: number; payments: number }>();
  for (const r of rows) {
    if (!r || !r[4]) continue;
    const name = String(r[4]).trim().toLowerCase();
    const route = String(r[1] || '').trim().toLowerCase();
    const key = `${name}|${route}`;
    const totalAmt = Number(r[13]) || 0;
    const creditAmt = Number(r[15]) || 0;

    const entry = b1Ledger.get(key) || { sales: 0, payments: 0 };
    entry.sales += totalAmt;
    entry.payments += creditAmt;
    b1Ledger.set(key, entry);
  }

  let exactMatches = 0;
  let mismatches = 0;

  for (const [key, b1] of b1Ledger.entries()) {
    const db = dbMap.get(key);
    if (!db) {
      console.log('Missing in DB:', key);
      continue;
    }

    const netBook1InPaise = Math.round((b1.sales - b1.payments) * 100);
    const dbBalanceSigned = db.type === 'DEBIT' ? db.balance : -db.balance;

    if (netBook1InPaise === dbBalanceSigned) {
      exactMatches++;
    } else {
      mismatches++;
      console.log(`Mismatch for ${key}: Book1 Net=${netBook1InPaise} paise (₹${b1.sales - b1.payments}) vs DB Opening=${dbBalanceSigned} paise (₹${dbBalanceSigned / 100})`);
    }
  }

  console.log('Exact Matches between Book1 Net & DB Opening Balance:', exactMatches, 'of', b1Ledger.size);
  console.log('Mismatches:', mismatches);
}

checkCustomerLedgers().catch(console.error);
