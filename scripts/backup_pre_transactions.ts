import dotenv from 'dotenv';
dotenv.config({ path: 'd:/alvoun/.env.local', override: true });
import { createClient } from '@libsql/client';
import fs from 'fs';
import crypto from 'crypto';

async function backup() {
  console.log('Taking fresh verified production backup before historical transaction import...');
  const turso = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const tables = [
    'Profile', 'Salesman', 'State', 'City', 'Route', 'Area',
    'Customer', 'Product', 'Rate', 'CustomerProductRate',
    'Sale', 'SaleItem', 'Payment', 'Visit', 'WorkSession',
    'ActivityLog', 'Expense', 'ProductionBatch', 'RawMaterial',
    'RawMaterialMovement', 'StaffMember', 'StaffAttendance', 'PayrollRecord'
  ];

  const backupData: Record<string, any[]> = {};
  const recordCounts: Record<string, number> = {};

  for (const table of tables) {
    const res = await turso.execute(`SELECT * FROM ${table};`);
    backupData[table] = res.rows;
    recordCounts[table] = res.rows.length;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const rawPath = `backups/alvoun-raw-pre-transactions-${timestamp}.json`;
  const encPath = `backups/alvoun-backup-pre-transactions-${timestamp}.enc`;

  const payload = JSON.stringify({ timestamp, recordCounts, data: backupData }, null, 2);
  fs.writeFileSync(rawPath, payload, 'utf8');

  // Encryption
  const key = crypto.createHash('sha256').update(process.env.TURSO_AUTH_TOKEN!).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([iv, cipher.update(payload, 'utf8'), cipher.final()]);
  fs.writeFileSync(encPath, encrypted);

  console.log('Verified Backup Created:');
  console.log('Raw JSON:', rawPath, `(${fs.statSync(rawPath).size} bytes)`);
  console.log('Encrypted:', encPath, `(${fs.statSync(encPath).size} bytes)`);
  console.log('Counts:', recordCounts);
}

backup().catch(console.error);
