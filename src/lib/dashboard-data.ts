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

  // Parallel queries across the 7-day range
  const [rangeSales, rangePayments, rangeVisits, allSalesAgg, allPaymentsAgg, customerBalances, rangeSaleItems] = await Promise.all([
    prisma.sale.findMany({
      where: { saleDate: { gte: rangeStart, lte: rangeEnd } },
      select: { saleDate: true, totalAmount: true }
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
    prisma.customer.findMany({
      select: { openingBalance: true, openingBalanceType: true }
    }),
    prisma.saleItem.findMany({
      where: {
        sale: { saleDate: { gte: rangeStart, lte: rangeEnd } }
      },
      select: {
        crates: true,
        looseBottles: true,
        sale: { select: { saleDate: true } },
        product: { select: { name: true, bottlesPerCrate: true } }
      }
    })
  ]);

  // Aggregate Market Dues
  const totalOpening = customerBalances.reduce((sum, c) => {
    return sum + (c.openingBalanceType === 'DEBIT' ? c.openingBalance : -c.openingBalance);
  }, 0);
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

  rangeSaleItems.forEach(item => {
    const key = getKolkataDateString(item.sale.saleDate);
    const bucket = dayBuckets.get(key);
    if (bucket) {
      const bottleLitres = parseProductLitresPerBottle(item.product.name);
      const bottles = item.crates * item.product.bottlesPerCrate + item.looseBottles;
      bucket.litres += bottles * bottleLitres;
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

export async function getProductWiseSales(startOfDay: Date, endOfDay: Date): Promise<ProductSalesData> {
  const saleItems = await prisma.saleItem.findMany({
    where: {
      sale: { saleDate: { gte: startOfDay, lte: endOfDay } }
    },
    include: {
      product: true
    }
  });

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

  saleItems.forEach(item => {
    const p = item.product;
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

// ---------------------------------------------------------------------------
// 3. TOP CUSTOMERS (WITH LIVE OUTSTANDING BALANCES)
// ---------------------------------------------------------------------------

export async function getTopCustomers(startOfDay: Date, endOfDay: Date, limit: number = 5): Promise<TopCustomerItem[]> {
  const salesToday = await prisma.sale.findMany({
    where: { saleDate: { gte: startOfDay, lte: endOfDay } },
    include: {
      customer: {
        include: {
          route: true,
          area: true,
          sales: { select: { totalAmount: true } },
          payments: { select: { amount: true } }
        }
      }
    }
  });

  const customerMap = new Map<string, {
    customer: typeof salesToday[0]['customer'];
    todaySalesPaise: number;
  }>();

  salesToday.forEach(s => {
    const c = s.customer;
    const existing = customerMap.get(c.id) || {
      customer: c,
      todaySalesPaise: 0
    };
    existing.todaySalesPaise += s.totalAmount;
    customerMap.set(c.id, existing);
  });

  const sorted = Array.from(customerMap.values())
    .sort((a, b) => b.todaySalesPaise - a.todaySalesPaise)
    .slice(0, limit);

  return sorted.map(item => {
    const c = item.customer;
    const outstanding = calculateOutstanding(c as any);

    return {
      customerId: c.id,
      customerName: c.customerName,
      routeName: c.route?.name || 'Unassigned',
      areaName: c.area?.name || 'Unassigned',
      todaySalesPaise: item.todaySalesPaise,
      outstandingPaise: outstanding,
      contact: c.contact
    };
  });
}

// ---------------------------------------------------------------------------
// 4. AREA-WISE SALES AGGREGATION
// ---------------------------------------------------------------------------

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

  const areaMap = new Map<string, {
    areaId: string;
    areaName: string;
    routeName: string;
    salesPaise: number;
    ordersCount: number;
    customerIds: Set<string>;
  }>();

  let totalSales = 0;

  sales.forEach(s => {
    totalSales += s.totalAmount;
    const area = s.customer.area;
    const areaId = area?.id || 'unassigned';
    const areaName = area?.name || 'Unassigned Area';
    const routeName = s.customer.route?.name || 'Direct';

    const existing = areaMap.get(areaId) || {
      areaId,
      areaName,
      routeName,
      salesPaise: 0,
      ordersCount: 0,
      customerIds: new Set<string>()
    };

    existing.salesPaise += s.totalAmount;
    existing.ordersCount += 1;
    existing.customerIds.add(s.customerId);

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

// ---------------------------------------------------------------------------
// 5. ATTENDANCE AND FIELD ACTIVITY
// ---------------------------------------------------------------------------

export async function getAttendanceAndFieldActivity(
  startOfDay: Date, 
  endOfDay: Date
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
    prisma.sale.findMany({
      where: { saleDate: { gte: startOfDay, lte: endOfDay } },
      select: { salesmanId: true, totalAmount: true }
    }),
    prisma.payment.findMany({
      where: { paymentDate: { gte: startOfDay, lte: endOfDay } },
      select: { salesmanId: true, amount: true }
    })
  ]);

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

    if (currentActiveVisit) {
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

  const [unassignedAreas, activeCustomers, unstartedSalesmen, noSaleVisits] = await Promise.all([
    // Areas with no assigned salesman
    prisma.area.findMany({
      where: { assignments: { none: {} } },
      include: { route: true },
      take: 5
    }),
    // Customers with balance data
    prisma.customer.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        customerName: true,
        openingBalance: true,
        openingBalanceType: true,
        sales: { select: { totalAmount: true } },
        payments: { select: { amount: true } }
      }
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

  // 1. Overdue Customers Alert (Dues > ₹10,000 / 1,000,000 paise)
  let highDuesCount = 0;
  let highDuesTotal = 0;
  activeCustomers.forEach(c => {
    const out = calculateOutstanding(c as any);
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

  const byProductMap = new Map<string, DispatchProductItem>();
  let totalCrates = 0;
  let totalLooseBottles = 0;
  let totalBottles = 0;
  let totalLitres = 0;

  saleItems.forEach(item => {
    const p = item.product;
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

// ---------------------------------------------------------------------------
// MAIN EXECUTIVE DASHBOARD AGGREGATOR
// ---------------------------------------------------------------------------

export async function getDashboardExecutiveData(dateStr?: string): Promise<DashboardExecutiveData> {
  const now = getCurrentKolkataTime();
  const selectedDate = dateStr || getKolkataDateString(now);
  const isToday = selectedDate === getKolkataDateString(now);

  const startOfDay = getKolkataStartOfDay(selectedDate);
  const endOfDay = getKolkataEndOfDay(selectedDate);

  // Parallel execution of all 7 core modules + system metadata
  const [
    trendsResult,
    productSales,
    topCustomers,
    areaSales,
    attendance,
    alerts,
    dispatches,
    metaCounts
  ] = await Promise.all([
    getSalesAndCollectionTrends(selectedDate),
    getProductWiseSales(startOfDay, endOfDay),
    getTopCustomers(startOfDay, endOfDay, 5),
    getAreaWiseSales(startOfDay, endOfDay),
    getAttendanceAndFieldActivity(startOfDay, endOfDay),
    getOperationalAlerts(startOfDay, endOfDay, isToday),
    getInventoryAndDispatches(startOfDay, endOfDay),
    Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { status: 'ACTIVE' } }),
      prisma.route.count({ where: { isActive: true } }),
      prisma.area.count()
    ])
  ]);

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
    meta: {
      totalCustomersCount: metaCounts[0],
      activeCustomersCount: metaCounts[1],
      activeRoutesCount: metaCounts[2],
      totalAreasCount: metaCounts[3]
    }
  };
}
