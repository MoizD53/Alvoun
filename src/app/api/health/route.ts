export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentKolkataTime } from '@/lib/time';

export async function GET() {
  try {
    // Verify database connectivity
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: getCurrentKolkataTime().toISOString(),
        database: 'connected',
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: getCurrentKolkataTime().toISOString(),
        database: 'disconnected',
        error: error.message || 'Database ping failed',
      },
      { status: 503 }
    );
  }
}
