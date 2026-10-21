import dotenv from 'dotenv';
dotenv.config({ path: 'd:/alvoun/.env.local' });
import { createClient } from '@libsql/client';

async function checkDetails() {
  const turso = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const products = await turso.execute('SELECT id, name, bottlesPerCrate, isActive FROM Product;');
  console.log('Turso Products:', products.rows);

  const routes = await turso.execute('SELECT id, name, cityId, isActive FROM Route;');
  console.log('Turso Routes:', routes.rows);

  const areas = await turso.execute('SELECT id, name, routeId FROM Area;');
  console.log('Turso Areas Count:', areas.rows.length);

  const sampleCust = await turso.execute('SELECT id, customerName, contact, address, routeId, areaId, status, openingBalance, code FROM Customer LIMIT 5;');
  console.log('Turso Sample Customers:', sampleCust.rows);
}

checkDetails().catch(console.error);
