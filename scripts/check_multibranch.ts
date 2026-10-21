import * as xlsx from 'xlsx';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/alvoun/.env.local', override: true });
import { createClient } from '@libsql/client';

async function checkMatches() {
  const turso = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const liveCusts = (await turso.execute(`
    SELECT c.id, c.customerName, c.contact, c.address, c.routeId, c.areaId, 
           c.openingBalance, c.openingBalanceType, r.name as routeName, a.name as areaName
    FROM Customer c
    JOIN Route r ON c.routeId = r.id
    LEFT JOIN Area a ON c.areaId = a.id;
  `)).rows;

  console.log(`Live Turso customers: ${liveCusts.length}`);

  const wb = xlsx.readFile('d:/alvoun/an Alvoun.xlsx');
  const ws = wb.Sheets['Account'];
  const rows = (xlsx.utils.sheet_to_json(ws, { header: 1 }) as any[][]).slice(1);

  // Check the 4 multi-branch customers in live Turso
  const multiNames = ['zupda hotel', 'mahadev rajwadi tea', 'jay ambe rajwadi', 'kesar rajwadi tea'];
  for (const mn of multiNames) {
    const liveMatches = liveCusts.filter(c => String(c.customerName).toLowerCase() === mn);
    console.log(`\nLive records for "${mn}":`, liveMatches.map(c => ({
      id: c.id,
      name: c.customerName,
      route: c.routeName,
      area: c.areaName,
      balance: c.openingBalance,
      type: c.openingBalanceType
    })));

    const sheetMatches = rows.filter(r => r[0] && String(r[0]).trim().toLowerCase() === mn);
    console.log(`Sheet rows for "${mn}":`, sheetMatches.map((r, idx) => ({
      sheetRow: idx + 1,
      name: r[0],
      route: r[1],
      area: r[2],
      contact: r[3],
      r1L: r[4],
      r500: r[5]
    })));
  }
}

checkMatches().catch(console.error);
