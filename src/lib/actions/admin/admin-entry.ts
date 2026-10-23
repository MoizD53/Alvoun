'use server';

import { prisma } from '@/lib/db';
import { requireAdminSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCurrentKolkataTime, getKolkataDateString } from '@/lib/time';

const AdminEntrySchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date YYYY-MM-DD required'),
  items: z.array(z.object({
    productId: z.string(),
    crates: z.number().int().min(0),
    actualRate: z.number().min(0).optional(),
  })),
  receivedAmount: z.number().min(0).default(0), // in Rupees
  paymentMethod: z.string().default('CASH'),
  remarks: z.string().optional().nullable(),
});

/**
 * Fetch all workspace data for Admin Entry on a given date.
 * Loads:
 * - Active products with standard rates
 * - Active customers with applicable custom rates and calculated balances
 * - Saved sales and payments recorded on selected date
 */
export async function getAdminEntryWorkspaceData(selectedDateStr?: string) {
  await requireAdminSession();

  const now = getCurrentKolkataTime();
  const todayStr = getKolkataDateString(now);
  let targetDate = selectedDateStr && /^\d{4}-\d{2}-\d{2}$/.test(selectedDateStr)
    ? selectedDateStr
    : todayStr;

  // Enforce no future dates
  if (targetDate > todayStr) {
    targetDate = todayStr;
  }

  const startOfDay = new Date(`${targetDate}T00:00:00+05:30`);
  const endOfDay = new Date(`${targetDate}T23:59:59.999+05:30`);

  const [products, rawCustomers, salesOnDate, paymentsOnDate, defaultSalesman] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      include: {
        rates: { orderBy: { minQuantity: 'asc' } },
      },
      orderBy: { bottlesPerCrate: 'asc' }, // 1L, 500ml, 250ml, 2L
    }),
    prisma.customer.findMany({
      where: { status: 'ACTIVE' },
      include: {
        route: true,
        area: true,
        customerRates: true,
        sales: { select: { totalAmount: true } },
        payments: { select: { amount: true } },
      },
      orderBy: { customerName: 'asc' },
    }),
    prisma.sale.findMany({
      where: {
        saleDate: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        customer: { include: { route: true, area: true } },
        items: { include: { product: true } },
        salesman: true,
      },
      orderBy: { saleDate: 'desc' },
    }),
    prisma.payment.findMany({
      where: {
        paymentDate: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        customer: { include: { route: true, area: true } },
        salesman: true,
      },
      orderBy: { paymentDate: 'desc' },
    }),
    prisma.salesman.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  // Transform customers with live outstanding balance & custom product rates
  const customers = rawCustomers.map((c) => {
    const totalSales = c.sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalPayments = c.payments.reduce((sum, p) => sum + p.amount, 0);
    const openingBase = c.openingBalanceType === 'DEBIT' ? c.openingBalance : -c.openingBalance;
    const currentOutstandingPaise = openingBase + totalSales - totalPayments;

    const rateMap: Record<string, number> = {};
    (c.customerRates || []).forEach((pr: any) => {
      rateMap[pr.productId] = pr.rate;
    });

    return {
      id: c.id,
      customerName: c.customerName,
      firmName: c.firmName,
      code: c.code,
      contact: c.contact,
      address: c.address,
      routeName: c.route?.name || 'Direct / Unassigned',
      areaName: c.area?.name || 'General Sector',
      salesmanId: c.salesmanId,
      currentOutstandingPaise,
      rates: rateMap,
    };
  });

  // Consolidate saved entries for the selected date by Customer
  const customerEntryMap = new Map<string, any>();

  salesOnDate.forEach((s) => {
    if (!customerEntryMap.has(s.customerId)) {
      customerEntryMap.set(s.customerId, {
        customerId: s.customerId,
        customerName: s.customer?.customerName || 'Unknown Customer',
        firmName: s.customer?.firmName || null,
        customerCode: s.customer?.code || null,
        routeName: s.customer?.route?.name || 'Unassigned Route',
        areaName: s.customer?.area?.name || 'General Area',
        sales: [] as any[],
        payments: [] as any[],
        totalBillPaise: 0,
        totalReceivedPaise: 0,
        productQuantities: {} as Record<string, number>,
        totalPKGs: 0,
        remarks: [] as string[],
        paymentMethods: new Set<string>(),
        recordedAt: s.saleDate,
      });
    }

    const entry = customerEntryMap.get(s.customerId);
    entry.sales.push(s);
    entry.totalBillPaise += s.totalAmount;

    s.items.forEach((item) => {
      entry.productQuantities[item.productId] = (entry.productQuantities[item.productId] || 0) + item.crates;
      entry.totalPKGs += item.crates;
    });
  });

  paymentsOnDate.forEach((p) => {
    if (!customerEntryMap.has(p.customerId)) {
      customerEntryMap.set(p.customerId, {
        customerId: p.customerId,
        customerName: p.customer?.customerName || 'Unknown Customer',
        firmName: p.customer?.firmName || null,
        customerCode: p.customer?.code || null,
        routeName: p.customer?.route?.name || 'Unassigned Route',
        areaName: p.customer?.area?.name || 'General Area',
        sales: [] as any[],
        payments: [] as any[],
        totalBillPaise: 0,
        totalReceivedPaise: 0,
        productQuantities: {} as Record<string, number>,
        totalPKGs: 0,
        remarks: [] as string[],
        paymentMethods: new Set<string>(),
        recordedAt: p.paymentDate,
      });
    }

    const entry = customerEntryMap.get(p.customerId);
    entry.payments.push(p);
    entry.totalReceivedPaise += p.amount;
    if (p.paymentMethod) entry.paymentMethods.add(p.paymentMethod);
    if (p.referenceNumber) entry.remarks.push(p.referenceNumber);
  });

  const savedEntries = Array.from(customerEntryMap.values()).map((e) => ({
    ...e,
    netDuePaise: e.totalBillPaise - e.totalReceivedPaise,
    paymentMethods: Array.from(e.paymentMethods),
    remarks: e.remarks.filter(Boolean).join(' • '),
  }));

  // Day summary on targetDate
  const daySummary = {
    totalSalesPaise: savedEntries.reduce((sum, e) => sum + e.totalBillPaise, 0),
    totalReceivedPaise: savedEntries.reduce((sum, e) => sum + e.totalReceivedPaise, 0),
    netDuePaise: savedEntries.reduce((sum, e) => sum + e.netDuePaise, 0),
    totalPKGs: savedEntries.reduce((sum, e) => sum + e.totalPKGs, 0),
    accountsCount: savedEntries.length,
  };

  return {
    targetDate,
    products,
    customers,
    savedEntries,
    daySummary,
    defaultSalesmanId: defaultSalesman?.id || 'cmvigu4wxsq760uma',
  };
}

/**
 * Record a full transaction (Sale + Payment) from Admin Entry.
 * Preserves the exact specified date and updates the Customer record immediately.
 */
export async function saveAdminEntryTransaction(data: {
  customerId: string;
  date: string;
  items: { productId: string; crates: number; actualRate?: number }[];
  receivedAmount: number; // in Rupees
  paymentMethod?: string;
  remarks?: string;
}) {
  const session = await requireAdminSession();

  const parsed = AdminEntrySchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { customerId, date, items, receivedAmount, paymentMethod, remarks } = parsed.data;

  // Strict enforcement: Never allow future dates (Asia/Kolkata timezone)
  const now = getCurrentKolkataTime();
  const todayStr = getKolkataDateString(now);
  if (date > todayStr) {
    return { error: 'Future dates are not allowed. You can only record transactions for today or past dates.' };
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { customerRates: true },
  });

  if (!customer) {
    return { error: 'Customer not found' };
  }

  // Resolve salesman: customer's salesman or fallback to first active salesman
  let salesmanId = customer.salesmanId;
  if (!salesmanId) {
    const fallback = await prisma.salesman.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
    if (!fallback) {
      return { error: 'No active salesman record found in system' };
    }
    salesmanId = fallback.id;
  }

  // Use midday on the exact target date to avoid timezone shift
  const targetDateTime = new Date(`${date}T12:00:00+05:30`);

  // Filter valid products with quantity > 0
  const validItems = items.filter((i) => i.crates > 0);
  const paymentPaise = Math.round((receivedAmount || 0) * 100);

  if (validItems.length === 0 && paymentPaise <= 0) {
    return { error: 'Please enter at least one product quantity or a payment amount' };
  }

  try {
    const customRateMap = new Map((customer.customerRates || []).map((pr: any) => [pr.productId, pr.rate]));
    const products = await prisma.product.findMany({
      where: { id: { in: validItems.map((i) => i.productId) } },
      include: { rates: { orderBy: { minQuantity: 'asc' } } },
    });

    let totalSaleAmount = 0;
    const saleItemsData: any[] = [];

    for (const item of validItems) {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) continue;

      const standardRate = prod.rates[0]?.rate ?? 0;
      // If customer has a custom configured rate, use it; otherwise use standard rate or admin override
      const customOverride = typeof item.actualRate === 'number' && item.actualRate > 0
        ? Math.round(item.actualRate * 100)
        : null;
      const effectiveRate = customOverride !== null
        ? customOverride
        : customRateMap.has(item.productId)
        ? customRateMap.get(item.productId)!
        : standardRate;

      const lineAmount = item.crates * effectiveRate;
      totalSaleAmount += lineAmount;

      saleItemsData.push({
        productId: item.productId,
        crates: item.crates,
        looseBottles: 0,
        standardRate,
        actualRate: effectiveRate,
        amount: lineAmount,
      });
    }

    let createdSaleId: string | null = null;
    let createdPaymentId: string | null = null;

    await prisma.$transaction(async (tx) => {
      // 1. Create Sale if products were entered
      if (validItems.length > 0 && totalSaleAmount > 0) {
        const sale = await tx.sale.create({
          data: {
            customerId,
            salesmanId: salesmanId!,
            totalAmount: totalSaleAmount,
            saleDate: targetDateTime,
            items: {
              create: saleItemsData,
            },
          },
        });
        createdSaleId = sale.id;
      }

      // 2. Create Payment if collection amount was entered
      if (paymentPaise > 0) {
        const payment = await tx.payment.create({
          data: {
            customerId,
            salesmanId: salesmanId!,
            amount: paymentPaise,
            paymentMethod: paymentMethod || 'CASH',
            referenceNumber: remarks?.trim() || 'Admin Entry',
            paymentDate: targetDateTime,
          },
        });
        createdPaymentId = payment.id;
      }
    });

    // Revalidate customer directory, customer workspace, daily reports, and dashboard
    try {
      revalidatePath('/dashboard/admin/entry');
      revalidatePath('/dashboard/admin/customers');
      revalidatePath(`/dashboard/admin/customers/${customerId}`);
      revalidatePath('/dashboard/admin/reports/daily');
      revalidatePath('/dashboard/admin/reports/outstanding');
      revalidatePath('/dashboard/admin');
    } catch {}

    return {
      success: true,
      saleId: createdSaleId,
      paymentId: createdPaymentId,
      totalSaleAmount,
      totalPaymentAmount: paymentPaise,
    };
  } catch (error: any) {
    console.error('Error saving admin entry:', error);
    return { error: error.message || 'Failed to save admin entry transaction' };
  }
}

/**
 * Reverse/delete an entry transaction recorded through Admin Entry.
 */
export async function reverseAdminEntryTransaction(data: {
  saleIds?: string[];
  paymentIds?: string[];
  customerId: string;
}) {
  await requireAdminSession();

  try {
    await prisma.$transaction(async (tx) => {
      if (data.saleIds && data.saleIds.length > 0) {
        await tx.saleItem.deleteMany({
          where: { saleId: { in: data.saleIds } },
        });
        await tx.sale.deleteMany({
          where: { id: { in: data.saleIds } },
        });
      }

      if (data.paymentIds && data.paymentIds.length > 0) {
        await tx.payment.deleteMany({
          where: { id: { in: data.paymentIds } },
        });
      }
    });

    try {
      revalidatePath('/dashboard/admin/entry');
      revalidatePath('/dashboard/admin/customers');
      revalidatePath(`/dashboard/admin/customers/${data.customerId}`);
      revalidatePath('/dashboard/admin/reports/daily');
      revalidatePath('/dashboard/admin/reports/outstanding');
      revalidatePath('/dashboard/admin');
    } catch {}

    return { success: true };
  } catch (error: any) {
    console.error('Error reversing admin entry:', error);
    return { error: error.message || 'Failed to reverse transaction' };
  }
}
