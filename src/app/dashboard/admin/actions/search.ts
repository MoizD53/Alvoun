'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { normalizeRole } from '@/lib/rbac';

export interface GlobalSearchCustomer {
  id: string;
  name: string;
  firmName?: string | null;
  code?: string | null;
  contact: string;
  routeName: string;
  areaName: string;
}

export interface GlobalSearchResults {
  customers: GlobalSearchCustomer[];
  totalMatches: number;
}

export async function searchGlobalRecords(query: string): Promise<GlobalSearchResults> {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized: Session required');
  }
  
  const role = (session.user as any).role;
  const canonical = normalizeRole(role);
  
  // Allow all authorized organizational roles: Founder/CEO, Director, Operations/Accountant, Salesman, Admin, Owner
  const allowedCanonical = ['FOUNDER_CEO', 'DIRECTOR', 'OPERATIONS_STAFF', 'SALESMAN'];
  if (!allowedCanonical.includes(canonical)) {
    throw new Error('Unauthorized role');
  }

  const cleanQuery = (query || '').trim();
  if (cleanQuery.length < 1) {
    return { customers: [], totalMatches: 0 };
  }

  try {
    // Search across customerName, firmName, code, contact/phone, address, route, area
    const rawCustomers = await prisma.customer.findMany({
      where: {
        OR: [
          { customerName: { contains: cleanQuery } },
          { firmName: { contains: cleanQuery } },
          { code: { contains: cleanQuery } },
          { contact: { contains: cleanQuery } },
          { address: { contains: cleanQuery } },
          { route: { name: { contains: cleanQuery } } },
          { area: { name: { contains: cleanQuery } } },
        ],
      },
      take: 12,
      include: {
        route: { select: { name: true } },
        area: { select: { name: true } },
      },
      orderBy: {
        customerName: 'asc',
      },
    });

    const customers: GlobalSearchCustomer[] = rawCustomers.map((c) => ({
      id: c.id,
      name: c.customerName,
      firmName: c.firmName,
      code: c.code,
      contact: c.contact,
      routeName: c.route?.name || 'Unassigned',
      areaName: c.area?.name || 'Unassigned',
    }));

    return {
      customers,
      totalMatches: customers.length,
    };
  } catch (error) {
    console.error('searchGlobalRecords failed:', error);
    throw error;
  }
}
