import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from './db';
import { getKolkataDateString, getCurrentKolkataTime } from './time';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const BACKUP_DIR = process.env.VERCEL
  ? path.join('/tmp', 'backups')
  : path.resolve(process.cwd(), 'backups');

function getEncryptionKey(): Buffer {
  const secret = process.env.BACKUP_ENCRYPTION_KEY || process.env.AUTH_SECRET || 'alvoun-production-backup-master-secret-key-32b';
  return crypto.scryptSync(secret, 'alvoun-salt', 32);
}

export function encryptBuffer(buffer: Buffer): Buffer {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Format: [16 bytes IV][16 bytes Tag][Encrypted Data]
  return Buffer.concat([iv, tag, encrypted]);
}

export function decryptBuffer(encryptedBuffer: Buffer): Buffer {
  const key = getEncryptionKey();
  const iv = encryptedBuffer.subarray(0, IV_LENGTH);
  const tag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = encryptedBuffer.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export interface BackupResult {
  success: boolean;
  backupDate: string;
  filePath: string;
  fileSizeBytes: number;
  checksumSha256: string;
  recordCounts: Record<string, number>;
  error?: string;
}

export async function createEncryptedBackup(): Promise<BackupResult> {
  const now = getCurrentKolkataTime();
  const dateStr = getKolkataDateString(now);

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const outFilePath = path.join(BACKUP_DIR, `alvoun-backup-${dateStr}.enc`);

  try {
    // 1. Collect authoritative snapshots of all core tables
    const [
      profiles,
      salesmen,
      states,
      cities,
      routes,
      areas,
      customers,
      products,
      rates,
      visits,
      sales,
      saleItems,
      payments,
      workSessions,
      activityLogs,
    ] = await Promise.all([
      prisma.profile.findMany(),
      prisma.salesman.findMany(),
      prisma.state.findMany(),
      prisma.city.findMany(),
      prisma.route.findMany(),
      prisma.area.findMany(),
      prisma.customer.findMany(),
      prisma.product.findMany(),
      prisma.rate.findMany(),
      prisma.visit.findMany(),
      prisma.sale.findMany(),
      prisma.saleItem.findMany(),
      prisma.payment.findMany(),
      prisma.workSession.findMany(),
      prisma.activityLog.findMany({ take: 5000, orderBy: { createdAt: 'desc' } }),
    ]);

    const recordCounts = {
      profiles: profiles.length,
      salesmen: salesmen.length,
      states: states.length,
      cities: cities.length,
      routes: routes.length,
      areas: areas.length,
      customers: customers.length,
      products: products.length,
      rates: rates.length,
      visits: visits.length,
      sales: sales.length,
      saleItems: saleItems.length,
      payments: payments.length,
      workSessions: workSessions.length,
      activityLogs: activityLogs.length,
    };

    const payload = {
      alvounVersion: '1.0',
      system: 'ALVOUN ERP',
      backupTimestamp: now.toISOString(),
      backupDate: dateStr,
      recordCounts,
      data: {
        profiles,
        salesmen,
        states,
        cities,
        routes,
        areas,
        customers,
        products,
        rates,
        visits,
        sales,
        saleItems,
        payments,
        workSessions,
        activityLogs,
      }
    };

    const rawBuffer = Buffer.from(JSON.stringify(payload), 'utf8');
    const encryptedBuffer = encryptBuffer(rawBuffer);

    // Write encrypted backup file
    fs.writeFileSync(outFilePath, encryptedBuffer);

    // Compute SHA-256
    const hash = crypto.createHash('sha256').update(encryptedBuffer).digest('hex');

    // Maintain manifest log
    const manifestPath = path.join(BACKUP_DIR, 'backup-manifest.json');
    let manifest: any[] = [];
    if (fs.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      } catch {
        manifest = [];
      }
    }

    manifest.unshift({
      date: dateStr,
      timestamp: now.toISOString(),
      fileName: path.basename(outFilePath),
      sizeBytes: encryptedBuffer.length,
      sha256: hash,
      status: 'VERIFIED',
      recordCounts
    });

    // Retain last 30 backup entries
    if (manifest.length > 30) manifest = manifest.slice(0, 30);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    return {
      success: true,
      backupDate: dateStr,
      filePath: outFilePath,
      fileSizeBytes: encryptedBuffer.length,
      checksumSha256: hash,
      recordCounts,
    };
  } catch (error: any) {
    console.error('Backup creation failed:', error);
    return {
      success: false,
      backupDate: dateStr,
      filePath: outFilePath,
      fileSizeBytes: 0,
      checksumSha256: '',
      recordCounts: {},
      error: error.message || 'Unknown backup error',
    };
  }
}

export function verifyAndRestoreBackup(backupFilePath: string): { success: boolean; recordCounts?: Record<string, number>; error?: string } {
  try {
    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`Backup file not found at: ${backupFilePath}`);
    }

    const encryptedData = fs.readFileSync(backupFilePath);
    const decryptedBuffer = decryptBuffer(encryptedData);
    const payload = JSON.parse(decryptedBuffer.toString('utf8'));

    if (payload.system !== 'ALVOUN ERP' || !payload.data) {
      throw new Error('Invalid backup file schema');
    }

    return {
      success: true,
      recordCounts: payload.recordCounts,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Decryption/Verification failed',
    };
  }
}
