require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@libsql/client');

async function main() {
  const tursoClient = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  process.env.DATABASE_URL = 'file:./dev.db';
  delete process.env.TURSO_AUTH_TOKEN;
  const localPrisma = new PrismaClient();

  // 1. Get exact local Customer table SQL & indexes
  const localTableRes = await localPrisma.$queryRawUnsafe(`SELECT sql FROM sqlite_master WHERE type='table' AND name='Customer'`);
  const tableSql = localTableRes[0].sql;

  const localIndexRes = await localPrisma.$queryRawUnsafe(`SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='Customer' AND sql IS NOT NULL`);

  console.log('Customer create table SQL:', tableSql);

  // 2. Check current Turso row count in Customer
  const custCountRes = await tursoClient.execute("SELECT COUNT(*) as count FROM Customer");
  console.log('Current Turso Customer row count:', custCountRes.rows[0].count);

  if (Number(custCountRes.rows[0].count) > 0) {
    console.error('Cannot drop Customer table: rows exist!');
    process.exit(1);
  }

  // 3. Drop and recreate in Turso
  console.log('Dropping existing Customer table in Turso...');
  await tursoClient.execute("DROP TABLE IF EXISTS Customer");

  console.log('Creating updated Customer table in Turso...');
  await tursoClient.execute(tableSql);

  for (const idx of localIndexRes) {
    console.log('Creating index:', idx.sql);
    try {
      await tursoClient.execute(idx.sql);
    } catch (e) {
      console.warn('Index notice:', e.message);
    }
  }

  console.log('✅ Customer table in Turso updated successfully to match local SQLite & Prisma schema!');
  await localPrisma.$disconnect();
}

main().catch(console.error);
