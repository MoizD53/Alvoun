'use server';

import { prisma } from '@/lib/db';
import { requireActiveSalesmanSession } from '@/lib/session';
import { getKolkataDateOnly, getCurrentKolkataTime } from '@/lib/time';
import { z } from 'zod';

const StandalonePaymentSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  amount: z.number().int('Amount must be an integer in paise').positive('Amount must be greater than zero'),
  method: z.string().min(1, 'Payment method is required'),
});

export async function createStandalonePayment(data: { customerId: string, amount: number, method: string }) {
  const { salesman } = await requireActiveSalesmanSession();
  const salesmanId = salesman.id;

  const parsed = StandalonePaymentSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const { customerId, amount, method } = parsed.data;
  const today = getKolkataDateOnly(getCurrentKolkataTime());

  // Verify ownership
  const customer = await prisma.customer.findUnique({
    where: { id: customerId }
  });
  if (!customer || customer.salesmanId !== salesmanId) {
    throw new Error('Unauthorized customer access');
  }

  // Create payment
  await prisma.payment.create({
    data: {
      customerId,
      salesmanId,
      amount,
      paymentMethod: method,
      paymentDate: today
    }
  });

  const { logAndEmitActivity } = await import('@/lib/events');
  await logAndEmitActivity({
    salesmanId,
    salesmanName: salesman.name,
    type: 'PAYMENT',
    description: `Collected ₹${(data.amount / 100).toFixed(2)} at ${customer.customerName}`,
    metadata: { amount: data.amount }
  });

  return { success: true };
}
