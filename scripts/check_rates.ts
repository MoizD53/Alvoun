import dotenv from 'dotenv';
dotenv.config({ path: 'd:/alvoun/.env.local' });
import { createClient } from '@libsql/client';

async function checkRates() {
  const turso = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const rates = await turso.execute('SELECT r.*, p.name as productName FROM Rate r JOIN Product p ON r.productId = p.id;');
  console.log('Turso standard rates:', rates.rows);
}

checkRates().catch(console.error);
