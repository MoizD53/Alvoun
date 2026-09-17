export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/db';
import { getCurrentKolkataTime } from '@/lib/time';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  
  // A simple cron secret check
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const now = getCurrentKolkataTime();
  
  try {
    const result = await prisma.workSession.updateMany({
      where: {
        status: 'ACTIVE'
      },
      data: {
        status: 'FORCE_CLOSED',
        logoutAt: now
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Closed ${result.count} active sessions`,
      timestamp: now 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
