'use server';

import { prisma } from '@/lib/db';
import { requireAdminSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getKolkataStartOfDay, getKolkataEndOfDay, getCurrentKolkataTime } from '@/lib/time';

const ExpenseSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  title: z.string().min(1, 'Title is required'),
  amountPaise: z.number().int().positive('Amount must be positive'),
  expenseDate: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE']).default('CASH'),
  recipient: z.string().optional().nullable(),
  referenceNo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function getExpenses(filters?: {
  category?: string;
  startDate?: string;
  endDate?: string;
}) {
  await requireAdminSession();

  const where: any = {};

  if (filters?.category && filters.category !== 'ALL') {
    where.category = filters.category;
  }

  if (filters?.startDate || filters?.endDate) {
    where.expenseDate = {};
    if (filters.startDate) {
      where.expenseDate.gte = getKolkataStartOfDay(filters.startDate);
    }
    if (filters.endDate) {
      where.expenseDate.lte = getKolkataEndOfDay(filters.endDate);
    }
  }

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { expenseDate: 'desc' },
  });

  const totalAmountPaise = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Group by category
  const categoryTotals: Record<string, number> = {};
  for (const exp of expenses) {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
  }

  return {
    expenses,
    totalAmountPaise,
    categoryTotals,
    count: expenses.length,
  };
}

export async function createExpense(data: {
  category: string;
  title: string;
  amountPaise: number;
  expenseDate?: string;
  paymentMethod?: string;
  recipient?: string;
  referenceNo?: string;
  notes?: string;
}) {
  const session = await requireAdminSession();

  const parsed = ExpenseSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const {
    category,
    title,
    amountPaise,
    expenseDate,
    paymentMethod,
    recipient,
    referenceNo,
    notes,
  } = parsed.data;

  const dateToUse = expenseDate
    ? new Date(`${expenseDate}T12:00:00+05:30`)
    : getCurrentKolkataTime();

  try {
    const expense = await prisma.expense.create({
      data: {
        category: category.trim().toUpperCase(),
        title,
        amount: amountPaise,
        expenseDate: dateToUse,
        paymentMethod: paymentMethod || 'CASH',
        recipient: recipient || null,
        referenceNo: referenceNo || null,
        notes: notes || null,
        recordedBy: session.user.name || 'Admin',
      },
    });

    try {
      revalidatePath('/dashboard/admin/expenses');
      revalidatePath('/dashboard/admin');
      revalidatePath('/dashboard/admin/cashflow');
      revalidatePath('/dashboard/admin/reports/monthly');
    } catch {}

    return { success: true, id: expense.id };
  } catch (error: any) {
    return { error: error.message || 'Failed to record expense' };
  }
}

export async function updateExpense(
  id: string,
  data: {
    category: string;
    title: string;
    amountPaise: number;
    expenseDate?: string;
    paymentMethod?: string;
    recipient?: string;
    referenceNo?: string;
    notes?: string;
  }
) {
  await requireAdminSession();

  const parsed = ExpenseSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const {
    category,
    title,
    amountPaise,
    expenseDate,
    paymentMethod,
    recipient,
    referenceNo,
    notes,
  } = parsed.data;

  const dateToUse = expenseDate
    ? new Date(`${expenseDate}T12:00:00+05:30`)
    : getCurrentKolkataTime();

  try {
    const updated = await prisma.expense.update({
      where: { id },
      data: {
        category: category.trim().toUpperCase(),
        title,
        amount: amountPaise,
        expenseDate: dateToUse,
        paymentMethod: paymentMethod || 'CASH',
        recipient: recipient || null,
        referenceNo: referenceNo || null,
        notes: notes || null,
      },
    });

    try {
      revalidatePath('/dashboard/admin/expenses');
      revalidatePath('/dashboard/admin');
      revalidatePath('/dashboard/admin/cashflow');
      revalidatePath('/dashboard/admin/reports/monthly');
    } catch {}

    return { success: true, id: updated.id };
  } catch (error: any) {
    return { error: error.message || 'Failed to update expense' };
  }
}

export async function deleteExpense(id: string) {
  await requireAdminSession();

  try {
    await prisma.expense.delete({ where: { id } });
    try {
      revalidatePath('/dashboard/admin/expenses');
      revalidatePath('/dashboard/admin');
      revalidatePath('/dashboard/admin/cashflow');
      revalidatePath('/dashboard/admin/reports/monthly');
    } catch {}
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete expense' };
  }
}
