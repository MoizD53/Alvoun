import dotenv from 'dotenv';
dotenv.config({ path: 'd:/alvoun/.env.local', override: true });
import { createClient } from '@libsql/client';

async function main() {
  const turso = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
  const res = await turso.execute('SELECT id, name, bottlesPerCrate FROM Product;');
  console.log('Products:', res.rows);
}

main().catch(console.error);
