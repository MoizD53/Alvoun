'use server';

import { prisma } from '@/lib/db';
import { requireActiveSalesmanSession } from '@/lib/session';
import { getKolkataDateOnly, getCurrentKolkataTime, getKolkataDateString } from '@/lib/time';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const StandalonePaymentSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  amount: z.number().int().min(0).optional(),
  method: z.string().optional(),
  cashAmount: z.number().int().min(0).optional(),
  upiAmount: z.number().int().min(0).optional(),
  paymentDateStr: z.string().optional(),
  referenceNumber: z.string().optional(),
  remarks: z.string().optional(),
});

export async function createStandalonePayment(data: {
  customerId: string;
  amount?: number;
  method?: string;
  cashAmount?: number;
  upiAmount?: number;
  paymentDateStr?: string;
  referenceNumber?: string;
  remarks?: string;
}) {
  const { salesman } = await requireActiveSalesmanSession();
  const salesmanId = salesman.id;

  const parsed = StandalonePaymentSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const { customerId, amount = 0, method = 'Cash', cashAmount = 0, upiAmount = 0, paymentDateStr, referenceNumber, remarks } = parsed.data;

  // Calculate current customer outstanding
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      sales: { select: { totalAmount: true } },
      payments: { select: { amount: true } },
    }
  });

  if (!customer) {
    throw new Error('Customer not found');
  }

  const totalSales = customer.sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalPayments = customer.payments.reduce((sum, p) => sum + p.amount, 0);
  const previousOutstanding = (customer.openingBalanceType === 'DEBIT' ? customer.openingBalance : -customer.openingBalance) + totalSales - totalPayments;

  if (previousOutstanding <= 0) {
    throw new Error('Customer does not have an outstanding debit balance to collect against.');
  }

  // Determine amounts
  let finalCash = cashAmount;
  let finalUpi = upiAmount;
  let finalOther = 0;
  let otherMethod = method;

  if (finalCash === 0 && finalUpi === 0 && amount > 0) {
    if (method === 'UPI') {
      finalUpi = amount;
    } else if (method === 'Cash') {
      finalCash = amount;
    } else {
      finalOther = amount;
      otherMethod = method;
    }
  }

  const totalCollected = finalCash + finalUpi + finalOther;
  if (totalCollected <= 0) {
    throw new Error('Please enter a collection amount greater than zero.');
  }

  const todayDateStr = getKolkataDateString(getCurrentKolkataTime()).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const receiptNumber = `ALV-REC-${todayDateStr}-${randomSuffix}`;
  const paymentDate = paymentDateStr ? new Date(`${paymentDateStr}T12:00:00Z`) : getCurrentKolkataTime();
  const customRef = referenceNumber && referenceNumber.trim() ? referenceNumber.trim() : receiptNumber;

  // Execute in transaction
  await prisma.$transaction(async (tx) => {
    if (finalCash > 0) {
      await tx.payment.create({
        data: {
          customerId,
          salesmanId,
          amount: finalCash,
          paymentMethod: 'Cash',
          referenceNumber: customRef,
          paymentDate,
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
          referenceNumber: customRef,
          paymentDate,
        }
      });
    }

    if (finalOther > 0) {
      await tx.payment.create({
        data: {
          customerId,
          salesmanId,
          amount: finalOther,
          paymentMethod: otherMethod,
          referenceNumber: customRef,
          paymentDate,
        }
      });
    }
  });

  const remainingOutstanding = previousOutstanding - totalCollected;

  try {
    const { logAndEmitActivity } = await import('@/lib/events');
    await logAndEmitActivity({
      salesmanId,
      salesmanName: salesman.name,
      type: 'PAYMENT',
      description: `Collected ₹${(totalCollected / 100).toFixed(2)} [Receipt #${receiptNumber}] at ${customer.customerName}`,
      metadata: { receiptNumber, amount: totalCollected, customerId, cash: finalCash, upi: finalUpi, other: finalOther }
    }).catch(() => {});
  } catch {}

  revalidatePath(`/dashboard/salesman/customers/${customerId}`);
  revalidatePath('/dashboard/salesman/customers');
  revalidatePath('/dashboard/admin/reports/daily');
  revalidatePath('/dashboard/admin/reports/outstanding');
  revalidatePath('/dashboard/admin');

  const customerCode = `CUST-${customerId.slice(-4).toUpperCase()}`;

  return {
    success: true,
    receipt: {
      receiptNumber,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      customerId,
      customerName: customer.customerName,
      customerCode,
      customerPhone: customer.contact || '',
      salesmanName: salesman.name,
      salesmanCode: salesman.employeeCode,
      previousOutstanding,
      totalCollected,
      remainingOutstanding,
      cashAmount: finalCash,
      upiAmount: finalUpi,
      otherAmount: finalOther,
      paymentMethod: finalCash > 0 && finalUpi > 0 ? 'Split (Cash + UPI)' : (finalCash > 0 ? 'Cash' : (finalUpi > 0 ? 'UPI' : otherMethod)),
      referenceNumber: customRef,
      remarks: remarks || '',
    }
  };
}
