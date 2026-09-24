export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/db';
import { getCurrentKolkataTime, getKolkataTimeDetails } from '@/lib/time';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  
  // A simple cron secret check
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const now = getCurrentKolkataTime();
  const timeDetails = getKolkataTimeDetails(now);
  
  // Exact 7:00 PM today IST
  const exact7pmUTC = Date.UTC(timeDetails.year, timeDetails.month - 1, timeDetails.day, 19, 0, 0, 0);
  const exact7pmIST = new Date(exact7pmUTC - (5.5 * 60 * 60 * 1000));
  
  try {
    const result = await prisma.workSession.updateMany({
      where: {
        status: 'ACTIVE'
      },
      data: {
        status: 'FORCE_CLOSED',
        logoutAt: exact7pmIST
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
