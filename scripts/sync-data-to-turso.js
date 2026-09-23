const { createClient } = require('@libsql/client');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const localPrisma = new PrismaClient();
  const tursoClient = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log('Syncing data from local SQLite to Turso...');

  // Sync order matters for Foreign Keys
  const tables = [
    'Profile',
    'Salesman',
    'State',
    'City',
    'Route',
    'Area',
    'SalesmanAssignment',
    'Customer',
    'Product',
    'Rate',
    'Visit',
    'Sale',
    'SaleItem',
    'Payment',
    'WorkSession',
    'Location',
    'ActivityLog'
  ];

  for (const table of tables) {
    const rows = await localPrisma.$queryRawUnsafe(`SELECT * FROM "${table}"`);
    console.log(`Table ${table} has ${rows.length} local rows.`);

    if (rows.length === 0) continue;

    for (const row of rows) {
      const columns = Object.keys(row);
      const values = Object.values(row);

      const placeholders = columns.map(() => '?').join(', ');
      const colsJoined = columns.map(c => `"${c}"`).join(', ');

      const sql = `INSERT OR REPLACE INTO "${table}" (${colsJoined}) VALUES (${placeholders})`;

      try {
        await tursoClient.execute({
          sql,
          args: values.map(v => (v instanceof Date ? v.toISOString() : v))
        });
      } catch (e) {
        console.error(`Error inserting into ${table}:`, e.message);
      }
    }
    console.log(`Synced ${rows.length} rows to ${table} in Turso.`);
  }

  console.log('All local data successfully synced to Turso!');
  await localPrisma.$disconnect();
}

main().catch(console.error);
