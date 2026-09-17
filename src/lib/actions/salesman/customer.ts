'use server';

import { prisma } from '@/lib/db';
import { requireActiveSalesmanSession } from '@/lib/session';

export async function getMyCustomers(routeId?: string, search?: string) {
  const { salesman } = await requireActiveSalesmanSession();
  const salesmanId = salesman.id;

  const where: any = { salesmanId, status: 'ACTIVE' };
  if (routeId) where.routeId = routeId;
  if (search) {
    where.OR = [
      { customerName: { contains: search } },
      { contact: { contains: search } }
    ];
  }

  const customers = await prisma.customer.findMany({
    where,
    include: {
      route: true,
      city: true,
      state: true,
      sales: { select: { totalAmount: true } },
      payments: { select: { amount: true } }
    },
    orderBy: { route: { name: 'asc' } }
  });

  // Calculate dynamic outstanding
  return customers.map(c => {
    const totalSales = c.sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalPayments = c.payments.reduce((sum, pay) => sum + pay.amount, 0);
    let outstanding = (c.openingBalanceType === 'DEBIT' ? c.openingBalance : -c.openingBalance) + totalSales - totalPayments;
    
    return {
      ...c,
      outstanding
    };
  });
}

export async function getCustomerDetail(id: string) {
  const { salesman } = await requireActiveSalesmanSession();
  const salesmanId = salesman.id;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      route: true,
      city: true,
      state: true,
      sales: { select: { totalAmount: true } },
      payments: { select: { amount: true } }
    }
  });

  if (!customer) throw new Error('Customer not found');
  if (customer.salesmanId !== salesmanId) throw new Error('Unauthorized access to customer');

  const totalSales = customer.sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalPayments = customer.payments.reduce((sum, pay) => sum + pay.amount, 0);
  const outstanding = (customer.openingBalanceType === 'DEBIT' ? customer.openingBalance : -customer.openingBalance) + totalSales - totalPayments;

  return { ...customer, outstanding };
}
