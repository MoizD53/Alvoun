'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getCurrentKolkataTime, getKolkataDateOnly } from '@/lib/time';
import { logAndEmitActivity } from '@/lib/events';
import { revalidatePath } from 'next/cache';

/**
 * Normal Salesman Logout:
 * 1. Authenticate server-side session.
 * 2. Find today's ACTIVE WorkSession for this salesman.
 * 3. Update status = 'COMPLETED', logoutAt = actual server timestamp in Asia/Kolkata.
 * 4. Emit live activity event for real-time Admin updates.
 * 5. Revalidate relevant paths.
 */
export async function salesmanLogout() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'NOT_AUTHENTICATED' };
    }

    const salesman = await prisma.salesman.findUnique({
      where: { profileId: session.user.id },
      include: { profile: true }
    });

    if (!salesman) {
      return { success: false, error: 'SALESMAN_NOT_FOUND' };
    }

    const now = getCurrentKolkataTime();
    const today = getKolkataDateOnly(now);

    // Find today's ACTIVE WorkSession for that salesman
    const activeSession = await prisma.workSession.findFirst({
      where: {
        salesmanId: salesman.id,
        workDate: today,
        status: 'ACTIVE'
      }
    });

    if (activeSession) {
      await prisma.workSession.update({
        where: { id: activeSession.id },
        data: {
          status: 'COMPLETED',
          logoutAt: now
        }
      });

      // Emit activity so all Admin screens listening to SSE update live without F5
      await logAndEmitActivity({
        salesmanId: salesman.id,
        salesmanName: salesman.name,
        type: 'LOGOUT',
        description: `${salesman.name} logged out from work session.`,
        metadata: {
          workSessionId: activeSession.id,
          logoutAt: now.toISOString()
        }
      }).catch((e) => console.error('Error emitting logout activity:', e));
    }

    // Revalidate Admin and Salesman routes
    revalidatePath('/dashboard/admin');
    revalidatePath('/dashboard/admin/sessions');
    revalidatePath('/dashboard/admin/salesmen');
    revalidatePath('/dashboard/admin/locations');
    revalidatePath('/dashboard/salesman/profile');

    return { success: true };
  } catch (error: any) {
    console.error('Error during salesman logout:', error);
    return { success: false, error: error.message };
  }
}
