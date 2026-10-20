'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getCurrentKolkataTime, getKolkataDateOnly } from '@/lib/time';

export interface AdminPaymentPayload {
  customerId: string;
  amountPaise: number;
  paymentMethod: string;
  paymentDateStr?: string; // YYYY-MM-DD
  notes?: string;
}

export async function recordAdminPayment(payload: AdminPaymentPayload) {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN')) {
    throw new Error('Unauthorized');
  }

  const { customerId, amountPaise, paymentMethod, paymentDateStr, notes } = payload;

  if (!customerId) {
    throw new Error('Customer is required');
  }

  if (!amountPaise || amountPaise <= 0 || !Number.isInteger(amountPaise)) {
    throw new Error('Valid payment amount in paise is required');
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { salesman: true },
  });

  if (!customer) {
    throw new Error('Customer not found');
  }

  // Determine effective date in Asia/Kolkata
  const paymentDate = paymentDateStr
    ? new Date(`${paymentDateStr}T12:00:00+05:30`)
    : getKolkataDateOnly(getCurrentKolkataTime());

  // Use customer's assigned salesman if exists, otherwise fallback to active or available salesman
  let salesmanId = customer.salesmanId;
  if (!salesmanId) {
    const activeSalesman = await prisma.salesman.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    if (activeSalesman) {
      salesmanId = activeSalesman.id;
    } else {
      const anySalesman = await prisma.salesman.findFirst({
        select: { id: true },
      });
      if (anySalesman) {
        salesmanId = anySalesman.id;
      }
    }
  }

  if (!salesmanId) {
    throw new Error('A registered field salesman is required to record payment vouchers. Please add a salesman first.');
  }

  const payment = await prisma.payment.create({
    data: {
      customerId,
      salesmanId,
      amount: amountPaise,
      paymentMethod: paymentMethod || 'Cash',
      paymentDate,
    },
  });

  try {
    const { logAndEmitActivity } = await import('@/lib/events');
    await logAndEmitActivity({
      salesmanId,
      salesmanName: session.user.name || 'Admin',
      type: 'PAYMENT',
      description: `Admin recorded collection of ₹${(amountPaise / 100).toFixed(2)} for ${customer.customerName} (${paymentMethod || 'Cash'})`,
      metadata: { 
        amount: amountPaise, 
        recordedBy: session.user.name, 
        notes: notes || undefined 
      },
    });
  } catch (err) {
    console.error('Error logging payment event:', err);
  }

  revalidatePath('/dashboard/admin');
  revalidatePath('/dashboard/admin/reports/daily');
  revalidatePath('/dashboard/admin/reports/outstanding');
  revalidatePath(`/dashboard/admin/customers/${customerId}`);

  return {
    success: true,
    paymentId: payment.id,
    customerName: customer.customerName,
    amountPaise,
  };
}

/**
 * Quick search customers for payment modal selection
 */
export async function getCustomersForPayment(query: string = '') {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN')) {
    throw new Error('Unauthorized');
  }

  const cleanQuery = query.trim();
  const customers = await prisma.customer.findMany({
    where: cleanQuery ? {
      OR: [
        { customerName: { contains: cleanQuery } },
        { contact: { contains: cleanQuery } },
      ],
      status: 'ACTIVE',
    } : {
      status: 'ACTIVE',
    },
    take: 12,
    orderBy: { customerName: 'asc' },
    select: {
      id: true,
      customerName: true,
      contact: true,
      area: { select: { name: true } },
      route: { select: { name: true } },
    },
  });

  return customers.map(c => ({
    id: c.id,
    name: c.customerName,
    contact: c.contact,
    areaName: c.area?.name || c.route?.name || 'Unassigned',
  }));
}
