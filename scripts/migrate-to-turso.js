const { createClient } = require('@libsql/client');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const localPrisma = new PrismaClient();
  const tursoClient = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log('Comparing local schema vs Turso schema...');

  // Get local tables
  const localTablesRes = await localPrisma.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'");
  const localTables = localTablesRes.map(r => r.name);
  console.log('Local tables:', localTables);

  // Get Turso tables
  const tursoTablesRes = await tursoClient.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'");
  const tursoTables = tursoTablesRes.rows.map(r => r.name);
  console.log('Turso tables:', tursoTables);

  const missingTables = localTables.filter(t => !tursoTables.includes(t));
  console.log('Missing tables in Turso:', missingTables);

  for (const table of missingTables) {
    const createSqlRes = await localPrisma.$queryRawUnsafe(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${table}'`);
    if (createSqlRes && createSqlRes[0]) {
      const sql = createSqlRes[0].sql;
      console.log(`Creating table ${table} in Turso...`);
      await tursoClient.execute(sql);
      console.log(`Created table ${table}!`);
    }

    // Copy indexes for this table
    const indexRes = await localPrisma.$queryRawUnsafe(`SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='${table}' AND sql IS NOT NULL`);
    for (const idx of indexRes) {
      console.log(`Creating index in Turso: ${idx.sql}`);
      try {
        await tursoClient.execute(idx.sql);
      } catch (e) {
        console.warn('Index error:', e.message);
      }
    }
  }

  // Check columns for existing tables
  for (const table of localTables.filter(t => tursoTables.includes(t))) {
    const localCols = await localPrisma.$queryRawUnsafe(`PRAGMA table_info("${table}")`);
    const tursoCols = (await tursoClient.execute(`PRAGMA table_info("${table}")`)).rows;

    const tursoColNames = tursoCols.map(c => c.name);
    const missingCols = localCols.filter(c => !tursoColNames.includes(c.name));

    for (const col of missingCols) {
      console.log(`Adding missing column ${col.name} (${col.type}) to table ${table} in Turso...`);
      const notNull = col.notnull ? 'NOT NULL' : '';
      const dflt = col.dflt_value !== null ? `DEFAULT ${col.dflt_value}` : '';
      const alterSql = `ALTER TABLE "${table}" ADD COLUMN "${col.name}" ${col.type} ${dflt}`;
      try {
        await tursoClient.execute(alterSql);
        console.log(`Added column ${col.name} to ${table}!`);
      } catch (e) {
        console.error(`Failed to add column ${col.name}:`, e.message);
      }
    }
  }

  console.log('--- Migration verification ---');
  const finalTursoTables = (await tursoClient.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'")).rows.map(r => r.name);
  console.log('Final Turso tables:', finalTursoTables);

  await localPrisma.$disconnect();
}

main().catch(console.error);
