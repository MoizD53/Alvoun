import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/alvoun/.env.local', override: true });
import { createClient } from '@libsql/client';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret = process.env.BACKUP_ENCRYPTION_KEY || process.env.AUTH_SECRET || 'alvoun-production-backup-master-secret-key-32b';
  return crypto.scryptSync(secret, 'alvoun-salt', 32);
}

function encryptBuffer(buffer: Buffer): Buffer {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

function decryptBuffer(encryptedBuffer: Buffer): Buffer {
  const key = getEncryptionKey();
  const iv = encryptedBuffer.subarray(0, IV_LENGTH);
  const tag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = encryptedBuffer.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

async function backupPre333() {
  console.log('--- CREATING FRESH PRE-RESTORATION BACKUP OF LIVE TURSO ---');
  console.log('Connecting to Turso URL:', process.env.DATABASE_URL);

  const turso = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const tables = [
    'Profile', 'Salesman', 'State', 'City', 'Route', 'Area',
    'Customer', 'Product', 'Rate', 'CustomerProductRate',
    'Sale', 'Payment', 'Visit', 'WorkSession', 'ActivityLog',
    'StaffMember', 'StaffAttendance', 'PayrollRecord', 'Expense', 'ProductionBatch'
  ];

  const snapshot: Record<string, any[]> = {};
  const recordCounts: Record<string, number> = {};

  for (const t of tables) {
    const res = await turso.execute(`SELECT * FROM "${t}";`);
    snapshot[t] = res.rows;
    recordCounts[t] = res.rows.length;
  }

  console.log('Live Turso record counts:', recordCounts);

  // 1. Raw JSON
  const rawPath = path.resolve('backups/alvoun-raw-pre-333-restoration-2026-10-21.json');
  fs.writeFileSync(rawPath, JSON.stringify({ timestamp: new Date().toISOString(), recordCounts, data: snapshot }, null, 2));
  console.log(`✓ Raw JSON backup saved to: ${rawPath} (${(fs.statSync(rawPath).size / 1024).toFixed(1)} KB)`);

  // 2. Encrypted Backup
  const encPath = path.resolve('backups/alvoun-backup-pre-333-restoration-2026-10-21.enc');
  const rawBuf = Buffer.from(JSON.stringify({ timestamp: new Date().toISOString(), recordCounts, data: snapshot }), 'utf8');
  const encBuf = encryptBuffer(rawBuf);
  fs.writeFileSync(encPath, encBuf);
  const sha256 = crypto.createHash('sha256').update(encBuf).digest('hex');
  console.log(`✓ Encrypted backup saved to: ${encPath} (${(encBuf.length / 1024).toFixed(1)} KB)`);
  console.log(`  SHA-256: ${sha256}`);

  // 3. Isolated Restore Verification Test
  console.log('\n--- VERIFYING ISOLATED RESTORE OF BACKUP ---');
  const readEnc = fs.readFileSync(encPath);
  const decrypted = decryptBuffer(readEnc);
  const restoredPayload = JSON.parse(decrypted.toString('utf8'));

  if (!restoredPayload.data || !restoredPayload.data.Customer || restoredPayload.data.Customer.length !== 153) {
    throw new Error(`Backup verification failed! Expected 153 customers, found ${restoredPayload.data?.Customer?.length}`);
  }
  console.log(`✓ Restore test passed! Successfully decrypted and verified all ${restoredPayload.data.Customer.length} customer records.`);
}

backupPre333().catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});
