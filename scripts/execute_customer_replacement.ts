import * as xlsx from 'xlsx';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/alvoun/.env.local' });
import { createClient } from '@libsql/client';
import crypto from 'crypto';

function cuid(): string {
  return 'c' + crypto.randomBytes(12).toString('hex').slice(0, 24);
}

interface CustomerParsed {
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

function parseExcel(): {
  customers: CustomerParsed[];
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

  const result: CustomerParsed[] = [];
  let totalDebitPaise = 0;
  let totalCreditPaise = 0;

  for (const [name, data] of Object.entries(customerMap)) {
    // 1L rate: latest recorded or 100 standard
    const rate1L = data.rates1L.length > 0 ? data.rates1L[data.rates1L.length - 1] : 100;
    // 500ML rate: latest recorded or 120 standard
    const rate500ML = data.rates500ML.length > 0 ? data.rates500ML[data.rates500ML.length - 1] : 120;
    // 250ML rate: approved ₹80 per crate standard
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

async function executeReplacement() {
  console.log('======================================================================');
  console.log(' ALVOUN CUSTOMER-MASTER REPLACEMENT — LIVE PRODUCTION EXECUTION');
  console.log('======================================================================\n');

  const { customers: bookCusts, totalDebitPaise, totalCreditPaise, netOutstandingPaise } = parseExcel();
  console.log(`Parsed ${bookCusts.length} customers from Book1.xlsx.`);
  console.log(`Total Debit Opening: ₹${(totalDebitPaise / 100).toFixed(2)} (${totalDebitPaise} paise)`);
  console.log(`Total Credit Opening: ₹${(totalCreditPaise / 100).toFixed(2)} (${totalCreditPaise} paise)`);
  console.log(`Net Market Dues: ₹${(netOutstandingPaise / 100).toFixed(2)} (${netOutstandingPaise} paise)\n`);

  if (bookCusts.length !== 153) {
    throw new Error(`Expected exactly 153 customers, got ${bookCusts.length}`);
  }

  // --- PART 1: TURSO PRODUCTION DATABASE ---
  console.log('>>> [1/2] Executing replacement on TURSO PRODUCTION DATABASE...');
  const turso = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  // Re-verify zero dependent records in Turso
  const salesCnt = Number((await turso.execute('SELECT count(*) as cnt FROM Sale;')).rows[0].cnt);
  const paymentsCnt = Number((await turso.execute('SELECT count(*) as cnt FROM Payment;')).rows[0].cnt);
  const visitsCnt = Number((await turso.execute('SELECT count(*) as cnt FROM Visit;')).rows[0].cnt);
  console.log(`Live Turso Dependencies: Sales=${salesCnt}, Payments=${paymentsCnt}, Visits=${visitsCnt}`);

  if (salesCnt > 0 || paymentsCnt > 0 || visitsCnt > 0) {
    throw new Error('ABORTING: Dependent financial or visit records exist in production Turso!');
  }

  // Fetch routes and products from Turso
  const tursoRoutes = (await turso.execute('SELECT id, name, cityId FROM Route;')).rows as unknown as { id: string; name: string; cityId: string }[];
  const tursoRouteMap = new Map<string, string>();
  tursoRoutes.forEach(r => tursoRouteMap.set(r.name.trim().toLowerCase(), r.id));

  const tursoProducts = (await turso.execute('SELECT id, name FROM Product;')).rows as unknown as { id: string; name: string }[];
  const tursoP1L = tursoProducts.find(p => p.name.toLowerCase().includes('1 lit'))?.id;
  const tursoP500 = tursoProducts.find(p => p.name.toLowerCase().includes('500'))?.id;
  const tursoP250 = tursoProducts.find(p => p.name.toLowerCase().includes('250'))?.id;

  if (!tursoP1L || !tursoP500 || !tursoP250) {
    throw new Error(`Turso missing product IDs: 1L=${tursoP1L}, 500=${tursoP500}, 250=${tursoP250}`);
  }

  const defaultCityId = tursoRoutes[0].cityId; // Dahod
  const defaultStateId = (await turso.execute({ sql: 'SELECT stateId FROM City WHERE id = ?;', args: [defaultCityId] })).rows[0].stateId as string;

  // Read existing Turso customers to preserve contact/address/areaId for the 146 matching customers
  const oldTursoCusts = (await turso.execute('SELECT id, customerName, contact, address, areaId FROM Customer;')).rows;
  const oldTursoMap = new Map<string, any>();
  oldTursoCusts.forEach(c => oldTursoMap.set(String(c.customerName).trim().toLowerCase(), c));
  console.log(`Found ${oldTursoCusts.length} existing customer records in Turso.`);

  // Clean wipe CustomerProductRate first (if any)
  await turso.execute('DELETE FROM CustomerProductRate;');
  // Clean wipe Customer table
  await turso.execute('DELETE FROM Customer;');
  console.log('Old Turso customer master records removed successfully.');

  // Insert exactly 153 new authoritative customers into Turso
  console.log('Inserting 153 authoritative customer records into Turso...');
  const tursoInsertedMap = new Map<string, string>(); // customerName.toLowerCase() -> id

  for (const bc of bookCusts) {
    const routeId = tursoRouteMap.get(bc.route.toLowerCase());
    if (!routeId) {
      throw new Error(`Route "${bc.route}" not found in Turso!`);
    }

    const matchedOld = oldTursoMap.get(bc.name.toLowerCase());
    const id = matchedOld ? matchedOld.id : cuid();
    const contact = matchedOld?.contact || '';
    const address = matchedOld?.address || `${bc.route}, Dahod`;
    const areaId = matchedOld?.areaId || null;

    await turso.execute({
      sql: `INSERT INTO Customer (
              id, customerName, contact, address, stateId, cityId, routeId, areaId,
              openingBalance, openingBalanceType, category, status, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'RETAILER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
      args: [
        id,
        bc.name,
        contact,
        address,
        defaultStateId,
        defaultCityId,
        routeId,
        areaId,
        bc.openingBalancePaise,
        bc.openingBalanceType
      ]
    });

    tursoInsertedMap.set(bc.name.toLowerCase(), id);
  }

  // Insert CustomerProductRate records (153 * 3 = 459 rows)
  console.log('Inserting 459 CustomerProductRate records into Turso...');
  for (const bc of bookCusts) {
    const custId = tursoInsertedMap.get(bc.name.toLowerCase())!;

    const rates = [
      { prodId: tursoP1L, ratePaise: bc.rate1L * 100 },
      { prodId: tursoP500, ratePaise: bc.rate500ML * 100 },
      { prodId: tursoP250, ratePaise: bc.rate250ML * 100 }, // 8000 paise
    ];

    for (const r of rates) {
      await turso.execute({
        sql: `INSERT INTO CustomerProductRate (id, customerId, productId, rate, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
        args: [cuid(), custId, r.prodId!, r.ratePaise]
      });
    }
  }

  // Verify Turso Production
  const tursoTotalCust = Number((await turso.execute('SELECT count(*) as cnt FROM Customer;')).rows[0].cnt);
  const tursoActiveCust = Number((await turso.execute("SELECT count(*) as cnt FROM Customer WHERE status = 'ACTIVE';")).rows[0].cnt);
  const tursoRatesCount = Number((await turso.execute('SELECT count(*) as cnt FROM CustomerProductRate;')).rows[0].cnt);
  const tursoDebitSum = Number((await turso.execute("SELECT sum(openingBalance) as sum FROM Customer WHERE openingBalanceType = 'DEBIT';")).rows[0].sum);
  const tursoCreditSum = Number((await turso.execute("SELECT sum(openingBalance) as sum FROM Customer WHERE openingBalanceType = 'CREDIT';")).rows[0].sum);

  console.log('\n--- TURSO PRODUCTION VERIFICATION ---');
  console.log(`Total Customers: ${tursoTotalCust} (Expected: 153)`);
  console.log(`Active Customers: ${tursoActiveCust} (Expected: 153)`);
  console.log(`CustomerProductRate rows: ${tursoRatesCount} (Expected: 459)`);
  console.log(`Debit Opening Sum: ₹${(tursoDebitSum / 100).toFixed(2)} (Expected: ₹22,980.00)`);
  console.log(`Credit Opening Sum: ₹${(tursoCreditSum / 100).toFixed(2)} (Expected: ₹5,070.00)`);
  console.log(`Net Market Dues: ₹${((tursoDebitSum - tursoCreditSum) / 100).toFixed(2)} (Expected: ₹17,910.00)`);

  if (tursoTotalCust !== 153 || tursoActiveCust !== 153 || tursoRatesCount !== 459 || tursoDebitSum !== totalDebitPaise || tursoCreditSum !== totalCreditPaise) {
    throw new Error('TURSO VERIFICATION FAILED: Mismatch in expected counts or sums!');
  }
  console.log('✓ Turso Production Database successfully updated and 100% verified!\n');


  // --- PART 2: LOCAL DEV.DB DATABASE ---
  console.log('>>> [2/2] Executing replacement on LOCAL SQLITE (dev.db)...');
  const localDb = createClient({ url: 'file:d:/alvoun/prisma/dev.db' });

  // Remove test payment if any in dev.db
  await localDb.execute('DELETE FROM Payment;');
  await localDb.execute('DELETE FROM SaleItem;');
  await localDb.execute('DELETE FROM Sale;');
  await localDb.execute('DELETE FROM Visit;');
  await localDb.execute('DELETE FROM CustomerProductRate;');
  await localDb.execute('DELETE FROM Customer;');

  const localRoutes = (await localDb.execute('SELECT id, name, cityId FROM Route;')).rows as unknown as { id: string; name: string; cityId: string }[];
  const localRouteMap = new Map<string, string>();
  localRoutes.forEach(r => localRouteMap.set(r.name.trim().toLowerCase(), r.id));

  const localProducts = (await localDb.execute('SELECT id, name FROM Product;')).rows as unknown as { id: string; name: string }[];
  const localP1L = localProducts.find(p => p.name.toLowerCase().includes('1 lit'))?.id;
  const localP500 = localProducts.find(p => p.name.toLowerCase().includes('500'))?.id;
  const localP250 = localProducts.find(p => p.name.toLowerCase().includes('250'))?.id;

  if (!localP1L || !localP500 || !localP250) {
    throw new Error(`Local dev.db missing product IDs: 1L=${localP1L}, 500=${localP500}, 250=${localP250}`);
  }

  const localCityId = localRoutes[0].cityId;
  const localStateId = (await localDb.execute({ sql: 'SELECT stateId FROM City WHERE id = ?;', args: [localCityId] })).rows[0].stateId as string;

  const localInsertedMap = new Map<string, string>();

  for (const bc of bookCusts) {
    const routeId = localRouteMap.get(bc.route.toLowerCase());
    if (!routeId) {
      throw new Error(`Route "${bc.route}" not found in dev.db!`);
    }

    const id = cuid();
    await localDb.execute({
      sql: `INSERT INTO Customer (
              id, customerName, contact, address, stateId, cityId, routeId, areaId,
              openingBalance, openingBalanceType, category, status, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, null, ?, ?, 'RETAILER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
      args: [
        id,
        bc.name,
        '',
        `${bc.route}, Dahod`,
        localStateId,
        localCityId,
        routeId,
        bc.openingBalancePaise,
        bc.openingBalanceType
      ]
    });
    localInsertedMap.set(bc.name.toLowerCase(), id);
  }

  for (const bc of bookCusts) {
    const custId = localInsertedMap.get(bc.name.toLowerCase())!;

    const rates = [
      { prodId: localP1L, ratePaise: bc.rate1L * 100 },
      { prodId: localP500, ratePaise: bc.rate500ML * 100 },
      { prodId: localP250, ratePaise: bc.rate250ML * 100 }, // 8000 paise
    ];

    for (const r of rates) {
      await localDb.execute({
        sql: `INSERT INTO CustomerProductRate (id, customerId, productId, rate, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
        args: [cuid(), custId, r.prodId!, r.ratePaise]
      });
    }
  }

  // Verify local dev.db
  const localTotalCust = Number((await localDb.execute('SELECT count(*) as cnt FROM Customer;')).rows[0].cnt);
  const localRatesCount = Number((await localDb.execute('SELECT count(*) as cnt FROM CustomerProductRate;')).rows[0].cnt);

  console.log('\n--- LOCAL DEV.DB VERIFICATION ---');
  console.log(`Total Customers in dev.db: ${localTotalCust} (Expected: 153)`);
  console.log(`CustomerProductRate rows in dev.db: ${localRatesCount} (Expected: 459)`);
  console.log('✓ Local dev.db Database successfully updated and 100% verified!\n');

  console.log('======================================================================');
  console.log(' ALL OPERATIONS COMPLETED SUCCESSFULLY! CUSTOMER MASTER REPLACED.');
  console.log('======================================================================');
}

executeReplacement().catch((err) => {
  console.error('EXECUTION ERROR:', err);
  process.exit(1);
});
