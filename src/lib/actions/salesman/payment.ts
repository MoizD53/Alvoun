'use server';

import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { getKolkataDateOnly, getCurrentKolkataTime } from '@/lib/time';

export async function createStandalonePayment(data: { customerId: string, amount: number, method: string }) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  
  const today = getKolkataDateOnly(getCurrentKolkataTime());

  // Verify active work session
  const activeSession = await prisma.workSession.findUnique({
    where: {
      salesmanId_workDate: {
        salesmanId: session.user.id,
        workDate: today
      }
    }
  });

  if (!activeSession || activeSession.status !== 'ACTIVE') {
    throw new Error('SESSION_ENDED');
  }

  // Verify ownership
  const customer = await prisma.customer.findUnique({
    where: { id: data.customerId }
  });
  if (!customer || customer.salesmanId !== session.user.id) {
    throw new Error('Unauthorized customer access');
  }

  // Create payment
  await prisma.payment.create({
    data: {
      customerId: data.customerId,
      salesmanId: session.user.id,
      amount: data.amount,
      paymentMethod: data.method,
      paymentDate: today
    }
  });

  const { logAndEmitActivity } = await import('@/lib/events');
  await logAndEmitActivity({
    salesmanId: session.user.id,
    salesmanName: session.user.name || 'Salesman',
    type: 'PAYMENT',
    description: `Collected ₹${(data.amount / 100).toFixed(2)} at ${customer.customerName}`,
    metadata: { amount: data.amount }
  });

  return { success: true };
}
