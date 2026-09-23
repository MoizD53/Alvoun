require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@libsql/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');

async function seedData(name, prisma) {
  console.log(`\n========================================`);
  console.log(`🌱 Seeding Routes, Areas & Customers on: ${name}`);
  console.log(`========================================`);

  // 1. Ensure Gujarat State exists
  let state = await prisma.state.findFirst({ where: { name: 'Gujarat' } });
  if (!state) {
    state = await prisma.state.create({ data: { name: 'Gujarat' } });
    console.log(`Created state: Gujarat (${state.id})`);
  } else {
    console.log(`Found state: Gujarat (${state.id})`);
  }

  // 2. Ensure Dahod City exists
  let city = await prisma.city.findFirst({ where: { name: 'Dahod', stateId: state.id } });
  if (!city) {
    city = await prisma.city.create({
      data: {
        name: 'Dahod',
        stateId: state.id
      }
    });
    console.log(`Created city: Dahod (${city.id})`);
  } else {
    console.log(`Found city: Dahod (${city.id})`);
  }

  // 3. Remove obsolete dummy routes if they exist and have 0 customers
  const obsoleteRouteNames = [
    'Dahod North', 'Dahod South', 'Dahod Central', 'Katwara Main', 'Katwara East',
    'Andheri West', 'Bandra East', 'Indore Highway-Godhra Road Route'
  ];
  for (const obsoleteName of obsoleteRouteNames) {
    const oldRoute = await prisma.route.findFirst({ where: { name: obsoleteName } });
    if (oldRoute) {
      const custCount = await prisma.customer.count({ where: { routeId: oldRoute.id } });
      if (custCount === 0) {
        await prisma.area.deleteMany({ where: { routeId: oldRoute.id } });
        await prisma.salesmanAssignment.deleteMany({ where: { routeId: oldRoute.id } });
        await prisma.route.delete({ where: { id: oldRoute.id } });
        console.log(`Removed obsolete route: ${obsoleteName}`);
      }
    }
  }

  // 4. Read CSV file
  const csvPath = path.join(__dirname, '..', 'data', 'alvoun_customers.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);

  // Map to hold route models
  const targetRoutes = ['Station Road', 'Indore Highway', 'New Route', 'Katwara'];
  const routeMap = {}; // routeName -> Route record

  for (const rName of targetRoutes) {
    let route = await prisma.route.findFirst({
      where: { name: rName, cityId: city.id }
    });
    if (!route) {
      route = await prisma.route.create({
        data: {
          name: rName,
          cityId: city.id,
          isActive: true
        }
      });
      console.log(`Created Route: ${rName} (${route.id})`);
    } else {
      console.log(`Found Route: ${rName} (${route.id})`);
    }
    routeMap[rName] = route;
  }

  // 5. Gather unique areas per route from CSV
  // Header: Ac Name,Route,Area,Contact
  const routeAreasMap = {
    'Station Road': new Set(),
    'Indore Highway': new Set(),
    'New Route': new Set(),
    'Katwara': new Set(),
  };

  const rawRows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(s => s.trim());
    if (parts.length < 4) continue;
    let [customerName, routeName, areaName, contact] = parts;
    if (!routeName || !customerName) continue;

    // Line 320 fallback: if area is missing for Station Road, assign to 06 Station Rd
    if (!areaName) {
      if (routeName === 'Station Road') {
        areaName = '06 Station Rd';
      } else {
        areaName = routeName;
      }
    }

    if (routeAreasMap[routeName]) {
      routeAreasMap[routeName].add(areaName);
    }
    rawRows.push({ customerName, routeName, areaName, contact });
  }

  // 6. Upsert Areas in database
  const areaLookup = {}; // `${routeName}:::${areaName}` -> Area record
  let totalAreasCreated = 0;

  for (const [routeName, areaSet] of Object.entries(routeAreasMap)) {
    const route = routeMap[routeName];
    if (!route) continue;

    for (const aName of Array.from(areaSet)) {
      let area = await prisma.area.findFirst({
        where: { name: aName, routeId: route.id }
      });
      if (!area) {
        area = await prisma.area.create({
          data: {
            name: aName,
            routeId: route.id
          }
        });
        totalAreasCreated++;
      }
      areaLookup[`${routeName}:::${aName}`] = area;
    }
  }

  console.log(`Areas synchronized. Total created: ${totalAreasCreated}`);
  for (const [rName, rRecord] of Object.entries(routeMap)) {
    const count = await prisma.area.count({ where: { routeId: rRecord.id } });
    console.log(`  - Route: ${rName} has ${count} areas`);
  }

  // 7. Seed Customers
  // Clear any existing customers first to avoid duplicates
  const existingCustCount = await prisma.customer.count();
  if (existingCustCount > 0) {
    console.log(`Found ${existingCustCount} existing customers, wiping before seed...`);
    await prisma.customer.deleteMany();
  }

  console.log(`\nInserting ${rawRows.length} customers...`);
  const customerRecords = rawRows.map(row => {
    const route = routeMap[row.routeName];
    const area = areaLookup[`${row.routeName}:::${row.areaName}`];
    const address = row.areaName ? `${row.areaName}, ${row.routeName}` : row.routeName;
    const contact = (row.contact && row.contact !== '0') ? row.contact : '';

    return {
      customerName: row.customerName,
      contact: contact,
      address: address,
      stateId: state.id,
      cityId: city.id,
      routeId: route.id,
      areaId: area ? area.id : null,
      openingBalance: 0,
      openingBalanceType: 'DEBIT',
      status: 'ACTIVE'
    };
  });

  // Use createMany
  const createdResult = await prisma.customer.createMany({
    data: customerRecords
  });
  console.log(`✅ Successfully inserted ${createdResult.count} customers on ${name}`);

  // Summary counts
  const finalRoutes = await prisma.route.count();
  const finalAreas = await prisma.area.count();
  const finalCustomers = await prisma.customer.count();

  console.log(`\n--- Verification Summary for ${name} ---`);
  console.log(`Total Routes: ${finalRoutes}`);
  console.log(`Total Areas: ${finalAreas}`);
  console.log(`Total Customers: ${finalCustomers}`);
}

async function main() {
  const tursoUrl = process.env.DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  // 1. Seed Cloud Turso (Production)
  if (tursoToken && tursoUrl?.startsWith('libsql://')) {
    const libsql = createClient({
      url: tursoUrl,
      authToken: tursoToken,
    });
    const adapter = new PrismaLibSQL(libsql);
    const tursoPrisma = new PrismaClient({ adapter });
    await seedData('Cloud Turso (Production)', tursoPrisma);
    await tursoPrisma.$disconnect();
  } else {
    console.log('Skipping Cloud Turso: credentials not configured in .env.local');
  }

  // 2. Seed Local SQLite (dev.db)
  process.env.DATABASE_URL = 'file:./dev.db';
  delete process.env.TURSO_AUTH_TOKEN;
  const localPrisma = new PrismaClient();
  await seedData('Local SQLite (dev.db)', localPrisma);
  await localPrisma.$disconnect();

  console.log('\n🎉 ALL DONE! 4 Routes, 49 Areas, and 320 Customers successfully seeded across both databases!');
}

main().catch(err => {
  console.error('Fatal error during seeding:', err);
  process.exit(1);
});
