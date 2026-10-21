'use server';

import { prisma } from '@/lib/db';
import { requireActiveSalesmanSession } from '@/lib/session';
import { getKolkataDateOnly, getCurrentKolkataTime } from '@/lib/time';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const StandalonePaymentSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  amount: z.number().int().min(0).optional(),
  method: z.string().optional(),
  cashAmount: z.number().int().min(0).optional(),
  upiAmount: z.number().int().min(0).optional(),
});

export async function createStandalonePayment(data: {
  customerId: string;
  amount?: number;
  method?: string;
  cashAmount?: number;
  upiAmount?: number;
}) {
  const { salesman } = await requireActiveSalesmanSession();
  const salesmanId = salesman.id;

  const parsed = StandalonePaymentSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const { customerId, amount = 0, method = 'Cash', cashAmount = 0, upiAmount = 0 } = parsed.data;
  const today = getKolkataDateOnly(getCurrentKolkataTime());

  // Determine split payments
  let finalCash = cashAmount;
  let finalUpi = upiAmount;

  if (finalCash === 0 && finalUpi === 0 && amount > 0) {
    if (method === 'UPI') {
      finalUpi = amount;
    } else {
      finalCash = amount;
    }
  }

  const totalAmount = finalCash + finalUpi;
  if (totalAmount <= 0) {
    throw new Error('Please enter a collection amount greater than zero.');
  }

  // Verify ownership
  const customer = await prisma.customer.findUnique({
    where: { id: customerId }
  });
  if (!customer || customer.salesmanId !== salesmanId) {
    throw new Error('Unauthorized customer access');
  }

  // Execute in transaction
  await prisma.$transaction(async (tx) => {
    if (finalCash > 0) {
      await tx.payment.create({
        data: {
          customerId,
          salesmanId,
          amount: finalCash,
          paymentMethod: 'Cash',
          paymentDate: today,
        }
      });
    }

    if (finalUpi > 0) {
      await tx.payment.create({
        data: {
          customerId,
          salesmanId,
          amount: finalUpi,
          paymentMethod: 'UPI',
          paymentDate: today,
        }
      });
    }
  });

  const { logAndEmitActivity } = await import('@/lib/events');
  await logAndEmitActivity({
    salesmanId,
    salesmanName: salesman.name,
    type: 'PAYMENT',
    description: `Collected ₹${(totalAmount / 100).toFixed(2)} (${finalCash > 0 ? `Cash ₹${(finalCash / 100).toFixed(2)}` : ''}${finalCash > 0 && finalUpi > 0 ? ' + ' : ''}${finalUpi > 0 ? `UPI ₹${(finalUpi / 100).toFixed(2)}` : ''}) at ${customer.customerName}`,
    metadata: { amount: totalAmount, cash: finalCash, upi: finalUpi }
  }).catch(() => {});

  revalidatePath(`/dashboard/salesman/customers/${customerId}`);
  revalidatePath('/dashboard/admin/reports/daily');
  revalidatePath('/dashboard/admin/reports/outstanding');
  revalidatePath('/dashboard/admin');

  return { success: true, totalAmount, cash: finalCash, upi: finalUpi };
}
