'use server';

import { prisma } from '@/lib/db';
import { requireActiveSalesmanSession } from '@/lib/session';

export async function getDashboardStats() {
  const { salesman } = await requireActiveSalesmanSession();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [customersCount, visitsCount, salesResult, collectionResult] = await Promise.all([
    prisma.customer.count({
      where: { salesmanId: salesman.id, status: 'ACTIVE' }
    }),
    prisma.visit.count({
      where: { 
        salesmanId: salesman.id,
        createdAt: { gte: today }
      }
    }),
    prisma.sale.aggregate({
      where: { 
        salesmanId: salesman.id,
        saleDate: { gte: today }
      },
      _sum: { totalAmount: true }
    }),
    prisma.payment.aggregate({
      where: { 
        salesmanId: salesman.id,
        paymentDate: { gte: today }
      },
      _sum: { amount: true }
    })
  ]);

  const assignments = await prisma.salesmanAssignment.findMany({
    where: { salesmanId: salesman.id },
    include: { route: true, area: true }
  });

  const routesCount = new Set(assignments.map(a => a.routeId)).size;
  const areasCount = new Set(assignments.map(a => a.areaId)).size;

  return {
    customersCount,
    visitsCount,
    salesAmount: salesResult._sum.totalAmount || 0,
    collectionAmount: collectionResult._sum.amount || 0,
    routesCount,
    areasCount
  };
}
