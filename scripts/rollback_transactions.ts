import dotenv from 'dotenv';
dotenv.config({ path: 'd:/alvoun/.env.local', override: true });
import { createClient } from '@libsql/client';
import fs from 'fs';

async function rollback() {
  console.log('Rolling back transactions to pre-transaction state...');
  const turso = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  // Find latest pre-transaction raw backup
  const backups = fs.readdirSync('backups')
    .filter(f => f.startsWith('alvoun-raw-pre-transactions-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (backups.length === 0) {
    throw new Error('No pre-transactions backup found!');
  }

  const backupFile = `backups/${backups[0]}`;
  console.log(`Using backup snapshot: ${backupFile}`);
  const snapshot = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

  // Delete all SaleItem, Sale, Payment
  await turso.execute('DELETE FROM SaleItem;');
  await turso.execute('DELETE FROM Sale;');
  await turso.execute('DELETE FROM Payment;');
  console.log('Cleared SaleItem, Sale, Payment.');

  // Restore Customer openingBalance
  const customers = snapshot.data.Customer;
  console.log(`Restoring ${customers.length} customer records...`);
  const updates: any[] = [];
  for (const c of customers) {
    updates.push({
      sql: `UPDATE Customer SET openingBalance = ?, openingBalanceType = ? WHERE id = ?;`,
      args: [c.openingBalance, c.openingBalanceType, c.id]
    });
  }
  for (let i = 0; i < updates.length; i += 50) {
    await turso.batch(updates.slice(i, i + 50), 'write');
  }

  console.log('Rollback complete. Restored customer opening balances.');
}

rollback().catch(console.error);
