'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export interface GlobalSearchCustomer {
  id: string;
  name: string;
  contact: string;
  routeName: string;
  areaName: string;
}

export interface GlobalSearchRoute {
  id: string;
  name: string;
  cityName: string;
  areasCount: number;
  customersCount: number;
}

export interface GlobalSearchSalesman {
  id: string;
  name: string;
  employeeCode: string;
  phone: string;
  isActive: boolean;
}

export interface GlobalSearchResults {
  customers: GlobalSearchCustomer[];
  routes: GlobalSearchRoute[];
  salesmen: GlobalSearchSalesman[];
  totalMatches: number;
}

export async function searchGlobalRecords(query: string): Promise<GlobalSearchResults> {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  
  const role = (session.user as any).role;
  const allowedRoles = ['OWNER', 'ADMIN', 'FOUNDER', 'DIRECTOR', 'ACCOUNTANT'];
  if (!allowedRoles.includes(role)) {
    throw new Error('Unauthorized role');
  }

  const cleanQuery = (query || '').trim();
  if (cleanQuery.length < 1) {
    return { customers: [], routes: [], salesmen: [], totalMatches: 0 };
  }

  try {
    const [rawCustomers, rawRoutes, rawSalesmen] = await Promise.all([
      prisma.customer.findMany({
        where: {
          OR: [
            { customerName: { contains: cleanQuery } },
            { contact: { contains: cleanQuery } },
            { address: { contains: cleanQuery } },
            { route: { name: { contains: cleanQuery } } },
            { area: { name: { contains: cleanQuery } } },
          ],
        },
        take: 8,
        include: {
          route: { select: { name: true } },
          area: { select: { name: true } },
        },
      }),
      prisma.route.findMany({
        where: {
          OR: [
            { name: { contains: cleanQuery } },
            { city: { name: { contains: cleanQuery } } },
          ],
        },
        take: 5,
        include: {
          city: { select: { name: true } },
          _count: { select: { areas: true, customers: true } },
        },
      }),
      prisma.salesman.findMany({
        where: {
          OR: [
            { name: { contains: cleanQuery } },
            { employeeCode: { contains: cleanQuery } },
            { phone: { contains: cleanQuery } },
          ],
        },
        take: 5,
        select: {
          id: true,
          name: true,
          employeeCode: true,
          phone: true,
          isActive: true,
        },
      }),
    ]);

    const customers: GlobalSearchCustomer[] = rawCustomers.map((c) => ({
      id: c.id,
      name: c.customerName,
      contact: c.contact,
      routeName: c.route?.name || 'Unassigned',
      areaName: c.area?.name || 'Unassigned',
    }));

    const routes: GlobalSearchRoute[] = rawRoutes.map((r) => ({
      id: r.id,
      name: r.name,
      cityName: r.city?.name || 'Dahod',
      areasCount: r._count.areas,
      customersCount: r._count.customers,
    }));

    const salesmen: GlobalSearchSalesman[] = rawSalesmen.map((s) => ({
      id: s.id,
      name: s.name,
      employeeCode: s.employeeCode,
      phone: s.phone || '',
      isActive: s.isActive,
    }));

    return {
      customers,
      routes,
      salesmen,
      totalMatches: customers.length + routes.length + salesmen.length,
    };
  } catch (error) {
    console.error('searchGlobalRecords failed:', error);
    throw error;
  }
}
