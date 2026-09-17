'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function processCustomerImport(rows: any[]) {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  };

  // Optimization: load all states, cities, routes, salesmen mapping
  const states = await prisma.state.findMany();
  const cities = await prisma.city.findMany();
  const routes = await prisma.route.findMany();
  const salesmen = await prisma.salesman.findMany();

  const stateMap = new Map(states.map(s => [s.name.toLowerCase().trim(), s.id]));
  const cityMap = new Map(cities.map(c => [c.name.toLowerCase().trim(), c.id]));
  const routeMap = new Map(routes.map(r => [r.name.toLowerCase().trim(), r.id]));
  const salesmanMap = new Map(salesmen.map(s => [s.name.toLowerCase().trim(), s.id]));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      if (!row.customerName || !row.contact || !row.address) {
        throw new Error('Missing basic fields');
      }

      const stateId = stateMap.get(row.state?.toLowerCase().trim());
      if (!stateId) throw new Error(`State '${row.state}' not found`);

      const cityId = cityMap.get(row.city?.toLowerCase().trim());
      if (!cityId) throw new Error(`City '${row.city}' not found`);

      const routeId = routeMap.get(row.route?.toLowerCase().trim());
      if (!routeId) throw new Error(`Route '${row.route}' not found`);

      const salesmanId = salesmanMap.get(row.salesman?.toLowerCase().trim());
      if (!salesmanId) throw new Error(`Salesman '${row.salesman}' not found`);

      // Check for exact duplicate (same name & contact)
      const existing = await prisma.customer.findFirst({
        where: { customerName: row.customerName, contact: row.contact }
      });

      if (existing) {
        throw new Error('Duplicate customer exists (same name & contact)');
      }

      const openingBalance = parseInt(row.openingBalance) || 0;
      const openingBalanceType = ['DEBIT', 'CREDIT'].includes(row.openingBalanceType?.toUpperCase()) 
        ? row.openingBalanceType.toUpperCase() 
        : 'DEBIT';
      const status = ['ACTIVE', 'INACTIVE'].includes(row.status?.toUpperCase())
        ? row.status.toUpperCase()
        : 'ACTIVE';

      await prisma.customer.create({
        data: {
          customerName: row.customerName,
          contact: String(row.contact),
          address: String(row.address),
          stateId,
          cityId,
          routeId,
          salesmanId,
          openingBalance,
          openingBalanceType,
          status
        }
      });
      results.success++;
    } catch (err: any) {
      results.failed++;
      results.errors.push(`Row ${i + 1} (${row.customerName}): ${err.message}`);
    }
  }

  revalidatePath('/dashboard/admin/customers');
  return results;
}
