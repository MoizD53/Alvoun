'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';

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
    throw new Error('Unauthorized');
  }
  
  const role = (session.user as any).role;
  const allowedRoles = ['OWNER', 'ADMIN', 'FOUNDER', 'DIRECTOR', 'ACCOUNTANT'];
  if (!allowedRoles.includes(role)) {
    throw new Error('Unauthorized role');
  }

  const cleanQuery = (query || '').trim();
  if (cleanQuery.length < 1) {
    return { customers: [], totalMatches: 0 };
  }

  try {
    // Restrict exclusively to customer / outlet records
    // Search across customerName, firmName, code, contact/phone, address
    const rawCustomers = await prisma.customer.findMany({
      where: {
        OR: [
          { customerName: { contains: cleanQuery } },
          { firmName: { contains: cleanQuery } },
          { code: { contains: cleanQuery } },
          { contact: { contains: cleanQuery } },
          { address: { contains: cleanQuery } },
        ],
      },
      take: 10,
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
