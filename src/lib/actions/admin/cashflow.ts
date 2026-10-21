'use server';

import { prisma } from '@/lib/db';
import { requireAdminSession } from '@/lib/session';
import { 
  getKolkataStartOfDay, 
  getKolkataEndOfDay, 
  getCurrentKolkataTime, 
  getKolkataTimeDetails, 
  getKolkataDateString 
} from '@/lib/time';

export interface CashFlowTransaction {
  id: string;
  date: string; // ISO date string
  timestamp: string; // Formatted date/time
  type: 'INFLOW' | 'OUTFLOW';
  category: string;
  description: string;
  source: string;
  paymentMethod: string;
  referenceNo: string;
  amountPaise: number;
  entityLink?: string;
}

export interface MethodBreakdownItem {
  method: string;
  inflowPaise: number;
  outflowPaise: number;
  netPaise: number;
}

export interface CashFlowData {
  period: string;
  startDate: string;
  endDate: string;
  openingBalancePaise: number;
  isOpeningBalanceVerified: boolean;
  totalInflowPaise: number;
  totalOutflowPaise: number;
  netMovementPaise: number;
  closingBalancePaise: number;
  methodBreakdown: MethodBreakdownItem[];
  transactions: CashFlowTransaction[];
}

export async function getCashFlowData(filters?: {
  period?: 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'custom';
  startDate?: string;
  endDate?: string;
}): Promise<CashFlowData> {
  await requireAdminSession();

  const now = getCurrentKolkataTime();
  const todayStr = getKolkataDateString(now);
  const nowDetails = getKolkataTimeDetails(now);

  let start: Date;
  let end: Date;
  let periodName = filters?.period || 'today';

  if (filters?.period === 'yesterday') {
    const yest = new Date(Date.UTC(nowDetails.year, nowDetails.month - 1, nowDetails.day - 1));
    start = getKolkataStartOfDay(yest);
    end = getKolkataEndOfDay(yest);
  } else if (filters?.period === '7d') {
    const d7 = new Date(Date.UTC(nowDetails.year, nowDetails.month - 1, nowDetails.day - 6));
    start = getKolkataStartOfDay(d7);
    end = getKolkataEndOfDay(now);
  } else if (filters?.period === '30d') {
    const d30 = new Date(Date.UTC(nowDetails.year, nowDetails.month - 1, nowDetails.day - 29));
    start = getKolkataStartOfDay(d30);
    end = getKolkataEndOfDay(now);
  } else if (filters?.period === 'month') {
    const firstOfMonth = new Date(Date.UTC(nowDetails.year, nowDetails.month - 1, 1));
    start = getKolkataStartOfDay(firstOfMonth);
    end = getKolkataEndOfDay(now);
  } else if (filters?.period === 'custom' && filters.startDate && filters.endDate) {
    start = getKolkataStartOfDay(filters.startDate);
    end = getKolkataEndOfDay(filters.endDate);
  } else {
    // Default today
    periodName = 'today';
    start = getKolkataStartOfDay(todayStr);
    end = getKolkataEndOfDay(todayStr);
  }

  // 1. Fetch Inflows (Collections from Customer Payments)
  const payments = await prisma.payment.findMany({
    where: {
      paymentDate: { gte: start, lte: end }
    },
    include: {
      customer: { select: { id: true, customerName: true } },
      salesman: { select: { name: true } }
    },
    orderBy: { paymentDate: 'desc' }
  });

  // 2. Fetch Outflows (Company Expenses)
  const expenses = await prisma.expense.findMany({
    where: {
      expenseDate: { gte: start, lte: end }
    },
    orderBy: { expenseDate: 'desc' }
  });

  let totalInflowPaise = 0;
  let totalOutflowPaise = 0;

  const methodMap = new Map<string, { inflow: number; outflow: number }>();
  const standardizeMethod = (m: string) => {
    const norm = m.toUpperCase().trim();
    if (norm.includes('CASH')) return 'CASH';
    if (norm.includes('UPI')) return 'UPI';
    if (norm.includes('BANK') || norm.includes('TRANSFER') || norm.includes('NEFT') || norm.includes('RTGS')) return 'BANK TRANSFER';
    if (norm.includes('CHEQUE') || norm.includes('CHECK')) return 'CHEQUE';
    return 'OTHER';
  };

  const transactions: CashFlowTransaction[] = [];

  // Map Payments
  payments.forEach((p) => {
    totalInflowPaise += p.amount;
    const stdMethod = standardizeMethod(p.paymentMethod);
    const existing = methodMap.get(stdMethod) || { inflow: 0, outflow: 0 };
    existing.inflow += p.amount;
    methodMap.set(stdMethod, existing);

    transactions.push({
      id: `in-${p.id}`,
      date: p.paymentDate.toISOString(),
      timestamp: new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata'
      }).format(p.paymentDate),
      type: 'INFLOW',
      category: 'Customer Collection',
      description: `Payment received by ${p.salesman?.name || 'Cashier'}`,
      source: p.customer?.customerName || 'Retail Customer',
      paymentMethod: p.paymentMethod,
      referenceNo: p.referenceNumber || '—',
      amountPaise: p.amount,
      entityLink: p.customer ? `/dashboard/admin/customers/${p.customer.id}` : undefined
    });
  });

  // Map Expenses
  expenses.forEach((e) => {
    totalOutflowPaise += e.amount;
    const stdMethod = standardizeMethod(e.paymentMethod);
    const existing = methodMap.get(stdMethod) || { inflow: 0, outflow: 0 };
    existing.outflow += e.amount;
    methodMap.set(stdMethod, existing);

    transactions.push({
      id: `out-${e.id}`,
      date: e.expenseDate.toISOString(),
      timestamp: new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata'
      }).format(e.expenseDate),
      type: 'OUTFLOW',
      category: e.category.replace(/_/g, ' '),
      description: e.title + (e.recipient ? ` (Paid to: ${e.recipient})` : ''),
      source: e.recipient || 'Vendor / Operation',
      paymentMethod: e.paymentMethod,
      referenceNo: e.referenceNo || '—',
      amountPaise: e.amount,
      entityLink: '/dashboard/admin/expenses'
    });
  });

  // Sort combined transactions descending by date
  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const standardMethods = ['CASH', 'UPI', 'BANK TRANSFER', 'CHEQUE'];
  const methodBreakdown: MethodBreakdownItem[] = standardMethods.map((m) => {
    const entry = methodMap.get(m) || { inflow: 0, outflow: 0 };
    return {
      method: m,
      inflowPaise: entry.inflow,
      outflowPaise: entry.outflow,
      netPaise: entry.inflow - entry.outflow
    };
  });

  const netMovementPaise = totalInflowPaise - totalOutflowPaise;
  const openingBalancePaise = 0; // Unverified / unrecorded ledger baseline
  const closingBalancePaise = openingBalancePaise + netMovementPaise;

  return {
    period: periodName,
    startDate: getKolkataDateString(start),
    endDate: getKolkataDateString(end),
    openingBalancePaise,
    isOpeningBalanceVerified: false,
    totalInflowPaise,
    totalOutflowPaise,
    netMovementPaise,
    closingBalancePaise,
    methodBreakdown,
    transactions
  };
}
