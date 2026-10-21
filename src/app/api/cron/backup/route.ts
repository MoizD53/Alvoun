import { NextResponse } from 'next/server';
import { createEncryptedBackup } from '@/lib/backup';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Validate authorization via Bearer token or Cron Secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const result = await createEncryptedBackup();
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    message: 'Encrypted daily backup completed successfully.',
    backupDate: result.backupDate,
    sizeBytes: result.fileSizeBytes,
    checksumSha256: result.checksumSha256,
    recordCounts: result.recordCounts,
  });
}
