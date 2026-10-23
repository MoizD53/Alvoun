import { prisma } from '@/lib/db';
import { getCurrentKolkataTime, getKolkataDateString } from '@/lib/time';
import DailyRegisterClient from './DailyRegisterClient';

export default async function DailyReportsPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const resolvedParams = await searchParams;
  const now = getCurrentKolkataTime();
  const todayStr = getKolkataDateString(now);

  // Single universal calendar reporting date support
  const targetDate = resolvedParams.date || resolvedParams.from || todayStr;
  const fromDate = resolvedParams.from || targetDate;
  const toDate = resolvedParams.to || targetDate;

  const start = new Date(`${fromDate}T00:00:00+05:30`);
  const end = new Date(`${toDate}T23:59:59+05:30`);

  const [products, sales, payments, visits] = await Promise.all([
    prisma.product.findMany({
      orderBy: { bottlesPerCrate: 'desc' } // 1L, 500ml, 250ml
    }),
    prisma.sale.findMany({
      where: { saleDate: { gte: start, lte: end } },
      include: { 
        items: true,
        customer: { include: { route: true, area: true } }
      }
    }),
    prisma.payment.findMany({
      where: { paymentDate: { gte: start, lte: end } },
      include: {
        customer: { include: { route: true, area: true } }
      }
    }),
    prisma.visit.findMany({
      where: { createdAt: { gte: start, lte: end } }
    })
  ]);

  const daysMap = new Map<string, any>();

  const ensureCustomerDay = (dateStr: string, customerId: string, customerRef?: any) => {
    if (!daysMap.has(dateStr)) {
      daysMap.set(dateStr, {
        dateStr,
        customers: new Map<string, any>(),
        dayTotals: {
          productQuantities: {} as Record<string, number>,
          totalCrates: 0,
          saleAmount: 0,
          receivedAmount: 0,
          dueAmount: 0
        }
      });
    }
    const dayObj = daysMap.get(dateStr);
    
    if (!dayObj.customers.has(customerId)) {
      dayObj.customers.set(customerId, {
        customerId,
        customerName: customerRef?.customerName || 'Unknown Customer',
        customerCode: customerRef?.code || null,
        contact: customerRef?.contact || '',
        routeId: customerRef?.route?.id || 'unassigned',
        routeName: customerRef?.route?.name || 'Direct / Unassigned Route',
        areaId: customerRef?.area?.id || 'unassigned',
        areaName: customerRef?.area?.name || 'General Sector',
        productQuantities: {} as Record<string, number>,
        totalCrates: 0,
        saleAmount: 0,
        receivedAmount: 0,
        dueAmount: 0,
        transactions: [] as any[]
      });
    }
    return { dayObj, customerObj: dayObj.customers.get(customerId) };
  };

  const getDateStr = (d: Date) => {
    const istTime = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
    return istTime.toISOString().split('T')[0];
  };

  const getTimeStr = (d: Date) => {
    const istTime = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
    return istTime.toISOString().split('T')[1].substring(0, 5);
  };

  // Process Sales
  sales.forEach((s: any) => {
    const dateStr = getDateStr(s.saleDate);
    const { dayObj, customerObj } = ensureCustomerDay(dateStr, s.customerId, s.customer);

    customerObj.saleAmount += s.totalAmount;
    dayObj.dayTotals.saleAmount += s.totalAmount;

    let totalCratesSale = 0;
    const salePQs: Record<string, number> = {};
    
    s.items.forEach((item: any) => {
      const q = item.crates;
      customerObj.productQuantities[item.productId] = (customerObj.productQuantities[item.productId] || 0) + q;
      dayObj.dayTotals.productQuantities[item.productId] = (dayObj.dayTotals.productQuantities[item.productId] || 0) + q;
      customerObj.totalCrates += q;
      dayObj.dayTotals.totalCrates += q;
      
      totalCratesSale += q;
      salePQs[item.productId] = q;
    });

    customerObj.transactions.push({
      type: 'SALE',
      id: s.id,
      time: getTimeStr(s.saleDate),
      productQuantities: salePQs,
      amount: s.totalAmount
    });
  });

  // Process Payments
  payments.forEach((p: any) => {
    const dateStr = getDateStr(p.paymentDate);
    const { dayObj, customerObj } = ensureCustomerDay(dateStr, p.customerId, p.customer);

    customerObj.receivedAmount += p.amount;
    dayObj.dayTotals.receivedAmount += p.amount;

    customerObj.transactions.push({
      type: 'PAYMENT',
      id: p.id,
      time: getTimeStr(p.paymentDate),
      amount: p.amount
    });
  });

  // Build hierarchical breakdown: Routes -> Areas -> Customers
  let globalSales = 0;
  let globalColl = 0;
  let globalCrates = 0;
  const uniqueCustomers = new Set<string>();

  const daysList = Array.from(daysMap.values()).map(day => {
    const customersList = Array.from(day.customers.values()).map((c: any) => {
      c.dueAmount = c.saleAmount - c.receivedAmount;
      day.dayTotals.dueAmount += c.dueAmount;
      
      globalSales += c.saleAmount;
      globalColl += c.receivedAmount;
      globalCrates += c.totalCrates;
      uniqueCustomers.add(c.customerId);
      
      c.transactions.sort((a: any, b: any) => a.time.localeCompare(b.time));
      return c;
    });

    // Group customers by Route -> Area
    const routesMap = new Map<string, any>();
    customersList.forEach((c: any) => {
      if (!routesMap.has(c.routeId)) {
        routesMap.set(c.routeId, {
          routeId: c.routeId,
          routeName: c.routeName,
          totalSales: 0,
          totalReceived: 0,
          totalDue: 0,
          totalCrates: 0,
          productQuantities: {} as Record<string, number>,
          areas: new Map<string, any>()
        });
      }
      const routeObj = routesMap.get(c.routeId);
      routeObj.totalSales += c.saleAmount;
      routeObj.totalReceived += c.receivedAmount;
      routeObj.totalDue += c.dueAmount;
      routeObj.totalCrates += c.totalCrates;
      Object.entries(c.productQuantities).forEach(([pId, qty]) => {
        routeObj.productQuantities[pId] = (routeObj.productQuantities[pId] || 0) + (qty as number);
      });

      if (!routeObj.areas.has(c.areaId)) {
        routeObj.areas.set(c.areaId, {
          areaId: c.areaId,
          areaName: c.areaName,
          totalSales: 0,
          totalReceived: 0,
          totalDue: 0,
          totalCrates: 0,
          productQuantities: {} as Record<string, number>,
          customers: []
        });
      }
      const areaObj = routeObj.areas.get(c.areaId);
      areaObj.totalSales += c.saleAmount;
      areaObj.totalReceived += c.receivedAmount;
      areaObj.totalDue += c.dueAmount;
      areaObj.totalCrates += c.totalCrates;
      Object.entries(c.productQuantities).forEach(([pId, qty]) => {
        areaObj.productQuantities[pId] = (areaObj.productQuantities[pId] || 0) + (qty as number);
      });
      areaObj.customers.push(c);
    });

    // Convert to nested arrays
    const routes = Array.from(routesMap.values()).map((r: any) => ({
      ...r,
      areas: Array.from(r.areas.values())
    })).sort((a, b) => b.totalSales - a.totalSales);

    return {
      dateStr: day.dateStr,
      dayTotals: day.dayTotals,
      customers: customersList,
      routes
    };
  }).sort((a, b) => b.dateStr.localeCompare(a.dateStr));

  const summary = {
    salesAmount: globalSales,
    collectionAmount: globalColl,
    dueAmount: globalSales - globalColl,
    totalCrates: globalCrates,
    visits: visits.length,
    uniqueCustomers: uniqueCustomers.size
  };

  return (
    <DailyRegisterClient 
      days={daysList}
      products={products}
      fromDate={fromDate}
      toDate={toDate}
      summary={summary}
    />
  );
}
