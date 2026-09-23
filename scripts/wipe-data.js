require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@libsql/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');

async function wipeDatabase(name, prismaInstance) {
  console.log(`\n========================================`);
  console.log(`🧹 Wiping transactional & salesman data on: ${name}`);
  console.log(`========================================`);

  // 1. Transactional & History Data
  const deletedLocations = await prismaInstance.location.deleteMany();
  console.log(`Deleted Locations: ${deletedLocations.count}`);

  const deletedWorkSessions = await prismaInstance.workSession.deleteMany();
  console.log(`Deleted WorkSessions: ${deletedWorkSessions.count}`);

  const deletedActivityLogs = await prismaInstance.activityLog.deleteMany();
  console.log(`Deleted ActivityLogs: ${deletedActivityLogs.count}`);

  const deletedVisits = await prismaInstance.visit.deleteMany();
  console.log(`Deleted Visits: ${deletedVisits.count}`);

  const deletedSaleItems = await prismaInstance.saleItem.deleteMany();
  console.log(`Deleted SaleItems: ${deletedSaleItems.count}`);

  const deletedSales = await prismaInstance.sale.deleteMany();
  console.log(`Deleted Sales: ${deletedSales.count}`);

  const deletedPayments = await prismaInstance.payment.deleteMany();
  console.log(`Deleted Payments: ${deletedPayments.count}`);

  // 2. Salesman Assignments & Disconnect Foreign Keys
  const deletedAssignments = await prismaInstance.salesmanAssignment.deleteMany();
  console.log(`Deleted SalesmanAssignments: ${deletedAssignments.count}`);

  const updatedRoutes = await prismaInstance.route.updateMany({
    data: { salesmanId: null }
  });
  console.log(`Reset salesmanId on Routes: ${updatedRoutes.count}`);

  // 3. Customers
  const deletedCustomers = await prismaInstance.customer.deleteMany();
  console.log(`Deleted Customers: ${deletedCustomers.count}`);

  // 4. Salesmen and Salesman Profiles (Credentials, Passwords, Accounts)
  const deletedSalesmen = await prismaInstance.salesman.deleteMany();
  console.log(`Deleted Salesmen: ${deletedSalesmen.count}`);

  const deletedSalesmanProfiles = await prismaInstance.profile.deleteMany({
    where: { role: 'SALESMAN' }
  });
  console.log(`Deleted Salesman Profiles (IDs & Passwords): ${deletedSalesmanProfiles.count}`);

  // 5. Verification
  console.log(`\n--- Verification on ${name} ---`);
  const remainingProfiles = await prismaInstance.profile.findMany();
  console.log(`Remaining Profiles (${remainingProfiles.length}):`);
  remainingProfiles.forEach(p => console.log(`  - [${p.role}] ${p.name} (${p.email})`));

  console.log(`Remaining Salesmen: ${await prismaInstance.salesman.count()}`);
  console.log(`Remaining Customers: ${await prismaInstance.customer.count()}`);
  console.log(`Remaining Sales: ${await prismaInstance.sale.count()}`);
  console.log(`Remaining Payments: ${await prismaInstance.payment.count()}`);
  console.log(`Remaining WorkSessions: ${await prismaInstance.workSession.count()}`);
  console.log(`Remaining Products: ${await prismaInstance.product.count()}`);
  console.log(`Remaining Routes: ${await prismaInstance.route.count()}`);
}

async function main() {
  const tursoUrl = process.env.DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  // 1. Wipe Cloud Turso (Production)
  if (tursoToken && tursoUrl?.startsWith('libsql://')) {
    const libsql = createClient({
      url: tursoUrl,
      authToken: tursoToken,
    });
    const adapter = new PrismaLibSQL(libsql);
    const tursoPrisma = new PrismaClient({ adapter });
    await wipeDatabase('Cloud Turso (Production)', tursoPrisma);
    await tursoPrisma.$disconnect();
  }

  // 2. Wipe Local SQLite (dev.db)
  process.env.DATABASE_URL = 'file:./dev.db';
  delete process.env.TURSO_AUTH_TOKEN;
  const localPrisma = new PrismaClient();
  await wipeDatabase('Local SQLite (dev.db)', localPrisma);
  await localPrisma.$disconnect();

  console.log('\n✅ All data wiped successfully! Both Production and Local databases are completely clean.');
}

main().catch(console.error);
