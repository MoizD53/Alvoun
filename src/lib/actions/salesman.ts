'use server';

import { prisma } from '@/lib/db';

export async function getSalesmen() {
  return await prisma.salesman.findMany({
    orderBy: { name: 'asc' }
  });
}
