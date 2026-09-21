'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function processCustomerImport(rows: any[]) {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  };

  // Get defaults for state and city if not provided
  let defaultState = await prisma.state.findFirst();
  let defaultCity = await prisma.city.findFirst();

  if (!defaultState) {
    defaultState = await prisma.state.create({ data: { name: 'Default State' } });
  }
  if (!defaultCity) {
    defaultCity = await prisma.city.create({ data: { name: 'Default City', stateId: defaultState.id } });
  }

  // Caching routes and areas to minimize DB calls
  const routesCache = new Map<string, string>(); // name -> id
  const areasCache = new Map<string, string>(); // routeId_name -> id
  const areaSalesmanCache = new Map<string, string | null>(); // areaId -> salesmanId

  const existingRoutes = await prisma.route.findMany();
  for (const r of existingRoutes) {
    routesCache.set(r.name.toLowerCase().trim(), r.id);
  }

  const existingAreas = await prisma.area.findMany();
  for (const a of existingAreas) {
    areasCache.set(`${a.routeId}_${a.name.toLowerCase().trim()}`, a.id);
  }

  const assignments = await prisma.salesmanAssignment.findMany();
  for (const a of assignments) {
    areaSalesmanCache.set(a.areaId, a.salesmanId);
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // skip completely blank rows
    if (!row.customerName && !row.route && !row.area) continue;

    try {
      if (!row.customerName || !row.route || !row.area) {
        throw new Error('Missing basic fields (Customer Name, Route, Area)');
      }

      // Handle Route
      const routeName = row.route.trim();
      const routeKey = routeName.toLowerCase();
      let routeId = routesCache.get(routeKey);

      if (!routeId) {
        // Create new route
        const newRoute = await prisma.route.create({
          data: {
            name: routeName,
            cityId: defaultCity.id,
            isActive: true,
          }
        });
        routeId = newRoute.id;
        routesCache.set(routeKey, routeId);
      }

      // Handle Area
      const areaName = row.area.trim();
      const areaKey = `${routeId}_${areaName.toLowerCase()}`;
      let areaId = areasCache.get(areaKey);

      if (!areaId) {
        // Create new area
        const newArea = await prisma.area.create({
          data: {
            name: areaName,
            routeId: routeId
          }
        });
        areaId = newArea.id;
        areasCache.set(areaKey, areaId);
      }

      const salesmanId = areaSalesmanCache.get(areaId) || null;
      const contact = row.contact ? String(row.contact).trim() : 'N/A';
      const address = row.address ? String(row.address).trim() : 'N/A';
      const customerName = String(row.customerName).trim();

      // Check for exact duplicate (same name & contact)
      const existing = await prisma.customer.findFirst({
        where: { customerName, contact }
      });

      if (existing) {
        // Skip duplicate instead of failing to be idempotent
        results.success++;
        continue;
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
          customerName,
          contact,
          address,
          stateId: defaultState.id,
          cityId: defaultCity.id,
          routeId,
          areaId,
          salesmanId,
          openingBalance,
          openingBalanceType,
          status
        }
      });
      results.success++;
    } catch (err: any) {
      results.failed++;
      results.errors.push(`Row ${i + 1} (${row.customerName || 'Unknown'}): ${err.message}`);
    }
  }

  revalidatePath('/dashboard/admin/customers');
  return results;
}
