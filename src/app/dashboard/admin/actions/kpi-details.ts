'use server';

import { prisma } from '@/lib/db';
import { getKolkataStartOfDay, getKolkataEndOfDay } from '@/lib/time';
import { calculateOutstanding } from '@/lib/outstanding';

export async function getSalesDetails(dateStr: string | undefined) {
  const startOfDay = getKolkataStartOfDay(dateStr);
  const endOfDay = getKolkataEndOfDay(dateStr);

  const sales = await prisma.sale.findMany({
    where: { saleDate: { gte: startOfDay, lte: endOfDay } },
    include: { salesman: true, items: true },
  });

  const total = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const orders = sales.length;
  const avgOrder = orders > 0 ? total / orders : 0;

  const salesmanBreakdown = sales.reduce((acc, sale) => {
    if (!acc[sale.salesmanId]) {
      acc[sale.salesmanId] = { name: sale.salesman.name, amount: 0 };
    }
    acc[sale.salesmanId].amount += sale.totalAmount;
    return acc;
  }, {} as Record<string, { name: string; amount: number }>);

  return {
    total,
    orders,
    avgOrder,
    salesmen: Object.values(salesmanBreakdown).sort((a, b) => b.amount - a.amount),
  };
}

export async function getCollectionDetails(dateStr: string | undefined) {
  const startOfDay = getKolkataStartOfDay(dateStr);
  const endOfDay = getKolkataEndOfDay(dateStr);

  const payments = await prisma.payment.findMany({
    where: { paymentDate: { gte: startOfDay, lte: endOfDay } },
    include: { salesman: true },
  });

  const total = payments.reduce((sum, payment) => sum + payment.amount, 0);

  const methodBreakdown = payments.reduce((acc, payment) => {
    const method = payment.paymentMethod || 'Other';
    acc[method] = (acc[method] || 0) + payment.amount;
    return acc;
  }, {} as Record<string, number>);

  const salesmanBreakdown = payments.reduce((acc, payment) => {
    if (!acc[payment.salesmanId]) {
      acc[payment.salesmanId] = { name: payment.salesman.name, amount: 0 };
    }
    acc[payment.salesmanId].amount += payment.amount;
    return acc;
  }, {} as Record<string, { name: string; amount: number }>);

  return {
    total,
    methods: Object.entries(methodBreakdown).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount),
    salesmen: Object.values(salesmanBreakdown).sort((a, b) => b.amount - a.amount),
  };
}

export async function getOutstandingDetails() {
  const allCustomers = await prisma.customer.findMany({
    include: { sales: { include: { items: true } }, payments: true },
  });

  let totalOutstanding = 0;
  let customersWithDues = 0;
  const customerOutstandings: { name: string; amount: number }[] = [];
  const ranges = {
    '0–5,000': 0,
    '5,000–10,000': 0,
    '10,000+': 0,
  };

  for (const c of allCustomers) {
    const out = calculateOutstanding(c as any);
    if (out > 0) {
      totalOutstanding += out;
      customersWithDues++;
      customerOutstandings.push({ name: c.customerName, amount: out });

      if (out <= 500000) ranges['0–5,000']++; // 5000 * 100 paise
      else if (out <= 1000000) ranges['5,000–10,000']++; // 10000 * 100 paise
      else ranges['10,000+']++;
    }
  }

  return {
    total: totalOutstanding,
    customersWithDues,
    topCustomers: customerOutstandings.sort((a, b) => b.amount - a.amount).slice(0, 4), // Top 4
    ranges,
  };
}

export async function getVisitsDetails(dateStr: string | undefined) {
  const startOfDay = getKolkataStartOfDay(dateStr);
  const endOfDay = getKolkataEndOfDay(dateStr);

  const visits = await prisma.visit.findMany({
    where: { createdAt: { gte: startOfDay, lte: endOfDay } },
    include: { salesman: true, customer: true },
  });

  const totalCustomers = await prisma.customer.count({ where: { status: 'ACTIVE' } });
  
  const visited = visits.length;
  // Pending can be seen as totalCustomers - visited
  const pending = Math.max(0, totalCustomers - visited);
  const noSale = visits.filter(v => v.noSaleReason).length;

  const statuses = visits.reduce((acc, v) => {
    acc[v.status] = (acc[v.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const salesmanBreakdown = visits.reduce((acc, v) => {
    if (!acc[v.salesmanId]) {
      acc[v.salesmanId] = { name: v.salesman.name, count: 0 };
    }
    acc[v.salesmanId].count++;
    return acc;
  }, {} as Record<string, { name: string; count: number }>);

  return {
    visited,
    pending,
    noSale,
    totalCustomers,
    statuses,
    salesmen: Object.values(salesmanBreakdown).sort((a, b) => b.count - a.count),
  };
}

export async function getRoutesDetails() {
  const routes = await prisma.route.findMany({
    include: {
      areas: true,
      customers: true,
      salesman: true,
    },
  });

  return {
    total: routes.length,
    list: routes.map(r => ({
      name: r.name,
      areasCount: r.areas.length,
      customersCount: r.customers.length,
      salesmanName: r.salesman?.name || 'Unassigned',
    })).sort((a, b) => b.customersCount - a.customersCount),
  };
}

export async function getAreasDetails() {
  const areas = await prisma.area.findMany({
    include: {
      route: true,
      customers: true,
      assignments: {
        include: { salesman: true }
      }
    },
  });

  let assignedCount = 0;
  let unassignedCount = 0;

  const list = areas.map(a => {
    const assignedSalesman = a.assignments[0]?.salesman?.name || 'Unassigned';
    if (a.assignments.length > 0) assignedCount++;
    else unassignedCount++;

    return {
      name: a.name,
      routeName: a.route.name,
      customersCount: a.customers.length,
      salesmanName: assignedSalesman,
    };
  }).sort((a, b) => b.customersCount - a.customersCount);

  return {
    total: areas.length,
    list,
    assignedCount,
    unassignedCount,
  };
}

export async function getSalesmenDetails(dateStr: string | undefined) {
  const startOfDay = getKolkataStartOfDay(dateStr);
  const endOfDay = getKolkataEndOfDay(dateStr);

  const salesmen = await prisma.salesman.findMany();
  
  const workSessions = await prisma.workSession.findMany({
    where: { workDate: { gte: startOfDay, lte: endOfDay } },
  });

  const sales = await prisma.sale.findMany({
    where: { saleDate: { gte: startOfDay, lte: endOfDay } },
  });

  const payments = await prisma.payment.findMany({
    where: { paymentDate: { gte: startOfDay, lte: endOfDay } },
  });

  const visits = await prisma.visit.findMany({
    where: { createdAt: { gte: startOfDay, lte: endOfDay } },
  });

  let working = 0;
  let completed = 0;
  let notStarted = 0;
  let inactive = 0;

  const performance = salesmen.map(s => {
    if (!s.isActive) inactive++;

    const session = workSessions.find(ws => ws.salesmanId === s.id);
    let status = 'Not Started';
    if (!s.isActive) {
      status = 'Inactive';
    } else if (session) {
      if (session.logoutAt) {
        status = 'Completed';
        completed++;
      } else {
        status = 'Working';
        working++;
      }
    } else {
      notStarted++;
    }

    const salesmanSales = sales.filter(sale => sale.salesmanId === s.id).reduce((sum, sale) => sum + sale.totalAmount, 0);
    const salesmanCollection = payments.filter(payment => payment.salesmanId === s.id).reduce((sum, payment) => sum + payment.amount, 0);
    const salesmanVisits = visits.filter(v => v.salesmanId === s.id).length;

    return {
      name: s.name,
      status,
      sales: salesmanSales,
      collection: salesmanCollection,
      visits: salesmanVisits,
    };
  });

  return {
    total: salesmen.length,
    working,
    completed,
    notStarted,
    inactive,
    performance,
  };
}

export async function getCustomersDetails() {
  const customers = await prisma.customer.findMany({
    include: {
      route: true,
      area: true,
      salesman: true,
    }
  });

  const total = customers.length;
  let active = 0;
  let inactive = 0;
  let assigned = 0;
  let unassigned = 0;

  const byRoute: Record<string, number> = {};
  const byArea: Record<string, number> = {};

  for (const c of customers) {
    if (c.status === 'ACTIVE') active++;
    else inactive++;

    if (c.salesmanId) assigned++;
    else unassigned++;

    if (c.route) {
      byRoute[c.route.name] = (byRoute[c.route.name] || 0) + 1;
    }
    
    if (c.area) {
      byArea[c.area.name] = (byArea[c.area.name] || 0) + 1;
    }
  }

  return {
    total,
    active,
    inactive,
    assigned,
    unassigned,
    byRoute: Object.entries(byRoute).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5), // top 5
    byArea: Object.entries(byArea).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5), // top 5
  };
}
