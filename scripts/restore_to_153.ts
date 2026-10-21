import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/alvoun/.env.local', override: true });
import { createClient } from '@libsql/client';

async function restoreTo153() {
  const turso = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const raw = JSON.parse(fs.readFileSync('backups/alvoun-raw-pre-333-restoration-2026-10-21.json', 'utf8'));
  const custs: any[] = raw.data.Customer;
  const rates: any[] = raw.data.CustomerProductRate;

  console.log(`Restoring Turso to exact pre-333 state (${custs.length} customers, ${rates.length} rates)...`);

  await turso.execute('DELETE FROM CustomerProductRate;');
  await turso.execute('DELETE FROM Customer;');

  for (const c of custs) {
    await turso.execute({
      sql: `INSERT INTO Customer (
              id, customerName, contact, address, stateId, cityId, routeId, areaId,
              openingBalance, openingBalanceType, category, status, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        c.id, c.customerName, c.contact, c.address, c.stateId, c.cityId, c.routeId, c.areaId,
        c.openingBalance, c.openingBalanceType, c.category, c.status, c.createdAt, c.updatedAt
      ]
    });
  }

  for (const r of rates) {
    await turso.execute({
      sql: `INSERT INTO CustomerProductRate (id, customerId, productId, rate, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?);`,
      args: [r.id, r.customerId, r.productId, r.rate, r.createdAt, r.updatedAt]
    });
  }

  const cCount = Number((await turso.execute('SELECT count(*) as cnt FROM Customer;')).rows[0].cnt);
  const rCount = Number((await turso.execute('SELECT count(*) as cnt FROM CustomerProductRate;')).rows[0].cnt);
  console.log(`Turso restored: Customers=${cCount}, Rates=${rCount}`);
}

restoreTo153().catch(console.error);
