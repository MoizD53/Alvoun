import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { getCurrentKolkataTime, getKolkataTimeDetails, getKolkataDateOnly, isWorkingHours } from './time';
import { normalizeRole, isFinancialRole } from './rbac';
import { recordQueryMetrics } from './turso-budget';

// In-memory 60s cache for active salesman sessions to eliminate redundant DB reads on frequent GPS pings
const salesmanSessionCache = new Map<string, {
  data: { salesman: any; workSession: any };
  expiresAt: number;
}>();

export function invalidateSalesmanSessionCache(profileId?: string) {
  if (profileId) salesmanSessionCache.delete(profileId);
  else salesmanSessionCache.clear();
}

export async function requireActiveSalesmanSession() {
  const session = await auth();
  
  if (!session?.user) throw new Error('NOT_AUTHENTICATED');
  if (session.user.role !== 'SALESMAN') throw new Error('NOT_AUTHORIZED');

  const now = getCurrentKolkataTime();
  const workDate = getKolkataDateOnly(now);
  const cacheKey = session.user.id;

  const cached = salesmanSessionCache.get(cacheKey);
  if (
    cached && 
    cached.expiresAt > Date.now() && 
    cached.data.workSession?.status === 'ACTIVE' &&
    cached.data.workSession?.workDate?.getTime() === workDate.getTime()
  ) {
    return cached.data;
  }

  recordQueryMetrics(2); // Tracks 2 row reads for salesman + session

  const salesman = await prisma.salesman.findUnique({
    where: { profileId: session.user.id }
  });
  
  if (!salesman) throw new Error('SALESMAN_NOT_FOUND');

  // Temporarily disabled 7 AM to 7 PM restriction for 24/7 salesman access
  /*
  if (timeDetails.hour < 7) {
    throw new Error('NOT_STARTED');
  }

  if (timeDetails.hour >= 19) {
    const exact7pmUTC = Date.UTC(timeDetails.year, timeDetails.month - 1, timeDetails.day, 19, 0, 0, 0);
    const exact7pmIST = new Date(exact7pmUTC - (5.5 * 60 * 60 * 1000));
    
    // Force close any active session for today
    await prisma.workSession.updateMany({
      where: {
        salesmanId: salesman.id,
        workDate: workDate,
        status: 'FORCE_CLOSED'
      },
      data: {
        status: 'FORCE_CLOSED',
        logoutAt: exact7pmIST
      }
    });
    throw new Error('SESSION_ENDED');
  }
  */

  // Ensure active work session for today
  let workSession = await prisma.workSession.findUnique({
    where: {
      salesmanId_workDate: {
        salesmanId: salesman.id,
        workDate: workDate
      }
    }
  });

  if (workSession && workSession.status !== 'ACTIVE') {
    workSession = await prisma.workSession.update({
      where: { id: workSession.id },
      data: { 
        status: 'ACTIVE',
        logoutAt: null 
      }
    });
  }

  if (!workSession) {
    try {
      workSession = await prisma.workSession.create({
        data: {
          salesmanId: salesman.id,
          workDate: workDate,
          loginAt: now,
          status: 'ACTIVE'
        }
      });
    } catch (error) {
      // Handle possible race condition creation
      workSession = await prisma.workSession.findUnique({
        where: {
          salesmanId_workDate: {
            salesmanId: salesman.id,
            workDate: workDate
          }
        }
      });
    }
  }

  if (!workSession) {
     throw new Error('SESSION_CREATION_FAILED');
  }

  if (workSession.status !== 'ACTIVE') {
    throw new Error('SESSION_ENDED'); // Manually closed or force closed earlier
  }

  const result = { salesman, workSession };
  salesmanSessionCache.set(cacheKey, { data: result, expiresAt: Date.now() + 60000 });
  return result;
}

export async function requireAdminSession() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('NOT_AUTHENTICATED');
  }
  const canonical = normalizeRole(session.user.role);
  if (
    canonical === 'SALESMAN' &&
    session.user.role !== 'OWNER' &&
    session.user.role !== 'ADMIN'
  ) {
    throw new Error('NOT_AUTHORIZED');
  }
  return session;
}

export async function requireAuthSession() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('NOT_AUTHENTICATED');
  }
  return session;
}
