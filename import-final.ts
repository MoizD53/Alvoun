import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function run() {
  console.log('--- STARTING FINAL IMPORT & AUDIT ---');

  // 1. Load CSV
  const csvPath = path.join(__dirname, 'ALVOUN_FINAL_CUSTOMERS.csv');
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.trim().split('\n');
  const rows = lines.slice(1).map((line, idx) => {
    // Basic CSV splitting, assuming no quoted commas in this specific file
    const [customerName, routeName, areaName, contact] = line.split(',');
    return { 
      customerName: customerName?.trim() || '', 
      routeName: routeName?.trim() || '', 
      areaName: areaName?.trim() || '', 
      contact: contact?.trim() || '0',
      rowNum: idx + 2
    };
  });

  console.log(`CSV rows parsed: ${rows.length}`);

  let defaultState = await prisma.state.findFirst();
  if (!defaultState) defaultState = await prisma.state.create({ data: { name: 'Default State' } });
  
  let defaultCity = await prisma.city.findFirst();
  if (!defaultCity) defaultCity = await prisma.city.create({ data: { name: 'Default City', stateId: defaultState.id } });

  // 2. Audit Existing DB
  const existingCustomers = await prisma.customer.findMany({
    include: { route: true, area: { include: { route: true } } }
  });

  console.log(`\n--- AUDITING CURRENT DATABASE (Total: ${existingCustomers.length}) ---`);
  const missingFromCSV = existingCustomers.filter(c => 
    !rows.some(r => r.customerName.toLowerCase() === c.customerName.toLowerCase())
  );
  
  if (missingFromCSV.length > 0) {
    console.log(`Found ${missingFromCSV.length} customers in DB that are missing from the FINAL CSV.`);
    // Not deleting them per rules, just flagging.
  }

  const existingRoutes = await prisma.route.findMany();
  const existingAreas = await prisma.area.findMany();

  // 3. Process the CSV rows
  let successCount = 0;
  let errorCount = 0;
  let reassignedCount = 0;
  let createdCount = 0;
  let newlyCreatedRoutes = 0;
  let newlyCreatedAreas = 0;

  for (const row of rows) {
    try {
      if (!row.customerName || !row.routeName || !row.areaName) {
        throw new Error(`Row ${row.rowNum}: Missing mandatory fields.`);
      }

      // Resolve Route
      let route = await prisma.route.findFirst({
        where: { name: row.routeName }
      });
      if (!route) {
        route = await prisma.route.create({
          data: { name: row.routeName, cityId: defaultCity.id, isActive: true }
        });
        newlyCreatedRoutes++;
      }

      // Resolve Area UNDER THAT SPECIFIC ROUTE
      let area = await prisma.area.findFirst({
        where: { name: row.areaName, routeId: route.id }
      });
      if (!area) {
        area = await prisma.area.create({
          data: { name: row.areaName, routeId: route.id }
        });
        newlyCreatedAreas++;
      }

      // Check if customer exists by name
      const existing = await prisma.customer.findFirst({
        where: { customerName: row.customerName }
      });

      if (existing) {
        // Update territory relationships safely without deleting financial data
        if (existing.routeId !== route.id || existing.areaId !== area.id) {
          await prisma.customer.update({
            where: { id: existing.id },
            data: { routeId: route.id, areaId: area.id }
          });
          reassignedCount++;
        }
      } else {
        // Create new
        await prisma.customer.create({
          data: {
            customerName: row.customerName,
            contact: row.contact,
            address: 'N/A', // Assuming defaults if missing
            stateId: defaultState.id,
            cityId: defaultCity.id,
            routeId: route.id,
            areaId: area.id,
            openingBalance: 0,
            openingBalanceType: 'DEBIT',
            status: 'ACTIVE'
          }
        });
        createdCount++;
      }

      successCount++;
    } catch (err: any) {
      console.error(`Row ${row.rowNum} failed:`, err.message);
      errorCount++;
    }
  }

  console.log('\n--- FINAL REPORT ---');
  console.log(`1. CSV records processed: ${rows.length}`);
  console.log(`2. Records successfully imported/updated: ${successCount}`);
  console.log(`3. Records rejected: ${errorCount}`);
  console.log(`4. Routes created: ${newlyCreatedRoutes}`);
  console.log(`5. Areas created: ${newlyCreatedAreas}`);
  console.log(`6. Customers newly created: ${createdCount}`);
  console.log(`7. Customers repaired/reassigned to correct territory: ${reassignedCount}`);

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
