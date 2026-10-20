import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/db';

async function performBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(process.cwd(), 'backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFilePath = path.join(backupDir, `backup-${timestamp}.db`);

  console.log(`[Backup] Initiating safe SQLite database snapshot to: ${backupFilePath}`);

  try {
    // VACUUM INTO creates an exact, transactionally-consistent copy of the active database
    // Even while queries or transactions are active, SQLite ensures zero corruption
    const sanitizedPath = backupFilePath.replace(/\\/g, '/');
    await prisma.$queryRawUnsafe(`VACUUM INTO '${sanitizedPath}'`);

    const stats = fs.statSync(backupFilePath);
    console.log(`[Backup] ✓ Success! Backup created (${(stats.size / 1024).toFixed(1)} KB)`);
    console.log(`[Backup] To restore:`);
    console.log(`  1. Stop application: npm stop or terminate node process`);
    console.log(`  2. Copy backup file to database destination:`);
    console.log(`     copy "${backupFilePath}" "prisma\\dev.db"`);
    console.log(`  3. Restart application: npm start`);
  } catch (error: any) {
    console.error(`[Backup] ✗ Failed to create online SQLite backup:`, error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

performBackup();
