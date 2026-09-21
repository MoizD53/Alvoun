'use server';

import { prisma } from '@/lib/db';
import { requireActiveSalesmanSession } from '@/lib/session';
import { logAndEmitActivity } from '@/lib/events';

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

  await logAndEmitActivity({
    salesmanId,
    salesmanName: salesman.name,
    type: 'VISIT_START',
    description: `Started visit at ${customer.customerName}`
  });

  return visit.id;
}

export async function completeVisit(visitId: string, noSaleReason?: string) {
  const { salesman } = await requireActiveSalesmanSession();
  const salesmanId = salesman.id;
  
  const visit = await prisma.visit.findUnique({ 
    where: { id: visitId },
    include: { customer: true }
  });
  if (!visit || visit.salesmanId !== salesmanId) throw new Error('Unauthorized');

  await prisma.visit.update({
    where: { id: visitId },
    data: {
      status: 'COMPLETED',
      noSaleReason
    }
  });
  
  await logAndEmitActivity({
    salesmanId,
    salesmanName: salesman.name,
    type: 'VISIT_END',
    description: `Completed visit at ${visit.customer.customerName}`
  });

  return { success: true };
}
