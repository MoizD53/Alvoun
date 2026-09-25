'use server';

import { prisma } from '@/lib/db';
import { requireActiveSalesmanSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';
import { getKolkataStartOfDay, getKolkataEndOfDay, formatKolkataVisitTime } from '@/lib/time';

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
      visits: { where: { salesmanId }, orderBy: { createdAt: 'desc' } }
    },
    orderBy: { route: { name: 'asc' } }
  });

  const startOfDay = getKolkataStartOfDay();
  const endOfDay = getKolkataEndOfDay();

  // Calculate dynamic outstanding and today's visit status
  return customers.map(c => {
    const totalSales = c.sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalPayments = c.payments.reduce((sum, pay) => sum + pay.amount, 0);
    const outstanding = (c.openingBalanceType === 'DEBIT' ? c.openingBalance : -c.openingBalance) + totalSales - totalPayments;
    
    // Find today's completed visit by this salesman
    const todayVisit = c.visits.find(v => 
      v.salesmanId === salesmanId && 
      v.status === 'COMPLETED' && 
      v.createdAt >= startOfDay && 
      v.createdAt <= endOfDay
    );

    let todayVisitData: any = null;
    if (todayVisit) {
      const todaySales = c.sales.filter(s => 
        s.salesmanId === salesmanId && 
        s.saleDate >= startOfDay && 
        s.saleDate <= endOfDay
      );
      const todaySale = todaySales[0];

      const todayPayments = c.payments.filter(p => 
        p.salesmanId === salesmanId && 
        p.paymentDate >= startOfDay && 
        p.paymentDate <= endOfDay
      );

      const saleAmount = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
      const receivedAmount = todayPayments.reduce((sum, p) => sum + p.amount, 0);
      const dueFromSale = Math.max(0, saleAmount - receivedAmount);

      todayVisitData = {
        visitId: todayVisit.id,
        visitedAt: todayVisit.createdAt.toISOString(),
        formattedTime: formatKolkataVisitTime(todayVisit.createdAt),
        isNoSale: !todaySale,
        noSaleReason: todayVisit.noSaleReason || (todaySale ? null : 'No sale'),
        saleAmount,
        receivedAmount,
        dueFromSale,
        items: todaySale?.items.map(item => ({
          productId: item.productId,
          productName: item.product.name,
          crates: item.crates,
          looseBottles: item.looseBottles,
          rate: item.actualRate,
          amount: item.amount
        })) || []
      };
    }

    return {
      ...c,
      outstanding,
      isVisitedToday: !!todayVisitData,
      todayVisit: todayVisitData
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
      sales: { 
        orderBy: { saleDate: 'desc' }, 
        include: { items: { include: { product: true } } } 
      },
      payments: { orderBy: { paymentDate: 'desc' } },
      visits: { where: { salesmanId }, orderBy: { createdAt: 'desc' } }
    }
  });

  if (!customer) throw new Error('Customer not found');
  if (customer.salesmanId !== salesmanId) throw new Error('Unauthorized access to customer');

  const totalSales = customer.sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalPayments = customer.payments.reduce((sum, pay) => sum + pay.amount, 0);
  const outstanding = (customer.openingBalanceType === 'DEBIT' ? customer.openingBalance : -customer.openingBalance) + totalSales - totalPayments;

  const startOfDay = getKolkataStartOfDay();
  const endOfDay = getKolkataEndOfDay();

  const todayVisit = customer.visits.find(v => 
    v.salesmanId === salesmanId && 
    v.status === 'COMPLETED' && 
    v.createdAt >= startOfDay && 
    v.createdAt <= endOfDay
  );

  let todayVisitData: any = null;
  if (todayVisit) {
    const todaySales = customer.sales.filter(s => 
      s.salesmanId === salesmanId && 
      s.saleDate >= startOfDay && 
      s.saleDate <= endOfDay
    );
    const todaySale = todaySales[0];

    const todayPayments = customer.payments.filter(p => 
      p.salesmanId === salesmanId && 
      p.paymentDate >= startOfDay && 
      p.paymentDate <= endOfDay
    );

    const saleAmount = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
    const receivedAmount = todayPayments.reduce((sum, p) => sum + p.amount, 0);
    const dueFromSale = Math.max(0, saleAmount - receivedAmount);

    todayVisitData = {
      visitId: todayVisit.id,
      visitedAt: todayVisit.createdAt.toISOString(),
      formattedTime: formatKolkataVisitTime(todayVisit.createdAt),
      isNoSale: !todaySale,
      noSaleReason: todayVisit.noSaleReason || (todaySale ? null : 'No sale'),
      saleAmount,
      receivedAmount,
      dueFromSale,
      items: todaySale?.items.map(item => ({
        productId: item.productId,
        productName: item.product.name,
        crates: item.crates,
        looseBottles: item.looseBottles,
        rate: item.actualRate,
        amount: item.amount
      })) || []
    };
  }

  return { 
    ...customer, 
    outstanding,
    isVisitedToday: !!todayVisitData,
    todayVisit: todayVisitData
  };
}
export async function updateCustomerPhone(id: string, phone: string) {
  try {
    const { salesman } = await requireActiveSalesmanSession();
    
    const cleaned = (phone || '').trim();
    if (!cleaned) {
      return { error: 'Phone number is required' };
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(cleaned) && !/^\d{10}$/.test(cleaned)) {
      return { error: 'Please enter a valid 10-digit mobile number' };
    }

    // Verify customer belongs to salesman
    const customer = await prisma.customer.findUnique({
      where: { id }
    });

    if (!customer) return { error: 'Customer not found' };
    if (customer.salesmanId !== salesman.id) return { error: 'Unauthorized to update this customer' };

    const previousPhone = customer.contact;

    await prisma.customer.update({
      where: { id },
      data: { contact: cleaned }
    });

    const { logAndEmitActivity } = await import('@/lib/events');
    await logAndEmitActivity({
      salesmanId: salesman.id,
      salesmanName: salesman.name,
      type: 'CUSTOMER_PHONE_UPDATED',
      description: `Updated phone number for ${customer.customerName}`,
      metadata: { 
        previousPhone: previousPhone || 'Not available', 
        newPhone: cleaned 
      }
    });

    revalidatePath(`/dashboard/salesman/customers/${id}`);
    revalidatePath('/dashboard/salesman/customers');
    revalidatePath('/dashboard/admin/customers');
    revalidatePath(`/dashboard/admin/customers/${id}`);
    revalidatePath('/dashboard/admin/activity');
    
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to update phone number' };
  }
}
