import { createEncryptedBackup, verifyAndRestoreBackup } from '../src/lib/backup';
import { prisma } from '../src/lib/db';

async function run() {
  console.log('[Backup Script] Starting Alvoun Encrypted Master Backup...');
  const res = await createEncryptedBackup();
  if (!res.success) {
    console.error('[Backup Script] ✗ Backup failed:', res.error);
    process.exit(1);
  }

  console.log('[Backup Script] ✓ Backup created successfully:');
  console.log(`  File: ${res.filePath}`);
  console.log(`  Size: ${(res.fileSizeBytes / 1024).toFixed(1)} KB`);
  console.log(`  SHA-256: ${res.checksumSha256}`);
  console.log(`  Records snapshot:`, res.recordCounts);

  console.log('[Backup Script] Testing restore verification...');
  const verify = verifyAndRestoreBackup(res.filePath);
  if (!verify.success) {
    console.error('[Backup Script] ✗ Restore verification failed:', verify.error);
    process.exit(1);
  }

  console.log('[Backup Script] ✓ Verification passed! Backup is valid, decrypted, and recoverable.');
  await prisma.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
