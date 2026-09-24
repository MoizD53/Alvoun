import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function run() {
  console.log('--- STARTING FINAL IMPORT & AUDIT V2 ---');

  const csvPath = path.join(__dirname, 'ALVOUN_FINAL_CUSTOMERS.csv');
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.trim().split('\n');
  const csvRows = lines.slice(1).map((line, idx) => {
    const [customerName, routeName, areaName, contact] = line.split(',');
    return { 
      customerName: customerName?.trim() || '', 
      routeName: routeName?.trim() || '', 
      areaName: areaName?.trim() || '', 
      contact: contact?.trim() || '0',
      rowNum: idx + 2,
      matched: false
    };
  });

  const existingCustomers = await prisma.customer.findMany({
    include: { route: true, area: { include: { route: true } } }
  });

  const dbCustomers = existingCustomers.map(c => ({
    ...c,
    matched: false
  }));

  let defaultState = await prisma.state.findFirst();
  let defaultCity = await prisma.city.findFirst();
  
  if (!defaultState || !defaultCity) throw new Error('Missing State/City defaults');

  // Ensure all Routes & Areas exist based on CSV
  const routesCache = new Map();
  const areasCache = new Map();

  for (const row of csvRows) {
    let routeId = routesCache.get(row.routeName);
    if (!routeId) {
      let r = await prisma.route.findFirst({ where: { name: row.routeName } });
      if (!r) {
        r = await prisma.route.create({ data: { name: row.routeName, cityId: defaultCity.id, isActive: true } });
      }
      routeId = r.id;
      routesCache.set(row.routeName, routeId);
    }

    const areaKey = `${routeId}_${row.areaName}`;
    let areaId = areasCache.get(areaKey);
    if (!areaId) {
      let a = await prisma.area.findFirst({ where: { name: row.areaName, routeId } });
      if (!a) {
        a = await prisma.area.create({ data: { name: row.areaName, routeId } });
      }
      areaId = a.id;
      areasCache.set(areaKey, areaId);
    }
  }

  // Match 1: Perfect match by Name AND Route AND Area
  for (const row of csvRows) {
    const routeId = routesCache.get(row.routeName);
    const areaId = areasCache.get(`${routeId}_${row.areaName}`);
    
    const perfectMatch = dbCustomers.find(c => 
      !c.matched && 
      c.customerName.toLowerCase() === row.customerName.toLowerCase() &&
      c.routeId === routeId &&
      c.areaId === areaId
    );

    if (perfectMatch) {
      perfectMatch.matched = true;
      row.matched = true;
    }
  }

  // Match 2: Match by Name only
  let reassignedCount = 0;
  for (const row of csvRows) {
    if (row.matched) continue;

    const nameMatch = dbCustomers.find(c => 
      !c.matched && 
      c.customerName.toLowerCase() === row.customerName.toLowerCase()
    );

    if (nameMatch) {
      nameMatch.matched = true;
      row.matched = true;

      const routeId = routesCache.get(row.routeName);
      const areaId = areasCache.get(`${routeId}_${row.areaName}`);

      await prisma.customer.update({
        where: { id: nameMatch.id },
        data: { routeId, areaId, contact: row.contact }
      });
      reassignedCount++;
    }
  }

  // Handle remaining unmapped CSV rows
  let createdCount = 0;
  for (const row of csvRows) {
    if (row.matched) continue;
    
    const routeId = routesCache.get(row.routeName);
    const areaId = areasCache.get(`${routeId}_${row.areaName}`);

    await prisma.customer.create({
      data: {
        customerName: row.customerName,
        contact: row.contact,
        address: 'N/A',
        stateId: defaultState.id,
        cityId: defaultCity.id,
        routeId,
        areaId,
        openingBalance: 0,
        openingBalanceType: 'DEBIT',
        status: 'ACTIVE'
      }
    });
    createdCount++;
  }

  const unmappedDB = dbCustomers.filter(c => !c.matched);

  console.log('--- FINAL REPORT ---');
  console.log(`CSV Records: ${csvRows.length}`);
  console.log(`DB Customers perfectly mapped: ${csvRows.filter(r => r.matched).length - reassignedCount}`);
  console.log(`DB Customers reassigned (fixed): ${reassignedCount}`);
  console.log(`New Customers created: ${createdCount}`);
  console.log(`DB Customers left unmapped/orphaned: ${unmappedDB.length}`);
  
  if (unmappedDB.length > 0) {
    console.log('Unmapped DB Customers:', unmappedDB.map(c => c.customerName));
  }

  // Validate Final Route Totals
  console.log('\n--- POST-IMPORT VALIDATION ---');
  const finalTotals = await prisma.customer.groupBy({
    by: ['routeId'],
    _count: { _all: true }
  });

  let totalAfter = 0;
  for (const t of finalTotals) {
    if (t.routeId) {
      const r = await prisma.route.findUnique({ where: { id: t.routeId } });
      console.log(`Route "${r?.name}": ${t._count._all} customers`);
      totalAfter += t._count._all;
    }
  }
  console.log(`Total active assigned customers in DB: ${totalAfter}`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
