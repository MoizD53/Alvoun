const { createClient } = require('@libsql/client');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function main() {
  if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('libsql://')) {
    console.error('DATABASE_URL is not a libsql URL in .env.local');
    process.exit(1);
  }

  const client = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const sql = fs.readFileSync('migrate.sql', 'utf8');
  const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

  console.log('Connecting to Turso database...');
  for (const stmt of statements) {
    try {
      await client.execute(stmt);
      console.log('Executed:', stmt.slice(0, 50).replace(/\n/g, ' ') + '...');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('Skipped (already exists):', stmt.slice(0, 50).replace(/\n/g, ' ') + '...');
      } else {
        console.error('Error executing statement:', stmt);
        console.error(e.message);
        throw e;
      }
    }
  }

  console.log('Schema successfully applied to Turso database.');
}

main().catch(console.error);
