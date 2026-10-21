import * as xlsx from 'xlsx';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/alvoun/.env.local', override: true });
import { createClient } from '@libsql/client';

async function matchCustomers() {
  const turso = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const dbCusts = (await turso.execute(`
    SELECT c.id, c.customerName, c.openingBalance, c.openingBalanceType, r.name as routeName, a.name as areaName
    FROM Customer c
    JOIN Route r ON c.routeId = r.id
    LEFT JOIN Area a ON c.areaId = a.id;
  `)).rows as unknown as {
    id: string;
    customerName: string;
    openingBalance: number;
    openingBalanceType: string;
    routeName: string;
    areaName: string | null;
  }[];

  console.log('Live Turso Customers:', dbCusts.length);

  const wb = xlsx.readFile('d:/alvoun/Book1.xlsx');
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = (xlsx.utils.sheet_to_json(ws, { header: 1 }) as any[][]).slice(1);

  // Group Book1 rows by customer name and route
  const book1CustMap = new Map<string, {
    name: string;
    route: string;
    rowCount: number;
    totalSales: number;
    totalCredit: number;
  }>();

  for (const r of rows) {
    if (!r || !r[4]) continue;
    const name = String(r[4]).trim();
    const route = String(r[1] || '').trim();
    const totalAmt = Number(r[13]) || 0;
    const creditAmt = Number(r[15]) || 0;

    const key = `${name.toLowerCase()}|${route.toLowerCase()}`;
    const existing = book1CustMap.get(key) || {
      name,
      route,
      rowCount: 0,
      totalSales: 0,
      totalCredit: 0
    };
    existing.rowCount++;
    existing.totalSales += totalAmt;
    existing.totalCredit += creditAmt;
    book1CustMap.set(key, existing);
  }

  console.log('Unique Customer+Route keys in Book1:', book1CustMap.size);

  // Match against DB
  let matchedCount = 0;
  const unmatched: any[] = [];
  const customerMatches = new Map<string, string>(); // key -> dbId

  for (const [key, b1] of book1CustMap.entries()) {
    // 1. Exact match by name + route
    let match = dbCusts.find(
      c => c.customerName.trim().toLowerCase() === b1.name.toLowerCase() &&
           c.routeName.trim().toLowerCase() === b1.route.toLowerCase()
    );

    // 2. If not found, try name match
    if (!match) {
      const nameMatches = dbCusts.filter(
        c => c.customerName.trim().toLowerCase() === b1.name.toLowerCase()
      );
      if (nameMatches.length === 1) {
        match = nameMatches[0];
      }
    }

    if (match) {
      matchedCount++;
      customerMatches.set(key, match.id);
    } else {
      unmatched.push(b1);
    }
  }

  console.log('Matched Customer Keys:', matchedCount, 'of', book1CustMap.size);
  if (unmatched.length > 0) {
    console.log('UNMATCHED:', unmatched);
  } else {
    console.log('100% of Book1 customers matched to live database!');
  }

  // Check matching of all 988 individual transaction rows
  let unmappedRows = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[4]) continue;
    const name = String(r[4]).trim();
    const route = String(r[1] || '').trim();
    const key = `${name.toLowerCase()}|${route.toLowerCase()}`;
    if (!customerMatches.has(key)) {
      unmappedRows++;
      console.log(`Row ${i + 2} unmapped: "${name}" on "${route}"`);
    }
  }
  console.log('Unmapped individual transaction rows:', unmappedRows, 'of', rows.length);
}

matchCustomers().catch(console.error);
