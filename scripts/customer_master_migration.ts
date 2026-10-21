import * as xlsx from 'xlsx';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/alvoun/.env.local' });
import { createClient } from '@libsql/client';
import crypto from 'crypto';

interface ParsedCustomer {
  name: string;
  route: string;
  rate1L: number;
  rate500ML: number;
  rate250ML: number;
  totalDebit: number;
  totalCredit: number;
  netOutstanding: number;
  openingBalancePaise: number;
  openingBalanceType: 'DEBIT' | 'CREDIT';
}

function cuid(): string {
  return 'c' + crypto.randomBytes(12).toString('hex').slice(0, 24);
}

export function parseBook1(): {
  customers: ParsedCustomer[];
  totalDebitPaise: number;
  totalCreditPaise: number;
  netOutstandingPaise: number;
} {
  const wb = xlsx.readFile('d:/alvoun/Book1.xlsx');
  const ws = wb.Sheets['Sheet3'];
  const rawRows: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const rows = rawRows.slice(1);

  const customerMap: Record<string, {
    name: string;
    route: string;
    totalDebit: number;
    totalCredit: number;
    rates1L: number[];
    rates500ML: number[];
  }> = {};

  for (const r of rows) {
    const rawName = r[4];
    if (!rawName) continue;
    const name = String(rawName).trim();
    if (!name) continue;

    const route = r[1] ? String(r[1]).trim() : '';
    const r1L = Number(r[7]) || 0;
    const r500 = Number(r[10]) || 0;
    const credit = Number(r[15]) || 0;
    const debit = Number(r[16]) || 0;

    if (!customerMap[name]) {
      customerMap[name] = {
        name,
        route,
        totalDebit: 0,
        totalCredit: 0,
        rates1L: [],
        rates500ML: [],
      };
    }

    const c = customerMap[name];
    if (route) c.route = route;
    if (r1L > 0) c.rates1L.push(r1L);
    if (r500 > 0) c.rates500ML.push(r500);
    c.totalDebit += debit;
    c.totalCredit += credit;
  }

  const result: ParsedCustomer[] = [];
  let totalDebitPaise = 0;
  let totalCreditPaise = 0;

  for (const [name, data] of Object.entries(customerMap)) {
    // Determine 1L rate: use latest seen, or 100 standard
    const rate1L = data.rates1L.length > 0 ? data.rates1L[data.rates1L.length - 1] : 100;
    // Determine 500ML rate: use latest seen, or 120 standard
    const rate500ML = data.rates500ML.length > 0 ? data.rates500ML[data.rates500ML.length - 1] : 120;
    // 250ML rate: standard 80
    const rate250ML = 80;

    const net = data.totalDebit - data.totalCredit;
    const isDebit = net >= 0;
    const absPaise = Math.round(Math.abs(net) * 100);

    if (isDebit) {
      totalDebitPaise += absPaise;
    } else {
      totalCreditPaise += absPaise;
    }

    result.push({
      name,
      route: data.route,
      rate1L,
      rate500ML,
      rate250ML,
      totalDebit: data.totalDebit,
      totalCredit: data.totalCredit,
      netOutstanding: net,
      openingBalancePaise: absPaise,
      openingBalanceType: isDebit ? 'DEBIT' : 'CREDIT',
    });
  }

  return {
    customers: result,
    totalDebitPaise,
    totalCreditPaise,
    netOutstandingPaise: totalDebitPaise - totalCreditPaise,
  };
}

async function run() {
  const isDryRun = !process.argv.includes('--execute');
  console.log(`\n======================================================`);
  console.log(` ALVOUN CUSTOMER-MASTER REPLACEMENT (${isDryRun ? 'DRY-RUN PREVIEW' : '*** LIVE PRODUCTION EXECUTION ***'})`);
  console.log(`======================================================\n`);

  const { customers: bookCusts, totalDebitPaise, totalCreditPaise, netOutstandingPaise } = parseBook1();
  console.log(`Parsed ${bookCusts.length} customers from Book1.xlsx.`);
  console.log(`Total Debit Opening: ₹${(totalDebitPaise / 100).toFixed(2)}`);
  console.log(`Total Credit Opening: ₹${(totalCreditPaise / 100).toFixed(2)}`);
  console.log(`Net Market Dues: ₹${(netOutstandingPaise / 100).toFixed(2)}\n`);

  const turso = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  // 1. Fetch DB Routes
  const dbRoutesRes = await turso.execute('SELECT id, name, cityId FROM Route;');
  const dbRoutes = dbRoutesRes.rows as unknown as { id: string; name: string; cityId: string }[];
  const routeMap = new Map<string, string>();
  for (const r of dbRoutes) {
    routeMap.set(r.name.trim().toLowerCase(), r.id);
  }

  // 2. Fetch DB Products
  const dbProductsRes = await turso.execute('SELECT id, name, bottlesPerCrate FROM Product;');
  const dbProducts = dbProductsRes.rows as unknown as { id: string; name: string; bottlesPerCrate: number }[];
  const p1L = dbProducts.find(p => p.name.toLowerCase().includes('1 lit'))?.id;
  const p500 = dbProducts.find(p => p.name.toLowerCase().includes('500'))?.id;
  const p250 = dbProducts.find(p => p.name.toLowerCase().includes('250'))?.id;

  if (!p1L || !p500 || !p250) {
    throw new Error(`Missing product IDs! 1L: ${p1L}, 500ml: ${p500}, 250ml: ${p250}`);
  }

  // 3. Fetch Existing Customers
  const dbCustRes = await turso.execute('SELECT id, customerName, routeId, areaId, stateId, cityId, status, openingBalance, openingBalanceType FROM Customer;');
  const existingCusts = dbCustRes.rows;
  console.log(`Existing DB customers count: ${existingCusts.length}`);

  const existingMap = new Map<string, any>();
  for (const c of existingCusts) {
    existingMap.set(String(c.customerName).trim().toLowerCase(), c);
  }

  const toDeactivate: any[] = [];
  const toUpdate: { parsed: ParsedCustomer; dbRecord: any; targetRouteId: string }[] = [];
  const toInsert: { parsed: ParsedCustomer; targetRouteId: string }[] = [];

  const matchedDbIds = new Set<string>();

  for (const bc of bookCusts) {
    const routeId = routeMap.get(bc.route.toLowerCase());
    if (!routeId) {
      throw new Error(`Route "${bc.route}" not found in DB for customer "${bc.name}"!`);
    }

    const match = existingMap.get(bc.name.toLowerCase());
    if (match) {
      toUpdate.push({ parsed: bc, dbRecord: match, targetRouteId: routeId });
      matchedDbIds.add(String(match.id));
    } else {
      toInsert.push({ parsed: bc, targetRouteId: routeId });
    }
  }

  for (const ec of existingCusts) {
    if (!matchedDbIds.has(String(ec.id))) {
      toDeactivate.push(ec);
    }
  }

  console.log('\n--- MIGRATION BREAKDOWN ---');
  console.log(`Total Customers in Book1.xlsx: ${bookCusts.length}`);
  console.log(`To Deactivate (Old customers not in sheet): ${toDeactivate.length}`);
  console.log(`To Reactivate / Update (Existing in DB): ${toUpdate.length}`);
  console.log(`To Insert (Brand new customers from sheet): ${toInsert.length}`);
  console.log(`Total Active Customers After Migration: ${toUpdate.length + toInsert.length} (Expected: ${bookCusts.length})`);
  console.log(`Total Inactive / Archived Records Preserved: ${toDeactivate.length}`);
  console.log(`Total Customer Product Rate rows to upsert: ${bookCusts.length * 3} (1L, 500ml, 250ml)`);

  if (isDryRun) {
    console.log(`\n[DRY-RUN] No changes were made to the database.`);
    console.log(`To execute this migration against live production, run with --execute.`);
    return;
  }

  console.log(`\nExecuting LIVE migration on Turso...`);

  // 1. Deactivate old customers
  console.log(`1. Deactivating ${toDeactivate.length} old customers...`);
  const deactIds = toDeactivate.map(c => `'${c.id}'`).join(',');
  if (toDeactivate.length > 0) {
    await turso.execute(`UPDATE Customer SET status = 'INACTIVE', updatedAt = CURRENT_TIMESTAMP WHERE id IN (${deactIds});`);
  }

  // 2. Update matched customers
  console.log(`2. Updating ${toUpdate.length} matched customers with new opening balance, route, and status...`);
  for (const u of toUpdate) {
    await turso.execute({
      sql: `UPDATE Customer SET 
              routeId = ?, 
              openingBalance = ?, 
              openingBalanceType = ?, 
              status = 'ACTIVE', 
              updatedAt = CURRENT_TIMESTAMP 
            WHERE id = ?;`,
      args: [u.targetRouteId, u.parsed.openingBalancePaise, u.parsed.openingBalanceType, u.dbRecord.id]
    });
  }

  // 3. Insert new customers
  console.log(`3. Inserting ${toInsert.length} brand new customers...`);
  const defaultCityId = dbRoutes[0].cityId; // Dahod
  const defaultStateId = (await turso.execute({ sql: 'SELECT stateId FROM City WHERE id = ?;', args: [defaultCityId] })).rows[0].stateId as string;

  const insertedRecords: { id: string; name: string }[] = [];
  for (const ins of toInsert) {
    const newId = cuid();
    await turso.execute({
      sql: `INSERT INTO Customer (
              id, customerName, contact, address, stateId, cityId, routeId, 
              openingBalance, openingBalanceType, category, status, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'RETAILER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
      args: [
        newId,
        ins.parsed.name,
        '',
        `${ins.parsed.route}, Dahod`,
        defaultStateId,
        defaultCityId,
        ins.targetRouteId,
        ins.parsed.openingBalancePaise,
        ins.parsed.openingBalanceType
      ]
    });
    insertedRecords.push({ id: newId, name: ins.parsed.name });
  }

  // 4. Upsert CustomerProductRates for all 153 customers
  console.log(`4. Upserting customer rates for 1L, 500ml, 250ml...`);
  // Build a map of customerName -> customerId for all 153 active customers
  const activeCustMap = new Map<string, string>();
  for (const u of toUpdate) {
    activeCustMap.set(u.parsed.name.toLowerCase(), u.dbRecord.id);
  }
  for (const ins of insertedRecords) {
    activeCustMap.set(ins.name.toLowerCase(), ins.id);
  }

  let rateUpsertCount = 0;
  for (const bc of bookCusts) {
    const custId = activeCustMap.get(bc.name.toLowerCase());
    if (!custId) continue;

    const rates = [
      { prodId: p1L, ratePaise: bc.rate1L * 100 },
      { prodId: p500, ratePaise: bc.rate500ML * 100 },
      { prodId: p250, ratePaise: bc.rate250ML * 100 },
    ];

    for (const r of rates) {
      const existingRate = await turso.execute({
        sql: 'SELECT id FROM CustomerProductRate WHERE customerId = ? AND productId = ?;',
        args: [custId, r.prodId]
      });

      if (existingRate.rows.length > 0) {
        await turso.execute({
          sql: 'UPDATE CustomerProductRate SET rate = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?;',
          args: [r.ratePaise, existingRate.rows[0].id]
        });
      } else {
        await turso.execute({
          sql: 'INSERT INTO CustomerProductRate (id, customerId, productId, rate, createdAt, updatedAt) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);',
          args: [cuid(), custId, r.prodId, r.ratePaise]
        });
      }
      rateUpsertCount++;
    }
  }

  console.log(`Successfully upserted ${rateUpsertCount} product rate records.`);

  // Verification queries
  const finalActiveRes = await turso.execute("SELECT count(*) as cnt FROM Customer WHERE status = 'ACTIVE';");
  const finalInactiveRes = await turso.execute("SELECT count(*) as cnt FROM Customer WHERE status = 'INACTIVE';");
  const finalRatesRes = await turso.execute("SELECT count(*) as cnt FROM CustomerProductRate;");
  const finalDebitRes = await turso.execute("SELECT sum(openingBalance) as sum FROM Customer WHERE status = 'ACTIVE' AND openingBalanceType = 'DEBIT';");
  const finalCreditRes = await turso.execute("SELECT sum(openingBalance) as sum FROM Customer WHERE status = 'ACTIVE' AND openingBalanceType = 'CREDIT';");

  console.log('\n======================================================');
  console.log(' POST-MIGRATION VERIFICATION (TURSO PRODUCTION)');
  console.log('======================================================');
  console.log(`Active Customers: ${finalActiveRes.rows[0].cnt} (Expected: 153)`);
  console.log(`Inactive/Archived Customers: ${finalInactiveRes.rows[0].cnt} (Expected: 174)`);
  console.log(`Total CustomerProductRates: ${finalRatesRes.rows[0].cnt} (Expected: 459)`);
  console.log(`Total Debit Opening: ₹${((Number(finalDebitRes.rows[0].sum) || 0) / 100).toFixed(2)}`);
  console.log(`Total Credit Opening: ₹${((Number(finalCreditRes.rows[0].sum) || 0) / 100).toFixed(2)}`);
  console.log(`Net Market Dues: ₹${(((Number(finalDebitRes.rows[0].sum) || 0) - (Number(finalCreditRes.rows[0].sum) || 0)) / 100).toFixed(2)}`);
  console.log('======================================================\n');
}

run().catch(console.error);
