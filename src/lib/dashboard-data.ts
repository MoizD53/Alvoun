import { prisma } from '@/lib/db';
import { 
  getKolkataStartOfDay, 
  getKolkataEndOfDay, 
  getCurrentKolkataTime, 
  getKolkataTimeDetails, 
  getKolkataDateString,
  isWorkingHours 
} from '@/lib/time';
import { calculateOutstanding } from '@/lib/outstanding';
import { getOrComputeCached } from '@/lib/cache/dashboard-cache';
import { recordQueryMetrics } from '@/lib/turso-budget';

let cachedTotalOpening: { value: number; expiresAt: number } | null = null;
export async function getCustomerOpeningBalanceSum(): Promise<number> {
  const now = Date.now();
  if (cachedTotalOpening && cachedTotalOpening.expiresAt > now) {
    return cachedTotalOpening.value;
  }
  const customerBalances = await prisma.customer.findMany({
    select: { openingBalance: true, openingBalanceType: true }
  });
  recordQueryMetrics(customerBalances.length);
  const total = customerBalances.reduce((sum, c) => {
    return sum + (c.openingBalanceType === 'DEBIT' ? c.openingBalance : -c.openingBalance);
  }, 0);
  cachedTotalOpening = { value: total, expiresAt: now + 300000 };
  return total;
}

// ---------------------------------------------------------------------------
// TYPE DEFINITIONS
// ---------------------------------------------------------------------------

export interface TrendPoint {
  dateKey: string;      // YYYY-MM-DD
  label: string;        // e.g. "14 Oct"
  salesPaise: number;
  collectionsPaise: number;
  visitsCount: number;
}

export interface SalesTrendsData {
  points: TrendPoint[];
  todaySalesPaise: number;
  yesterdaySalesPaise: number;
  salesChangePercent: number; // e.g. +12.5%
  todayCollectionsPaise: number;
  yesterdayCollectionsPaise: number;
  collectionsChangePercent: number;
  totalMarketDuesPaise: number;
  todayDispatchedLitres: number;
  yesterdayDispatchedLitres: number;
  dispatchedLitresChangePercent: number;
}

export interface ProductSaleItem {
  productId: string;
  productName: string;
  salesPaise: number;
  crates: number;
  looseBottles: number;
  totalBottles: number;
  volumeLitres: number;
  percentage: number; // 0 to 100
}

export interface ProductSalesData {
  products: ProductSaleItem[];
  totalSalesPaise: number;
  totalBottles: number;
  totalCrates: number;
  totalLitres: number;
}

export interface TopCustomerItem {
  customerId: string;
  customerName: string;
  routeName: string;
  areaName: string;
  todaySalesPaise: number;
  outstandingPaise: number;
  contact: string;
}

export interface AreaSaleItem {
  areaId: string;
  areaName: string;
  routeName: string;
  salesPaise: number;
  ordersCount: number;
  customersCount: number;
  percentage: number;
}

export interface SalesmanPerformanceItem {
  id: string;
  name: string;
  employeeCode: string;
  status: 'Working' | 'Completed' | 'Not Started' | 'Inactive';
  salesPaise: number;
  collectionPaise: number;
  visitsCount: number;
  currentAction: string;
  currentCustomerName?: string;
  currentAreaName?: string;
}

export interface AttendanceData {
  totalStaff: number;
  present: number;
  working: number;
  completed: number;
  absent: number;
  attendancePercent: number;
  activeVisits: number;
  completedVisits: number;
  noSaleVisits: number;
  totalVisitsToday: number;
  salesmen: SalesmanPerformanceItem[];
}

export interface OperationalAlert {
  id: string;
  severity: 'warning' | 'danger' | 'info';
  category: 'dues' | 'staff' | 'territory' | 'visits';
  title: string;
  description: string;
  metric?: string;
  timestamp: string;
  actionHref: string;
  actionLabel: string;
}

export interface DispatchProductItem {
  productId: string;
  productName: string;
  crates: number;
  looseBottles: number;
  totalBottles: number;
  volumeLitres: number;
}

export interface DispatchSummary {
  totalCrates: number;
  totalLooseBottles: number;
  totalBottles: number;
  totalLitres: number;
  byProduct: DispatchProductItem[];
}

export interface ExpenseSummary {
  todayExpensesPaise: number;
  monthExpensesPaise: number;
  expensesCount: number;
}

export interface ProductionSummary {
  todayCrates: number;
  todayLooseBottles: number;
  todayLitres: number;
  batchesCount: number;
}

export interface PurchaseSummary {
  todayTotalAmountPaise: number;
  todayPaidPaise: number;
  todayOutstandingPaise: number;
  todayQuantity: number;
  purchasesCount: number;
}

export interface StockSummary {
  totalAvailableCrates: number;
  totalAvailableLitres: number;
}

export interface CashFlowSummary {
  inflowPaise: number;
  outflowPaise: number;
  netPaise: number;
}

export interface CustomerActivitySummary {
  totalActiveCustomers: number;
  purchasedTodayCount: number;
  purchasePercentage: number;
}

export interface PayrollSummary {
  activeStaffCount: number;
  monthlyLiabilityPaise: number;
  paidThisMonthPaise: number;
}

export interface DashboardExecutiveData {
  selectedDate: string; // YYYY-MM-DD
  isToday: boolean;
  trends: SalesTrendsData;
  productSales: ProductSalesData;
  topCustomers: TopCustomerItem[];
  areaSales: AreaSaleItem[];
  attendance: AttendanceData;
  alerts: OperationalAlert[];
  dispatches: DispatchSummary;
  expenses: ExpenseSummary;
  production: ProductionSummary;
  purchase: PurchaseSummary;
  stock: StockSummary;
  cashFlow: CashFlowSummary;
  customerActivity: CustomerActivitySummary;
  payroll: PayrollSummary;
  meta: {
    totalCustomersCount: number;
    activeCustomersCount: number;
    activeRoutesCount: number;
    totalAreasCount: number;
  };
}

// ---------------------------------------------------------------------------
// HELPER: PRODUCT VOLUME CONVERSION
// ---------------------------------------------------------------------------

export function parseProductLitresPerBottle(name: string): number {
  const lower = name.toLowerCase().trim();
  if (lower.includes('1 litre') || lower.includes('1 l') || lower.includes('1l') || lower.includes('1000 ml')) {
    return 1.0;
  }
  if (lower.includes('2 litre') || lower.includes('2 l') || lower.includes('2l')) {
    return 2.0;
  }
  if (lower.includes('500 ml') || lower.includes('500ml') || lower.includes('0.5 l')) {
    return 0.5;
  }
  if (lower.includes('250 ml') || lower.includes('250ml') || lower.includes('0.25 l')) {
    return 0.25;
  }
  if (lower.includes('300 ml') || lower.includes('300ml')) {
    return 0.3;
  }
  if (lower.includes('20 litre') || lower.includes('20l') || lower.includes('jar')) {
    return 20.0;
  }
  return 1.0; // Standard fallback
}

// ---------------------------------------------------------------------------
// 1. SALES AND COLLECTION TRENDS (7 DAYS HISTORICAL)
// ---------------------------------------------------------------------------

export async function getSalesAndCollectionTrends(
  dateStr?: string,
  daysCount: number = 7
): Promise<{
  trends: SalesTrendsData;
  sevenDaysList: { dateKey: string; label: string; start: Date; end: Date }[];
}> {
  const now = getCurrentKolkataTime();
  const targetDate = dateStr ? new Date(dateStr) : now;
  const targetDetails = getKolkataTimeDetails(targetDate);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const count = Math.max(1, Math.min(daysCount, 365));

  // Construct consecutive days: D-(count-1) to D
  const daysList: { dateKey: string; label: string; start: Date; end: Date }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(targetDetails.year, targetDetails.month - 1, targetDetails.day - i));
    const dayDetails = getKolkataTimeDetails(d);
    const mm = String(dayDetails.month).padStart(2, '0');
    const dd = String(dayDetails.day).padStart(2, '0');
    const dateKey = `${dayDetails.year}-${mm}-${dd}`;
    const label = `${dayDetails.day} ${monthNames[dayDetails.month - 1]}`;

    daysList.push({
      dateKey,
      label,
      start: getKolkataStartOfDay(d),
      end: getKolkataEndOfDay(d)
    });
  }

  const rangeStart = daysList[0].start;
  const rangeEnd = daysList[count - 1].end;

  // Parallel queries across the 7-day range (eliminated separate rangeSaleItems join query and cached customer opening balance sum)
  const [rangeSales, rangePayments, rangeVisits, allSalesAgg, allPaymentsAgg, totalOpening] = await Promise.all([
    prisma.sale.findMany({
      where: { saleDate: { gte: rangeStart, lte: rangeEnd } },
      select: {
        saleDate: true,
        totalAmount: true,
        items: {
          select: {
            crates: true,
            looseBottles: true,
            product: { select: { name: true, bottlesPerCrate: true } }
          }
        }
      }
    }),
    prisma.payment.findMany({
      where: { paymentDate: { gte: rangeStart, lte: rangeEnd } },
      select: { paymentDate: true, amount: true }
    }),
    prisma.visit.findMany({
      where: { createdAt: { gte: rangeStart, lte: rangeEnd } },
      select: { createdAt: true }
    }),
    prisma.sale.aggregate({ _sum: { totalAmount: true } }),
    prisma.payment.aggregate({ _sum: { amount: true } }),
    getCustomerOpeningBalanceSum(),
  ]);

  recordQueryMetrics(rangeSales.length + rangePayments.length + rangeVisits.length + 2);

  // Aggregate Market Dues
  const totalMarketDuesPaise = totalOpening + (allSalesAgg._sum.totalAmount || 0) - (allPaymentsAgg._sum.amount || 0);

  // Bucket each day's sales, payments, visits, and dispatches
  const dayBuckets = new Map<string, { sales: number; payments: number; visits: number; litres: number }>();
  daysList.forEach(day => {
    dayBuckets.set(day.dateKey, { sales: 0, payments: 0, visits: 0, litres: 0 });
  });

  rangeSales.forEach(s => {
    const key = getKolkataDateString(s.saleDate);
    const bucket = dayBuckets.get(key);
    if (bucket) {
      bucket.sales += s.totalAmount;
      s.items.forEach(item => {
        const bottleLitres = parseProductLitresPerBottle(item.product.name);
        const bottles = item.crates * item.product.bottlesPerCrate + item.looseBottles;
        bucket.litres += bottles * bottleLitres;
      });
    }
  });

  rangePayments.forEach(p => {
    const key = getKolkataDateString(p.paymentDate);
    const bucket = dayBuckets.get(key);
    if (bucket) {
      bucket.payments += p.amount;
    }
  });

  rangeVisits.forEach(v => {
    const key = getKolkataDateString(v.createdAt);
    const bucket = dayBuckets.get(key);
    if (bucket) {
      bucket.visits += 1;
    }
  });

  const points: TrendPoint[] = daysList.map(day => {
    const data = dayBuckets.get(day.dateKey) || { sales: 0, payments: 0, visits: 0, litres: 0 };
    return {
      dateKey: day.dateKey,
      label: day.label,
      salesPaise: data.sales,
      collectionsPaise: data.payments,
      visitsCount: data.visits
    };
  });

  // Calculate today vs yesterday comparisons
  const lastIdx = count - 1;
  const prevIdx = count - 2;
  const todayBucket = dayBuckets.get(daysList[lastIdx].dateKey) || { sales: 0, payments: 0, visits: 0, litres: 0 };
  const yesterdayBucket = prevIdx >= 0 
    ? (dayBuckets.get(daysList[prevIdx].dateKey) || { sales: 0, payments: 0, visits: 0, litres: 0 })
    : { sales: 0, payments: 0, visits: 0, litres: 0 };

  const calcPercent = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const trends: SalesTrendsData = {
    points,
    todaySalesPaise: todayBucket.sales,
    yesterdaySalesPaise: yesterdayBucket.sales,
    salesChangePercent: calcPercent(todayBucket.sales, yesterdayBucket.sales),
    todayCollectionsPaise: todayBucket.payments,
    yesterdayCollectionsPaise: yesterdayBucket.payments,
    collectionsChangePercent: calcPercent(todayBucket.payments, yesterdayBucket.payments),
    totalMarketDuesPaise,
    todayDispatchedLitres: Math.round(todayBucket.litres),
    yesterdayDispatchedLitres: Math.round(yesterdayBucket.litres),
    dispatchedLitresChangePercent: calcPercent(todayBucket.litres, yesterdayBucket.litres)
  };

  return { trends, sevenDaysList: daysList };
}

// ---------------------------------------------------------------------------
// 2. PRODUCT-WISE SALES (FOR DONUT CHART & REVENUE SHARE)
// ---------------------------------------------------------------------------

export function getProductWiseSalesFromSales(sales: any[]): ProductSalesData {
  const saleItems = sales.flatMap(s => s.items || []);
  const productMap = new Map<string, {
    productId: string;
    productName: string;
    salesPaise: number;
    crates: number;
    looseBottles: number;
    totalBottles: number;
    volumeLitres: number;
  }>();

  let totalSalesPaise = 0;
  let totalBottles = 0;
  let totalCrates = 0;
  let totalLitres = 0;

  saleItems.forEach((item: any) => {
    const p = item.product;
    if (!p) return;
    const bottleLitres = parseProductLitresPerBottle(p.name);
    const itemBottles = item.crates * p.bottlesPerCrate + item.looseBottles;
    const itemLitres = itemBottles * bottleLitres;

    totalSalesPaise += item.amount;
    totalBottles += itemBottles;
    totalCrates += item.crates;
    totalLitres += itemLitres;

    const existing = productMap.get(p.id) || {
      productId: p.id,
      productName: p.name,
      salesPaise: 0,
      crates: 0,
      looseBottles: 0,
      totalBottles: 0,
      volumeLitres: 0
    };

    existing.salesPaise += item.amount;
    existing.crates += item.crates;
    existing.looseBottles += item.looseBottles;
    existing.totalBottles += itemBottles;
    existing.volumeLitres += itemLitres;

    productMap.set(p.id, existing);
  });

  const products: ProductSaleItem[] = Array.from(productMap.values()).map(p => ({
    ...p,
    volumeLitres: Math.round(p.volumeLitres),
    percentage: totalSalesPaise > 0 ? Number(((p.salesPaise / totalSalesPaise) * 100).toFixed(1)) : 0
  })).sort((a, b) => b.salesPaise - a.salesPaise);

  return {
    products,
    totalSalesPaise,
    totalBottles,
    totalCrates,
    totalLitres: Math.round(totalLitres)
  };
}

export async function getProductWiseSales(startOfDay: Date, endOfDay: Date): Promise<ProductSalesData> {
  const saleItems = await prisma.saleItem.findMany({
    where: {
      sale: { saleDate: { gte: startOfDay, lte: endOfDay } }
    },
    include: {
      product: true
    }
  });
  recordQueryMetrics(saleItems.length);
  return getProductWiseSalesFromSales([{ items: saleItems }]);
}

// ---------------------------------------------------------------------------
// 3. TOP CUSTOMERS (WITH LIVE OUTSTANDING BALANCES)
// ---------------------------------------------------------------------------

export async function getTopCustomersFromSales(sales: any[], limit: number = 5): Promise<TopCustomerItem[]> {
  const customerMap = new Map<string, {
    customer: any;
    todaySalesPaise: number;
  }>();

  sales.forEach((s: any) => {
    const c = s.customer;
    if (!c) return;
    const existing = customerMap.get(c.id) || {
      customer: c,
      todaySalesPaise: 0
    };
    existing.todaySalesPaise += s.totalAmount || 0;
    customerMap.set(c.id, existing);
  });

  const sorted = Array.from(customerMap.values())
    .sort((a, b) => b.todaySalesPaise - a.todaySalesPaise)
    .slice(0, limit);

  if (sorted.length === 0) return [];

  // Fetch lifetime totals ONLY for top customers to compute outstanding balance efficiently
  const topCustomerIds = sorted.map(s => s.customer.id);
  const [salesGroup, paymentsGroup] = await Promise.all([
    prisma.sale.groupBy({
      by: ['customerId'],
      where: { customerId: { in: topCustomerIds } },
      _sum: { totalAmount: true }
    }),
    prisma.payment.groupBy({
      by: ['customerId'],
      where: { customerId: { in: topCustomerIds } },
      _sum: { amount: true }
    })
  ]);
  recordQueryMetrics(salesGroup.length + paymentsGroup.length);

  const salesMap = new Map(salesGroup.map(s => [s.customerId, s._sum.totalAmount || 0]));
  const paymentsMap = new Map(paymentsGroup.map(p => [p.customerId, p._sum.amount || 0]));

  return sorted.map(item => {
    const c = item.customer;
    if (!c) return null;
    const base = c.openingBalanceType === 'DEBIT' ? c.openingBalance : -c.openingBalance;
    const outstanding = base + (salesMap.get(c.id) || 0) - (paymentsMap.get(c.id) || 0);

    return {
      customerId: c.id,
      customerName: c.customerName || 'Customer',
      routeName: c.route?.name || 'Unassigned',
      areaName: c.area?.name || 'Unassigned',
      todaySalesPaise: item.todaySalesPaise,
      outstandingPaise: outstanding,
      contact: c.contact || ''
    };
  }).filter((x): x is TopCustomerItem => Boolean(x));
}

export async function getTopCustomers(startOfDay: Date, endOfDay: Date, limit: number = 5): Promise<TopCustomerItem[]> {
  const salesToday = await prisma.sale.findMany({
    where: { saleDate: { gte: startOfDay, lte: endOfDay } },
    include: {
      customer: {
        include: {
          route: true,
          area: true,
        }
      }
    }
  });
  recordQueryMetrics(salesToday.length);
  return getTopCustomersFromSales(salesToday, limit);
}

// ---------------------------------------------------------------------------
// 4. AREA-WISE SALES AGGREGATION
// ---------------------------------------------------------------------------

export function getAreaWiseSalesFromSales(sales: any[]): AreaSaleItem[] {
  const areaMap = new Map<string, {
    areaId: string;
    areaName: string;
    routeName: string;
    salesPaise: number;
    ordersCount: number;
    customerIds: Set<string>;
  }>();

  let totalSales = 0;

  sales.forEach((s: any) => {
    totalSales += s.totalAmount || 0;
    const area = s.customer?.area;
    const areaId = area?.id || 'unassigned';
    const areaName = area?.name || 'Unassigned Area';
    const routeName = s.customer?.route?.name || 'Direct';

    const existing = areaMap.get(areaId) || {
      areaId,
      areaName,
      routeName,
      salesPaise: 0,
      ordersCount: 0,
      customerIds: new Set<string>()
    };

    existing.salesPaise += s.totalAmount || 0;
    existing.ordersCount += 1;
    if (s.customerId) {
      existing.customerIds.add(s.customerId);
    }

    areaMap.set(areaId, existing);
  });

  return Array.from(areaMap.values())
    .map(a => ({
      areaId: a.areaId,
      areaName: a.areaName,
      routeName: a.routeName,
      salesPaise: a.salesPaise,
      ordersCount: a.ordersCount,
      customersCount: a.customerIds.size,
      percentage: totalSales > 0 ? Number(((a.salesPaise / totalSales) * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => b.salesPaise - a.salesPaise);
}

export async function getAreaWiseSales(startOfDay: Date, endOfDay: Date): Promise<AreaSaleItem[]> {
  const sales = await prisma.sale.findMany({
    where: { saleDate: { gte: startOfDay, lte: endOfDay } },
    include: {
      customer: {
        include: {
          area: true,
          route: true
        }
      }
    }
  });
  recordQueryMetrics(sales.length);
  return getAreaWiseSalesFromSales(sales);
}

// ---------------------------------------------------------------------------
// 5. ATTENDANCE AND FIELD ACTIVITY
// ---------------------------------------------------------------------------

export async function getAttendanceAndFieldActivity(
  startOfDay: Date, 
  endOfDay: Date,
  prefetchedSales?: Array<{ salesmanId: string; totalAmount: number }>
): Promise<AttendanceData> {
  const [salesmen, workSessions, visits, sales, payments] = await Promise.all([
    prisma.salesman.findMany({
      where: { isActive: true },
      include: { profile: true }
    }),
    prisma.workSession.findMany({
      where: { workDate: { gte: startOfDay, lte: endOfDay } }
    }),
    prisma.visit.findMany({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      include: {
        customer: {
          include: { area: true }
        }
      }
    }),
    prefetchedSales 
      ? Promise.resolve(prefetchedSales) 
      : prisma.sale.findMany({
          where: { saleDate: { gte: startOfDay, lte: endOfDay } },
          select: { salesmanId: true, totalAmount: true }
        }),
    prisma.payment.findMany({
      where: { paymentDate: { gte: startOfDay, lte: endOfDay } },
      select: { salesmanId: true, amount: true }
    })
  ]);

  recordQueryMetrics(salesmen.length + workSessions.length + visits.length + (prefetchedSales ? 0 : sales.length) + payments.length);

  const totalStaff = salesmen.length;
  let present = 0;
  let working = 0;
  let completed = 0;

  // Track active visits
  const activeVisits = visits.filter(v => v.status === 'STARTED');
  const completedVisits = visits.filter(v => v.status === 'COMPLETED');
  const noSaleVisits = visits.filter(v => Boolean(v.noSaleReason));

  const salesmanPerformance: SalesmanPerformanceItem[] = salesmen.map(s => {
    const session = workSessions.find(ws => ws.salesmanId === s.id);
    let status: 'Working' | 'Completed' | 'Not Started' | 'Inactive' = 'Not Started';

    if (!s.isActive) {
      status = 'Inactive';
    } else if (session) {
      present++;
      if (session.logoutAt || session.status === 'COMPLETED') {
        status = 'Completed';
        completed++;
      } else {
        status = 'Working';
        working++;
      }
    }

    const salesmanSales = sales
      .filter(sale => sale.salesmanId === s.id)
      .reduce((sum, sale) => sum + sale.totalAmount, 0);

    const salesmanCollection = payments
      .filter(payment => payment.salesmanId === s.id)
      .reduce((sum, payment) => sum + payment.amount, 0);

    const salesmanVisits = visits.filter(v => v.salesmanId === s.id);

    // Current activity check
    const currentActiveVisit = activeVisits.find(v => v.salesmanId === s.id);
    let currentAction = status === 'Working' ? 'On Field / Online' : status === 'Completed' ? 'Shift Completed' : 'Offline';
    let currentCustomerName: string | undefined;
    let currentAreaName: string | undefined;

    if (currentActiveVisit && currentActiveVisit.customer) {
      currentAction = 'At Customer Visit';
      currentCustomerName = currentActiveVisit.customer.customerName;
      currentAreaName = currentActiveVisit.customer.area?.name;
    }

    return {
      id: s.id,
      name: s.name,
      employeeCode: s.employeeCode,
      status,
      salesPaise: salesmanSales,
      collectionPaise: salesmanCollection,
      visitsCount: salesmanVisits.length,
      currentAction,
      currentCustomerName,
      currentAreaName
    };
  });

  const absent = Math.max(0, totalStaff - present);
  const attendancePercent = totalStaff > 0 ? Math.round((present / totalStaff) * 100) : 0;

  return {
    totalStaff,
    present,
    working,
    completed,
    absent,
    attendancePercent,
    activeVisits: activeVisits.length,
    completedVisits: completedVisits.length,
    noSaleVisits: noSaleVisits.length,
    totalVisitsToday: visits.length,
    salesmen: salesmanPerformance
  };
}

// ---------------------------------------------------------------------------
// 6. OPERATIONAL ALERTS (ACTIONABLE ALERTS)
// ---------------------------------------------------------------------------

export async function getOperationalAlerts(
  startOfDay: Date, 
  endOfDay: Date, 
  isToday: boolean
): Promise<OperationalAlert[]> {
  const alerts: OperationalAlert[] = [];

  const [unassignedAreas, activeCustomers, salesGroup, paymentsGroup, unstartedSalesmen, noSaleVisits] = await Promise.all([
    // Areas with no assigned salesman
    prisma.area.findMany({
      where: { assignments: { none: {} } },
      include: { route: true },
      take: 5
    }),
    // Customers with balance data (lightweight query without nested relations)
    prisma.customer.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        openingBalance: true,
        openingBalanceType: true,
      }
    }),
    prisma.sale.groupBy({
      by: ['customerId'],
      _sum: { totalAmount: true }
    }),
    prisma.payment.groupBy({
      by: ['customerId'],
      _sum: { amount: true }
    }),
    // Salesmen not logged in today
    prisma.salesman.findMany({
      where: {
        isActive: true,
        workSessions: {
          none: {
            workDate: { gte: startOfDay, lte: endOfDay }
          }
        }
      },
      select: { id: true, name: true, employeeCode: true }
    }),
    // Visits with no sale logged today
    prisma.visit.findMany({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
        noSaleReason: { not: null }
      },
      include: {
        customer: { select: { customerName: true } },
        salesman: { select: { name: true } }
      },
      take: 5
    })
  ]);

  const salesMap = new Map(salesGroup.map(s => [s.customerId, s._sum.totalAmount || 0]));
  const paymentsMap = new Map(paymentsGroup.map(p => [p.customerId, p._sum.amount || 0]));

  // 1. Overdue Customers Alert (Dues > ₹10,000 / 1,000,000 paise)
  let highDuesCount = 0;
  let highDuesTotal = 0;
  activeCustomers.forEach(c => {
    const base = c.openingBalanceType === 'DEBIT' ? c.openingBalance : -c.openingBalance;
    const out = base + (salesMap.get(c.id) || 0) - (paymentsMap.get(c.id) || 0);
    if (out > 1000000) { // > ₹10,000
      highDuesCount++;
      highDuesTotal += out;
    }
  });

  if (highDuesCount > 0) {
    alerts.push({
      id: 'alert-overdue',
      severity: 'danger',
      category: 'dues',
      title: 'High Market Dues',
      description: `${highDuesCount} customers have outstanding balances exceeding ₹10,000.`,
      metric: `₹${(highDuesTotal / 100).toLocaleString('en-IN')}`,
      timestamp: 'Today',
      actionHref: '/dashboard/admin/reports/outstanding',
      actionLabel: 'Review Dues'
    });
  }

  // 2. Staff Attendance Alert (if during working hours and it's today)
  const now = getCurrentKolkataTime();
  if (isToday && isWorkingHours(now) && unstartedSalesmen.length > 0) {
    alerts.push({
      id: 'alert-staff-unstarted',
      severity: 'warning',
      category: 'staff',
      title: 'Unstarted Staff Shifts',
      description: `${unstartedSalesmen.length} active field salesmen have not checked in yet today.`,
      metric: `${unstartedSalesmen.length} staff`,
      timestamp: 'Working Hours',
      actionHref: '/dashboard/admin/sessions',
      actionLabel: 'View Sessions'
    });
  }

  // 3. Unassigned Territory Alert
  if (unassignedAreas.length > 0) {
    alerts.push({
      id: 'alert-unassigned-areas',
      severity: 'info',
      category: 'territory',
      title: 'Unassigned Areas',
      description: `${unassignedAreas.length} distribution areas have no dedicated field salesman assigned.`,
      metric: `${unassignedAreas.length} areas`,
      timestamp: 'Territory Master',
      actionHref: '/dashboard/admin/routes',
      actionLabel: 'Assign Territory'
    });
  }

  // 4. No-Sale Visits Alert
  if (noSaleVisits.length > 0) {
    alerts.push({
      id: 'alert-no-sales',
      severity: 'warning',
      category: 'visits',
      title: 'No-Sale Visits Logged',
      description: `${noSaleVisits.length} visits ended with no sale recorded today.`,
      metric: `${noSaleVisits.length} visits`,
      timestamp: 'Today',
      actionHref: '/dashboard/admin/reports/daily',
      actionLabel: 'View Visits'
    });
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// 7. INVENTORY AND DISPATCH (DERIVED FROM SALE ITEMS & PRODUCT MASTERS)
// ---------------------------------------------------------------------------

export function getInventoryAndDispatchesFromSales(sales: any[]): DispatchSummary {
  const saleItems = sales.flatMap(s => s.items || []);
  const byProductMap = new Map<string, DispatchProductItem>();
  let totalCrates = 0;
  let totalLooseBottles = 0;
  let totalBottles = 0;
  let totalLitres = 0;

  saleItems.forEach((item: any) => {
    const p = item.product;
    if (!p) return;
    const bottleLitres = parseProductLitresPerBottle(p.name);
    const itemBottles = item.crates * p.bottlesPerCrate + item.looseBottles;
    const itemLitres = itemBottles * bottleLitres;

    totalCrates += item.crates;
    totalLooseBottles += item.looseBottles;
    totalBottles += itemBottles;
    totalLitres += itemLitres;

    const existing = byProductMap.get(p.id) || {
      productId: p.id,
      productName: p.name,
      crates: 0,
      looseBottles: 0,
      totalBottles: 0,
      volumeLitres: 0
    };

    existing.crates += item.crates;
    existing.looseBottles += item.looseBottles;
    existing.totalBottles += itemBottles;
    existing.volumeLitres += itemLitres;

    byProductMap.set(p.id, existing);
  });

  return {
    totalCrates,
    totalLooseBottles,
    totalBottles,
    totalLitres: Math.round(totalLitres),
    byProduct: Array.from(byProductMap.values()).map(p => ({
      ...p,
      volumeLitres: Math.round(p.volumeLitres)
    })).sort((a, b) => b.totalBottles - a.totalBottles)
  };
}

export async function getInventoryAndDispatches(
  startOfDay: Date, 
  endOfDay: Date
): Promise<DispatchSummary> {
  const saleItems = await prisma.saleItem.findMany({
    where: {
      sale: { saleDate: { gte: startOfDay, lte: endOfDay } }
    },
    include: {
      product: true
    }
  });
  recordQueryMetrics(saleItems.length);
  return getInventoryAndDispatchesFromSales([{ items: saleItems }]);
}

// ---------------------------------------------------------------------------
// 8. PRODUCTION SUMMARY (BATCHES RUN FOR SELECTED DATE)
// ---------------------------------------------------------------------------

export async function getProductionSummary(startOfDay: Date, endOfDay: Date): Promise<ProductionSummary> {
  const batches = await prisma.productionBatch.findMany({
    where: { productionDate: { gte: startOfDay, lte: endOfDay } },
    select: { cratesProduced: true, looseBottles: true, volumeLitres: true }
  });

  let todayCrates = 0;
  let todayLooseBottles = 0;
  let todayLitres = 0;
  for (const b of batches) {
    todayCrates += b.cratesProduced;
    todayLooseBottles += b.looseBottles;
    todayLitres += b.volumeLitres;
  }

  return {
    todayCrates,
    todayLooseBottles,
    todayLitres: Math.round(todayLitres),
    batchesCount: batches.length
  };
}

// ---------------------------------------------------------------------------
// 8B. PURCHASE SUMMARY (MATERIALS PURCHASED IN REPORTING PERIOD)
// ---------------------------------------------------------------------------

export async function getPurchaseSummary(startOfDay: Date, endOfDay: Date): Promise<PurchaseSummary> {
  try {
    const purchases = await prisma.purchase.findMany({
      where: { purchaseDate: { gte: startOfDay, lte: endOfDay } },
      include: { items: true },
    });

    let todayTotalAmountPaise = 0;
    let todayPaidPaise = 0;
    let todayOutstandingPaise = 0;
    let todayQuantity = 0;

    for (const p of purchases) {
      todayTotalAmountPaise += p.totalAmount || 0;
      todayPaidPaise += p.paidAmount || 0;
      todayOutstandingPaise += ((p.totalAmount || 0) - (p.paidAmount || 0));
      for (const item of (p.items || [])) {
        todayQuantity += item.quantity || 0;
      }
    }

    return {
      todayTotalAmountPaise,
      todayPaidPaise,
      todayOutstandingPaise,
      todayQuantity: Math.round(todayQuantity),
      purchasesCount: purchases.length,
    };
  } catch (err) {
    console.warn('[dashboard-data] Safe fallback for getPurchaseSummary:', err);
    return {
      todayTotalAmountPaise: 0,
      todayPaidPaise: 0,
      todayOutstandingPaise: 0,
      todayQuantity: 0,
      purchasesCount: 0,
    };
  }
}

// ---------------------------------------------------------------------------
// 9. STOCK SUMMARY (FINISHED PRODUCT CRATES IN INVENTORY)
// ---------------------------------------------------------------------------

export async function getStockSummary(asOfDate?: Date): Promise<StockSummary> {
  const dateKey = asOfDate ? getKolkataDateString(asOfDate) : 'today';
  return getOrComputeCached(`stock_summary_${dateKey}`, 60000, async () => {
    const isHistorical = Boolean(asOfDate && asOfDate.getTime() < getKolkataStartOfDay().getTime());
    const whereBatch = isHistorical ? { productionDate: { lte: asOfDate! } } : {};
    const whereSale = isHistorical ? { sale: { saleDate: { lte: asOfDate! } } } : {};

    const [prodAggregate, soldAggregate] = await Promise.all([
      prisma.productionBatch.aggregate({
        where: whereBatch,
        _sum: { cratesProduced: true, volumeLitres: true }
      }),
      prisma.saleItem.aggregate({
        where: whereSale,
        _sum: { crates: true }
      })
    ]);

    recordQueryMetrics(2);

    const producedCrates = prodAggregate._sum.cratesProduced || 0;
    const soldCrates = soldAggregate._sum.crates || 0;
    const availableCrates = Math.max(0, producedCrates - soldCrates);
    const availableLitres = Math.round(Math.max(0, prodAggregate._sum.volumeLitres || 0));

    return {
      totalAvailableCrates: availableCrates,
      totalAvailableLitres: availableLitres
    };
  });
}

// ---------------------------------------------------------------------------
// 10. EXPENSES SUMMARY (TODAY + MTD)
// ---------------------------------------------------------------------------

export async function getExpensesSummary(
  startOfDay: Date,
  endOfDay: Date,
  targetDate: Date
): Promise<ExpenseSummary> {
  const targetDetails = getKolkataTimeDetails(targetDate);
  const startOfMonth = getKolkataStartOfDay(new Date(Date.UTC(targetDetails.year, targetDetails.month - 1, 1)));

  const [todayExpensesAgg, monthExpensesAgg, countToday] = await Promise.all([
    prisma.expense.aggregate({
      where: { expenseDate: { gte: startOfDay, lte: endOfDay } },
      _sum: { amount: true }
    }),
    prisma.expense.aggregate({
      where: { expenseDate: { gte: startOfMonth, lte: endOfDay } },
      _sum: { amount: true }
    }),
    prisma.expense.count({
      where: { expenseDate: { gte: startOfDay, lte: endOfDay } }
    })
  ]);

  return {
    todayExpensesPaise: todayExpensesAgg._sum.amount || 0,
    monthExpensesPaise: monthExpensesAgg._sum.amount || 0,
    expensesCount: countToday
  };
}

// ---------------------------------------------------------------------------
// 11. CUSTOMER ACTIVITY (ACTIVE PURCHASERS TODAY)
// ---------------------------------------------------------------------------

export async function getCustomerActivity(
  startOfDay: Date,
  endOfDay: Date,
  totalActiveCustomers: number,
  prefetchedCustomerIds?: string[]
): Promise<CustomerActivitySummary> {
  let purchasedTodayCount = 0;
  if (prefetchedCustomerIds) {
    purchasedTodayCount = new Set(prefetchedCustomerIds).size;
  } else {
    const salesToday = await prisma.sale.findMany({
      where: { saleDate: { gte: startOfDay, lte: endOfDay } },
      select: { customerId: true }
    });
    recordQueryMetrics(salesToday.length);
    purchasedTodayCount = new Set(salesToday.map((s) => s.customerId)).size;
  }

  const purchasePercentage =
    totalActiveCustomers > 0
      ? Number(((purchasedTodayCount / totalActiveCustomers) * 100).toFixed(1))
      : 0;

  return {
    totalActiveCustomers,
    purchasedTodayCount,
    purchasePercentage
  };
}

// ---------------------------------------------------------------------------
// 12. PAYROLL SUMMARY (SALARY LIABILITY & ACTIVE STAFF)
// ---------------------------------------------------------------------------

export async function getPayrollSummary(targetDate: Date): Promise<PayrollSummary> {
  const targetDetails = getKolkataTimeDetails(targetDate);
  const [activeStaff, monthPayrolls] = await Promise.all([
    prisma.staffMember.findMany({
      where: { isActive: true },
      select: { monthlySalary: true }
    }),
    prisma.payrollRecord.aggregate({
      where: {
        month: targetDetails.month,
        year: targetDetails.year,
        status: 'PAID'
      },
      _sum: { netPayable: true }
    })
  ]);

  const monthlyLiabilityPaise = activeStaff.reduce((sum, s) => sum + s.monthlySalary, 0);

  return {
    activeStaffCount: activeStaff.length,
    monthlyLiabilityPaise,
    paidThisMonthPaise: monthPayrolls._sum.netPayable || 0
  };
}

let cachedMetaCounts: { data: [number, number, number, number]; expiresAt: number } | null = null;
export async function getCachedMetaCounts(): Promise<[number, number, number, number]> {
  const now = Date.now();
  if (cachedMetaCounts && cachedMetaCounts.expiresAt > now) {
    return cachedMetaCounts.data;
  }
  const counts = await Promise.all([
    prisma.customer.count(),
    prisma.customer.count({ where: { status: 'ACTIVE' } }),
    prisma.route.count({ where: { isActive: true } }),
    prisma.area.count(),
  ]);
  recordQueryMetrics(4);
  cachedMetaCounts = { data: counts, expiresAt: now + 300000 };
  return counts;
}

// ---------------------------------------------------------------------------
// MAIN EXECUTIVE DASHBOARD AGGREGATOR
// ---------------------------------------------------------------------------

export async function getDashboardExecutiveData(dateStr?: string): Promise<DashboardExecutiveData> {
  const now = getCurrentKolkataTime();
  const selectedDate = (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) ? dateStr : getKolkataDateString(now);
  const cacheKey = `dashboard_exec_${selectedDate}`;

  return getOrComputeCached(cacheKey, 45000, async () => {
    const isToday = selectedDate === getKolkataDateString(now);

    const startOfDay = getKolkataStartOfDay(selectedDate);
    const endOfDay = getKolkataEndOfDay(selectedDate);

    const targetDate = new Date(selectedDate);

    // Parallel resilient execution of all core modules + system metadata
    const safeRun = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try {
        return await fn();
      } catch (err) {
        console.warn('[dashboard-data] Safe query fallback used:', err);
        return fallback;
      }
    };

    // 1. Parallel fetch: salesToday (one single query for all sale data) + domain aggregates
    const [
      salesToday,
      trendsResult,
      alerts,
      expenses,
      production,
      purchase,
      stock,
      payroll,
      metaCounts
    ] = await Promise.all([
      safeRun(
        () =>
          prisma.sale.findMany({
            where: { saleDate: { gte: startOfDay, lte: endOfDay } },
            include: {
              customer: {
                include: {
                  route: true,
                  area: true,
                },
              },
              items: {
                include: {
                  product: true,
                },
              },
            },
          }),
        []
      ),
      safeRun(
        () => getSalesAndCollectionTrends(selectedDate),
        {
          trends: {
            points: [],
            todaySalesPaise: 0,
            yesterdaySalesPaise: 0,
            salesChangePercent: 0,
            todayCollectionsPaise: 0,
            yesterdayCollectionsPaise: 0,
            collectionsChangePercent: 0,
            totalMarketDuesPaise: 0,
            todayDispatchedLitres: 0,
            yesterdayDispatchedLitres: 0,
            dispatchedLitresChangePercent: 0,
          },
          sevenDaysList: [],
        }
      ),
      safeRun(() => getOperationalAlerts(startOfDay, endOfDay, isToday), []),
      safeRun(
        () => getExpensesSummary(startOfDay, endOfDay, targetDate),
        { todayExpensesPaise: 0, monthExpensesPaise: 0, expensesCount: 0 }
      ),
      safeRun(
        () => getProductionSummary(startOfDay, endOfDay),
        { todayCrates: 0, todayLooseBottles: 0, todayLitres: 0, batchesCount: 0 }
      ),
      safeRun(
        () => getPurchaseSummary(startOfDay, endOfDay),
        {
          todayTotalAmountPaise: 0,
          todayPaidPaise: 0,
          todayOutstandingPaise: 0,
          todayQuantity: 0,
          purchasesCount: 0,
        }
      ),
      safeRun(
        () => getStockSummary(endOfDay),
        { totalAvailableCrates: 0, totalAvailableLitres: 0 }
      ),
      safeRun(
        () => getPayrollSummary(targetDate),
        { activeStaffCount: 0, monthlyLiabilityPaise: 0, paidThisMonthPaise: 0 }
      ),
      safeRun(() => getCachedMetaCounts(), [0, 0, 0, 0]),
    ]);

    recordQueryMetrics(salesToday.length);

    // 2. Derive Product Sales, Dispatches, Area Sales, and Top Customers from salesToday in memory
    const productSales = getProductWiseSalesFromSales(salesToday);
    const dispatches = getInventoryAndDispatchesFromSales(salesToday);
    const areaSales = getAreaWiseSalesFromSales(salesToday);
    const topCustomers = await safeRun(() => getTopCustomersFromSales(salesToday, 10), []);

    // 3. Attendance query reusing prefetched sales to eliminate extra query
    const attendance = await safeRun(
      () => getAttendanceAndFieldActivity(startOfDay, endOfDay, salesToday),
      {
        totalStaff: 0,
        present: 0,
        working: 0,
        completed: 0,
        absent: 0,
        attendancePercent: 0,
        activeVisits: 0,
        completedVisits: 0,
        noSaleVisits: 0,
        totalVisitsToday: 0,
        salesmen: [],
      }
    );

    // 4. Customer Activity reusing prefetched customer IDs
    const activeCustomersCount = metaCounts[1];
    const customerIdsToday = salesToday.map(s => s.customerId);
    const customerActivity = await getCustomerActivity(startOfDay, endOfDay, activeCustomersCount, customerIdsToday);

    // Cash flow is actual collections received today minus actual cash/bank expense outflows today
    const cashFlow: CashFlowSummary = {
      inflowPaise: trendsResult.trends.todayCollectionsPaise,
      outflowPaise: expenses.todayExpensesPaise,
      netPaise: trendsResult.trends.todayCollectionsPaise - expenses.todayExpensesPaise
    };

    return {
      selectedDate,
      isToday,
      trends: trendsResult.trends,
      productSales,
      topCustomers,
      areaSales,
      attendance,
      alerts,
      dispatches,
      expenses,
      production,
      purchase,
      stock,
      cashFlow,
      customerActivity,
      payroll,
      meta: {
        totalCustomersCount: metaCounts[0],
        activeCustomersCount: metaCounts[1],
        activeRoutesCount: metaCounts[2],
        totalAreasCount: metaCounts[3]
      }
    };
  });
}
