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

const BatchRowSchema = z.object({
  customerId: z.string().min(1),
  pkg1L: z.number().int().min(0).default(0),
  pkg500ml: z.number().int().min(0).default(0),
  pkg250ml: z.number().int().min(0).default(0),
  cashAmount: z.number().min(0).default(0), // in Rupees
  upiAmount: z.number().min(0).default(0), // in Rupees
  receivedAmount: z.number().min(0).default(0), // fallback total in Rupees
  paymentMethod: z.string().default('CASH'),
  remarks: z.string().optional().nullable(),
  existingSaleIds: z.array(z.string()).default([]),
  existingPaymentIds: z.array(z.string()).default([]),
  isModified: z.boolean().default(false),
});

const AdminEntryBatchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date YYYY-MM-DD required'),
  entries: z.array(BatchRowSchema),
});

/**
 * Fetch all workspace data for Admin Entry Register Sheet on a given date.
 */
export async function getAdminEntryWorkspaceData(selectedDateStr?: string) {
  await requireAdminSession();

  const now = getCurrentKolkataTime();
  const todayStr = getKolkataDateString(now);
  let targetDate = selectedDateStr && /^\d{4}-\d{2}-\d{2}$/.test(selectedDateStr)
    ? selectedDateStr
    : todayStr;

  // Enforce no future dates (Asia/Kolkata timezone)
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
      orderBy: { bottlesPerCrate: 'asc' },
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

  // Identify core 3 products (1 Litre, 500 ml, 250 ml)
  const prod1L = products.find((p) => {
    const n = p.name.toLowerCase();
    return n.includes('1 litre') || n.includes('1l') || n === '1000ml';
  }) || products[1] || products[0];

  const prod500ml = products.find((p) => {
    const n = p.name.toLowerCase();
    return n.includes('500 ml') || n.includes('500ml') || n === '0.5l';
  }) || products[2] || products[0];

  const prod250ml = products.find((p) => {
    const n = p.name.toLowerCase();
    return n.includes('250 ml') || n.includes('250ml') || n === '0.25l';
  }) || products[3] || products[0];

  // Group sales & payments on targetDate by customerId
  const customerDaySalesMap = new Map<string, {
    totalSalesPaise: number;
    pkg1L: number;
    pkg500ml: number;
    pkg250ml: number;
    saleIds: string[];
    remarks: string[];
  }>();

  salesOnDate.forEach((s) => {
    if (!customerDaySalesMap.has(s.customerId)) {
      customerDaySalesMap.set(s.customerId, {
        totalSalesPaise: 0,
        pkg1L: 0,
        pkg500ml: 0,
        pkg250ml: 0,
        saleIds: [],
        remarks: [],
      });
    }
    const entry = customerDaySalesMap.get(s.customerId)!;
    entry.totalSalesPaise += s.totalAmount;
    entry.saleIds.push(s.id);
    s.items.forEach((item) => {
      if (item.productId === prod1L?.id) entry.pkg1L += item.crates;
      else if (item.productId === prod500ml?.id) entry.pkg500ml += item.crates;
      else if (item.productId === prod250ml?.id) entry.pkg250ml += item.crates;
    });
  });

  const customerDayPaymentsMap = new Map<string, {
    totalPaymentsPaise: number;
    cashPaise: number;
    upiPaise: number;
    paymentIds: string[];
    remarks: string[];
    methods: string[];
  }>();

  paymentsOnDate.forEach((p) => {
    if (!customerDayPaymentsMap.has(p.customerId)) {
      customerDayPaymentsMap.set(p.customerId, {
        totalPaymentsPaise: 0,
        cashPaise: 0,
        upiPaise: 0,
        paymentIds: [],
        remarks: [],
        methods: [],
      });
    }
    const entry = customerDayPaymentsMap.get(p.customerId)!;
    entry.totalPaymentsPaise += p.amount;
    entry.paymentIds.push(p.id);
    const m = (p.paymentMethod || 'CASH').toUpperCase();
    if (m === 'UPI') {
      entry.upiPaise += p.amount;
    } else {
      entry.cashPaise += p.amount;
    }
    if (p.referenceNumber) entry.remarks.push(p.referenceNumber);
    if (p.paymentMethod) entry.methods.push(p.paymentMethod);
  });

  // Transform all 333 customers with live previous dues, customer-specific rates, and loaded date values
  const customers = rawCustomers.map((c) => {
    const totalSalesAllTime = c.sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalPaymentsAllTime = c.payments.reduce((sum, p) => sum + p.amount, 0);
    const openingBase = c.openingBalanceType === 'DEBIT' ? c.openingBalance : -c.openingBalance;
    const currentOutstandingPaise = openingBase + totalSalesAllTime - totalPaymentsAllTime;

    // Custom rate map
    const customRateMap: Record<string, number> = {};
    (c.customerRates || []).forEach((pr: any) => {
      customRateMap[pr.productId] = pr.rate;
    });

    const rate1LPaise = prod1L ? (customRateMap[prod1L.id] ?? prod1L.rates[0]?.rate ?? 9000) : 9000;
    const rate500mlPaise = prod500ml ? (customRateMap[prod500ml.id] ?? prod500ml.rates[0]?.rate ?? 11000) : 11000;
    const rate250mlPaise = prod250ml ? (customRateMap[prod250ml.id] ?? prod250ml.rates[0]?.rate ?? 8000) : 8000;

    // Check if this date has recorded sales/payments for customer
    const daySales = customerDaySalesMap.get(c.id);
    const dayPayments = customerDayPaymentsMap.get(c.id);

    const todaySalesPaise = daySales?.totalSalesPaise || 0;
    const todayPaymentsPaise = dayPayments?.totalPaymentsPaise || 0;

    // Previous Due: balance *prior* to this targetDate's transactions
    const previousDuePaise = currentOutstandingPaise - (todaySalesPaise - todayPaymentsPaise);

    const savedRemarks = [
      ...(daySales?.remarks || []),
      ...(dayPayments?.remarks || []),
    ].filter(Boolean).join(' • ');

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
      previousDuePaise,
      rate1LPaise,
      rate500mlPaise,
      rate250mlPaise,
      hasCustom1L: prod1L ? customRateMap[prod1L.id] !== undefined : false,
      hasCustom500ml: prod500ml ? customRateMap[prod500ml.id] !== undefined : false,
      hasCustom250ml: prod250ml ? customRateMap[prod250ml.id] !== undefined : false,
      savedPkg1L: daySales?.pkg1L || 0,
      savedPkg500ml: daySales?.pkg500ml || 0,
      savedPkg250ml: daySales?.pkg250ml || 0,
      savedCashRupees: (dayPayments?.cashPaise || 0) / 100,
      savedUpiRupees: (dayPayments?.upiPaise || 0) / 100,
      savedReceivedRupees: todayPaymentsPaise > 0 ? todayPaymentsPaise / 100 : 0,
      savedRemarks,
      existingSaleIds: daySales?.saleIds || [],
      existingPaymentIds: dayPayments?.paymentIds || [],
    };
  });

  // Day summary metrics
  const totalSalesPaise = salesOnDate.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalReceivedPaise = paymentsOnDate.reduce((sum, p) => sum + p.amount, 0);
  const totalCashReceivedPaise = paymentsOnDate.filter(p => (p.paymentMethod || 'CASH').toUpperCase() !== 'UPI').reduce((sum, p) => sum + p.amount, 0);
  const totalUpiReceivedPaise = paymentsOnDate.filter(p => (p.paymentMethod || 'CASH').toUpperCase() === 'UPI').reduce((sum, p) => sum + p.amount, 0);
  const totalPKGs = salesOnDate.reduce((sum, s) => sum + s.items.reduce((iSum, i) => iSum + i.crates, 0), 0);
  const modifiedAccountsCount = new Set([
    ...salesOnDate.map((s) => s.customerId),
    ...paymentsOnDate.map((p) => p.customerId),
  ]).size;

  const daySummary = {
    totalSalesPaise,
    totalReceivedPaise,
    totalCashReceivedPaise,
    totalUpiReceivedPaise,
    netDuePaise: totalSalesPaise - totalReceivedPaise,
    totalPKGs,
    accountsCount: modifiedAccountsCount,
    totalCustomersCount: customers.length,
  };

  return {
    targetDate,
    products,
    prod1LId: prod1L?.id || '',
    prod500mlId: prod500ml?.id || '',
    prod250mlId: prod250ml?.id || '',
    prod1LRatePaise: prod1L?.rates[0]?.rate ?? 9000,
    prod500mlRatePaise: prod500ml?.rates[0]?.rate ?? 11000,
    prod250mlRatePaise: prod250ml?.rates[0]?.rate ?? 8000,
    customers,
    daySummary,
    defaultSalesmanId: defaultSalesman?.id || 'cmvigu4wxsq760uma',
  };
}

/**
 * Save multiple customer rows in a single atomic database transaction.
 * Supports:
 * - Direct updating of existing entries on a date (reversing/replacing old IDs safely)
 * - Payment-only entries without fake sales
 * - Pure quantity entries
 * - Skipping untouched rows (does not create empty records)
 * - Strict block on future dates in Asia/Kolkata timezone
 */
export async function saveAdminEntryBatch(payload: {
  date: string;
  entries: {
    customerId: string;
    pkg1L: number;
    pkg500ml: number;
    pkg250ml: number;
    cashAmount?: number; // in Rupees
    upiAmount?: number; // in Rupees
    receivedAmount?: number; // in Rupees
    paymentMethod?: string;
    remarks?: string;
    existingSaleIds?: string[];
    existingPaymentIds?: string[];
    isModified?: boolean;
  }[];
}) {
  await requireAdminSession();

  const parsed = AdminEntryBatchSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { date, entries } = parsed.data;

  // Strict enforcement: Never allow future dates (Asia/Kolkata timezone)
  const now = getCurrentKolkataTime();
  const todayStr = getKolkataDateString(now);
  if (date > todayStr) {
    return { error: 'Future dates are prohibited. Entries can only be recorded for today or permitted past dates.' };
  }

  // Filter entries that were actually modified or have existing transactions to update
  const rowsToProcess = entries.filter((e) => 
    e.isModified || 
    (e.existingSaleIds && e.existingSaleIds.length > 0) || 
    (e.existingPaymentIds && e.existingPaymentIds.length > 0)
  );

  if (rowsToProcess.length === 0) {
    return { success: true, savedCount: 0, message: 'No modified entries to save' };
  }

  // Load products to map IDs and rates
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { rates: { orderBy: { minQuantity: 'asc' } } },
    orderBy: { bottlesPerCrate: 'asc' },
  });

  const prod1L = products.find((p) => {
    const n = p.name.toLowerCase();
    return n.includes('1 litre') || n.includes('1l') || n === '1000ml';
  }) || products[1] || products[0];

  const prod500ml = products.find((p) => {
    const n = p.name.toLowerCase();
    return n.includes('500 ml') || n.includes('500ml') || n === '0.5l';
  }) || products[2] || products[0];

  const prod250ml = products.find((p) => {
    const n = p.name.toLowerCase();
    return n.includes('250 ml') || n.includes('250ml') || n === '0.25l';
  }) || products[3] || products[0];

  // Load relevant customers with custom rates
  const customerIds = rowsToProcess.map((r) => r.customerId);
  const customers = await prisma.customer.findMany({
    where: { id: { in: customerIds } },
    include: { customerRates: true },
  });
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  // Default fallback salesman if customer has no assigned salesman
  const fallbackSalesman = await prisma.salesman.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  const targetDateTime = new Date(`${date}T12:00:00+05:30`);

  let totalSalesCreatedPaise = 0;
  let totalPaymentsCreatedPaise = 0;
  let totalRowsSaved = 0;

  try {
    await prisma.$transaction(async (tx) => {
      for (const row of rowsToProcess) {
        const customer = customerMap.get(row.customerId);
        if (!customer) continue;

        const salesmanId = customer.salesmanId || fallbackSalesman?.id || 'cmvigu4wxsq760uma';

        // 1. Delete previous records for this customer on this date if reopening/editing
        if (row.existingSaleIds && row.existingSaleIds.length > 0) {
          await tx.saleItem.deleteMany({
            where: { saleId: { in: row.existingSaleIds } },
          });
          await tx.sale.deleteMany({
            where: { id: { in: row.existingSaleIds } },
          });
        }
        if (row.existingPaymentIds && row.existingPaymentIds.length > 0) {
          await tx.payment.deleteMany({
            where: { id: { in: row.existingPaymentIds } },
          });
        }

        // 2. Resolve customer-specific rates
        const customRateMap: Record<string, number> = {};
        (customer.customerRates || []).forEach((cr: any) => {
          customRateMap[cr.productId] = cr.rate;
        });

        const rate1L = prod1L ? (customRateMap[prod1L.id] ?? prod1L.rates[0]?.rate ?? 9000) : 9000;
        const rate500ml = prod500ml ? (customRateMap[prod500ml.id] ?? prod500ml.rates[0]?.rate ?? 11000) : 11000;
        const rate250ml = prod250ml ? (customRateMap[prod250ml.id] ?? prod250ml.rates[0]?.rate ?? 8000) : 8000;

        const saleItems: {
          productId: string;
          crates: number;
          looseBottles: number;
          standardRate: number;
          actualRate: number;
          amount: number;
        }[] = [];

        if (row.pkg1L > 0 && prod1L) {
          const stdRate = prod1L.rates[0]?.rate ?? rate1L;
          saleItems.push({
            productId: prod1L.id,
            crates: row.pkg1L,
            looseBottles: 0,
            standardRate: stdRate,
            actualRate: rate1L,
            amount: row.pkg1L * rate1L,
          });
        }

        if (row.pkg500ml > 0 && prod500ml) {
          const stdRate = prod500ml.rates[0]?.rate ?? rate500ml;
          saleItems.push({
            productId: prod500ml.id,
            crates: row.pkg500ml,
            looseBottles: 0,
            standardRate: stdRate,
            actualRate: rate500ml,
            amount: row.pkg500ml * rate500ml,
          });
        }

        if (row.pkg250ml > 0 && prod250ml) {
          const stdRate = prod250ml.rates[0]?.rate ?? rate250ml;
          saleItems.push({
            productId: prod250ml.id,
            crates: row.pkg250ml,
            looseBottles: 0,
            standardRate: stdRate,
            actualRate: rate250ml,
            amount: row.pkg250ml * rate250ml,
          });
        }

        const totalSaleAmount = saleItems.reduce((sum, item) => sum + item.amount, 0);
        let cashPaise = Math.round((row.cashAmount || 0) * 100);
        let upiPaise = Math.round((row.upiAmount || 0) * 100);

        // Fallback for single receivedAmount payload
        if (cashPaise === 0 && upiPaise === 0 && row.receivedAmount > 0) {
          const method = (row.paymentMethod || 'CASH').toUpperCase();
          if (method === 'UPI') {
            upiPaise = Math.round(row.receivedAmount * 100);
          } else {
            cashPaise = Math.round(row.receivedAmount * 100);
          }
        }

        // 3. Create Sale if product packages were entered
        if (saleItems.length > 0 && totalSaleAmount > 0) {
          await tx.sale.create({
            data: {
              customerId: row.customerId,
              salesmanId,
              totalAmount: totalSaleAmount,
              saleDate: targetDateTime,
              items: {
                create: saleItems,
              },
            },
          });
          totalSalesCreatedPaise += totalSaleAmount;
        }

        // 4. Create Payments if Cash or UPI collections were entered
        if (cashPaise > 0) {
          await tx.payment.create({
            data: {
              customerId: row.customerId,
              salesmanId,
              amount: cashPaise,
              paymentMethod: 'CASH',
              referenceNumber: row.remarks?.trim() ? `Cash • ${row.remarks.trim()}` : 'Admin Entry - Cash',
              paymentDate: targetDateTime,
            },
          });
          totalPaymentsCreatedPaise += cashPaise;
        }

        if (upiPaise > 0) {
          await tx.payment.create({
            data: {
              customerId: row.customerId,
              salesmanId,
              amount: upiPaise,
              paymentMethod: 'UPI',
              referenceNumber: row.remarks?.trim() ? `UPI • ${row.remarks.trim()}` : 'Admin Entry - UPI',
              paymentDate: targetDateTime,
            },
          });
          totalPaymentsCreatedPaise += upiPaise;
        }

        if (totalSaleAmount > 0 || cashPaise > 0 || upiPaise > 0) {
          totalRowsSaved++;
        }
      }
    });

    // Revalidate paths for instant consistency across Alvoun
    try {
      revalidatePath('/dashboard/admin/entry');
      revalidatePath('/dashboard/admin/customers');
      revalidatePath('/dashboard/admin/reports/daily');
      revalidatePath('/dashboard/admin/reports/outstanding');
      revalidatePath('/dashboard/admin');
    } catch {}

    return {
      success: true,
      savedCount: totalRowsSaved,
      totalSalesCreatedPaise,
      totalPaymentsCreatedPaise,
    };
  } catch (error: any) {
    console.error('Error saving admin entry batch:', error);
    return { error: error.message || 'Failed to save batch entries' };
  }
}

/**
 * Single-transaction backward-compatible entry.
 */
export async function saveAdminEntryTransaction(data: {
  customerId: string;
  date: string;
  items: { productId: string; crates: number; actualRate?: number }[];
  receivedAmount: number;
  paymentMethod?: string;
  remarks?: string;
}) {
  const session = await requireAdminSession();
  const parsed = AdminEntrySchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { customerId, date, items, receivedAmount, paymentMethod, remarks } = parsed.data;

  const now = getCurrentKolkataTime();
  const todayStr = getKolkataDateString(now);
  if (date > todayStr) {
    return { error: 'Future dates are not allowed.' };
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { customerRates: true },
  });

  if (!customer) {
    return { error: 'Customer not found' };
  }

  let salesmanId = customer.salesmanId;
  if (!salesmanId) {
    const fallback = await prisma.salesman.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
    salesmanId = fallback?.id || 'cmvigu4wxsq760uma';
  }

  const targetDateTime = new Date(`${date}T12:00:00+05:30`);
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
      if (validItems.length > 0 && totalSaleAmount > 0) {
        const sale = await tx.sale.create({
          data: {
            customerId,
            salesmanId: salesmanId!,
            totalAmount: totalSaleAmount,
            saleDate: targetDateTime,
            items: { create: saleItemsData },
          },
        });
        createdSaleId = sale.id;
      }

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

/**
 * Runtime Quick Add Customer directly from Admin Entry sheet.
 * Adds the customer immediately to the database and returns the row data
 * so it appears instantly on the sheet without requiring a reload or losing unsaved edits.
 */
export async function quickCreateAdminEntryCustomer(payload: {
  customerName: string;
  firmName?: string;
  code?: string; // Custom Customer ID / Code
  category?: string; // Category "A", "B", "C"
  contact?: string;
  routeName: string; // Compulsory
  areaName: string; // Compulsory
  address?: string; // Optional
  openingDueRupees?: number;
}) {
  await requireAdminSession();

  const name = payload.customerName?.trim();
  if (!name) return { error: 'Customer Name is required' };

  const routeName = payload.routeName?.trim();
  if (!routeName) return { error: 'Route is required' };

  const areaName = payload.areaName?.trim();
  if (!areaName) return { error: 'Area is required' };

  try {
    const city = await prisma.city.findFirst();
    const state = await prisma.state.findFirst();

    if (!city || !state) {
      return { error: 'System city/state configuration missing' };
    }

    // 1. Resolve or create Route
    let route = await prisma.route.findFirst({
      where: { name: routeName },
    });
    if (!route) {
      route = await prisma.route.create({
        data: {
          name: routeName,
          cityId: city.id,
          isActive: true,
        },
      });
    }

    // 2. Resolve or create Area under this route
    let area = await prisma.area.findFirst({
      where: {
        name: areaName,
        routeId: route.id,
      },
    });
    if (!area) {
      area = await prisma.area.create({
        data: {
          name: areaName,
          routeId: route.id,
        },
      });
    }

    // 3. Customer ID / Code: custom input or auto-generated
    let code = payload.code?.trim();
    if (!code) {
      const count = await prisma.customer.count();
      code = `CUST-${String(count + 1).padStart(4, '0')}`;
    }

    // 4. Category: A, B, C
    const category = payload.category?.trim().toUpperCase() || 'A';

    // 5. Address is optional! Fallback to "Area, Route" if omitted
    const address = payload.address && payload.address.trim() 
      ? payload.address.trim() 
      : `${area.name}, ${route.name}`;

    const contact = payload.contact?.trim() || 'N/A';
    const openingBalancePaise = Math.round((Number(payload.openingDueRupees) || 0) * 100);

    // 6. Create Customer
    const customer = await prisma.customer.create({
      data: {
        customerName: name,
        firmName: payload.firmName?.trim() || null,
        code,
        category,
        contact,
        address,
        stateId: state.id,
        cityId: city.id,
        routeId: route.id,
        areaId: area.id,
        openingBalance: Math.abs(openingBalancePaise),
        openingBalanceType: openingBalancePaise >= 0 ? 'CREDIT' : 'DEBIT',
        status: 'ACTIVE',
      },
      include: {
        route: true,
        area: true,
      },
    });

    // 6. Load standard product rates
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { rates: true },
    });
    const prod1L = products.find(p => p.name.toLowerCase().includes('1l') || p.name.toLowerCase().includes('1 litre'));
    const prod500ml = products.find(p => p.name.toLowerCase().includes('500ml') || p.name.toLowerCase().includes('500 ml'));
    const prod250ml = products.find(p => p.name.toLowerCase().includes('250ml') || p.name.toLowerCase().includes('250 ml'));

    const rate1LPaise = prod1L?.rates[0]?.rate ?? 9000;
    const rate500mlPaise = prod500ml?.rates[0]?.rate ?? 11000;
    const rate250mlPaise = prod250ml?.rates[0]?.rate ?? 8000;

    const rowData = {
      id: customer.id,
      customerName: customer.customerName,
      firmName: customer.firmName,
      code: customer.code,
      contact: customer.contact,
      address: customer.address,
      routeName: customer.route?.name || route.name,
      areaName: customer.area?.name || area.name,
      salesmanId: customer.salesmanId,
      currentOutstandingPaise: openingBalancePaise,
      previousDuePaise: openingBalancePaise,
      rate1LPaise,
      rate500mlPaise,
      rate250mlPaise,
      hasCustom1L: false,
      hasCustom500ml: false,
      hasCustom250ml: false,
      savedPkg1L: 0,
      savedPkg500ml: 0,
      savedPkg250ml: 0,
      savedCashRupees: 0,
      savedUpiRupees: 0,
      savedReceivedRupees: 0,
      savedRemarks: '',
      existingSaleIds: [],
      existingPaymentIds: [],
    };

    try {
      revalidatePath('/dashboard/admin/entry');
      revalidatePath('/dashboard/admin/customers');
      revalidatePath('/dashboard/admin');
    } catch {}

    return { success: true, customer: rowData };
  } catch (err: any) {
    return { error: err.message || 'Failed to create customer' };
  }
}
