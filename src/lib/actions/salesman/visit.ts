'use server';

import { prisma } from '@/lib/db';
import { requireActiveSalesmanSession } from '@/lib/session';

export async function startVisit(customerId: string) {
  const { salesman } = await requireActiveSalesmanSession();
  const salesmanId = salesman.id;
  
  // Verify ownership
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer || customer.salesmanId !== salesmanId) throw new Error('Unauthorized');

  const visit = await prisma.visit.create({
    data: {
      customerId,
      salesmanId,
      status: 'STARTED'
    }
  });

  return visit.id;
}

export async function completeVisit(visitId: string, noSaleReason?: string) {
  const { salesman } = await requireActiveSalesmanSession();
  const salesmanId = salesman.id;
  
  const visit = await prisma.visit.findUnique({ where: { id: visitId } });
  if (!visit || visit.salesmanId !== salesmanId) throw new Error('Unauthorized');

  await prisma.visit.update({
    where: { id: visitId },
    data: {
      status: 'COMPLETED',
      noSaleReason
    }
  });
  
  return { success: true };
}
