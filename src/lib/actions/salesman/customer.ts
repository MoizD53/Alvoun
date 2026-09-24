'use server';

import { prisma } from '@/lib/db';
import { requireActiveSalesmanSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';

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
      city: true,
      state: true,
      route: true,
      sales: { orderBy: { saleDate: 'desc' }, include: { items: { include: { product: true } } } },
      payments: { orderBy: { paymentDate: 'desc' } },
      visits: { orderBy: { createdAt: 'desc' } }
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
export async function updateCustomerPhone(id: string, phone: string) {
  try {
    const { salesman } = await requireActiveSalesmanSession();
    
    // Verify customer belongs to salesman
    const customer = await prisma.customer.findUnique({
      where: { id }
    });

    if (!customer) return { error: 'Customer not found' };
    if (customer.salesmanId !== salesman.id) return { error: 'Unauthorized to update this customer' };

    await prisma.customer.update({
      where: { id },
      data: { contact: phone }
    });

    const { logAndEmitActivity } = await import('@/lib/events');
    await logAndEmitActivity({
      salesmanId: salesman.id,
      salesmanName: salesman.name,
      type: 'ONLINE', // Generic type or could add new one like PROFILE_UPDATE
      description: `Updated phone number for ${customer.customerName}`,
    });

    revalidatePath(`/dashboard/salesman/customers/${id}`);
    revalidatePath('/dashboard/admin/customers'); // Reflect in admin
    revalidatePath(`/dashboard/admin/customers/${id}`);
    
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to update phone number' };
  }
}
