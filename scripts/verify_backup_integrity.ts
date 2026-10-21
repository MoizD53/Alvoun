import fs from 'fs';
import path from 'path';
import { decryptBuffer } from '../src/lib/backup';

function testRestore() {
  const backupPath = path.resolve('backups/alvoun-backup-2026-10-21.enc');
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found at ${backupPath}`);
  }

  const rawEncrypted = fs.readFileSync(backupPath);
  console.log(`Encrypted backup file size: ${(rawEncrypted.length / 1024).toFixed(1)} KB`);

  const decrypted = decryptBuffer(rawEncrypted);
  const payload = JSON.parse(decrypted.toString('utf8'));

  console.log('✓ Decryption successful!');
  console.log('Backup system:', payload.system);
  console.log('Backup timestamp:', payload.backupTimestamp);
  console.log('Record counts in backup:');
  console.table(payload.recordCounts);

  if (!payload.data || !payload.data.customers || payload.data.customers.length !== 320) {
    throw new Error(`Integrity check failed: Expected 320 customers in backup, found ${payload.data?.customers?.length}`);
  }

  console.log('✓ Backup contains all 320 customers, intact and recoverable.');
}

testRestore();
