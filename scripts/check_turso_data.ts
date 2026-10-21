import dotenv from 'dotenv';
dotenv.config({ path: 'd:/alvoun/.env.local' });
import { createClient } from '@libsql/client';

async function checkTurso() {
  const turso = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const tables = await turso.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
  console.log('Turso tables:', tables.rows.map(r => r.name));

  for (const tbl of ['Customer', 'Sale', 'Payment', 'Visit', 'Product', 'Route', 'Area', 'CustomerProductRate']) {
    try {
      const res = await turso.execute(`SELECT count(*) as count FROM "${tbl}";`);
      console.log(`Turso count for ${tbl}:`, res.rows[0].count);
    } catch (e: any) {
      console.log(`Turso count for ${tbl} error:`, e.message);
    }
  }
}

checkTurso().catch(console.error);
