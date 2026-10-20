export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/db';
import { getCurrentKolkataTime, getKolkataTimeDetails } from '@/lib/time';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // 1. Check Bearer CRON_SECRET if configured
  const hasValidCronSecret = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
  
  // 2. Or check if authenticated as OWNER / ADMIN
  let isAuthorizedAdmin = false;
  if (!hasValidCronSecret) {
    try {
      const session = await auth();
      if (session?.user && (session.user.role === 'OWNER' || session.user.role === 'ADMIN')) {
        isAuthorizedAdmin = true;
      }
    } catch {
      // Ignore auth parsing error
    }
  }

  if (!hasValidCronSecret && !isAuthorizedAdmin) {
    return new NextResponse('Unauthorized: Valid Bearer CRON_SECRET or Admin session required', { status: 401 });
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
