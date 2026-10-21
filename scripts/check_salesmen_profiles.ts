import dotenv from 'dotenv';
dotenv.config({ path: 'd:/alvoun/.env.local', override: true });
import { createClient } from '@libsql/client';

async function main() {
  const turso = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
  const res = await turso.execute('SELECT * FROM Salesman;');
  console.log('Salesmen in DB:', res.rows.length);
  for (const s of res.rows) {
    console.log(s);
  }

  const profiles = await turso.execute('SELECT id, name, role FROM Profile;');
  console.log('Profiles in DB:', profiles.rows.length);
  for (const p of profiles.rows) {
    console.log(p);
  }
}

main().catch(console.error);
