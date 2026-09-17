import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { getCurrentKolkataTime, getKolkataTimeDetails, getKolkataDateOnly, isWorkingHours } from './time';

export async function requireActiveSalesmanSession() {
  const session = await auth();
  
  if (!session?.user) throw new Error('NOT_AUTHENTICATED');
  if (session.user.role !== 'SALESMAN') throw new Error('NOT_AUTHORIZED');

  const salesman = await prisma.salesman.findUnique({
    where: { profileId: session.user.id }
  });
  
  if (!salesman) throw new Error('SALESMAN_NOT_FOUND');

  const now = getCurrentKolkataTime();
  const timeDetails = getKolkataTimeDetails(now);
  const workDate = getKolkataDateOnly(now);

  if (timeDetails.hour < 7) {
    throw new Error('NOT_STARTED');
  }

  if (timeDetails.hour >= 19) {
    // Force close any active session for today
    await prisma.workSession.updateMany({
      where: {
        salesmanId: salesman.id,
        workDate: workDate,
        status: 'ACTIVE'
      },
      data: {
        status: 'FORCE_CLOSED',
        logoutAt: now
      }
    });
    throw new Error('SESSION_ENDED');
  }

  // It is working hours (07:00 - 18:59)
  let workSession = await prisma.workSession.findUnique({
    where: {
      salesmanId_workDate: {
        salesmanId: salesman.id,
        workDate: workDate
      }
    }
  });

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

  return { salesman, workSession };
}
