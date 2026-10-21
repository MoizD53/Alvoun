'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/lib/session';

export async function processCustomerImport(rows: any[]) {
  const session = await requireAdminSession();
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
      const code = row.code ? String(row.code).trim() : undefined;
      const customerId = row.id ? String(row.id).trim() : undefined;

      // Safe customer matching: By unique identifier (code, id, or contact) — never by name alone
      let existing = null;
      if (code) {
        existing = await prisma.customer.findFirst({ where: { code } });
      } else if (customerId) {
        existing = await prisma.customer.findUnique({ where: { id: customerId } });
      } else if (contact && contact !== 'N/A' && contact.length >= 7) {
        existing = await prisma.customer.findFirst({ where: { contact } });
      }

      // Convert input rupees to integer paise
      const balanceFloat = parseFloat(String(row.openingBalance || '0').replace(/[^0-9.-]/g, ''));
      const openingBalancePaise = isNaN(balanceFloat) ? 0 : Math.round(balanceFloat * 100);
      const openingBalanceType = ['DEBIT', 'CREDIT'].includes(row.openingBalanceType?.toUpperCase()) 
        ? row.openingBalanceType.toUpperCase() 
        : 'DEBIT';
      const status = ['ACTIVE', 'INACTIVE'].includes(row.status?.toUpperCase())
        ? row.status.toUpperCase()
        : 'ACTIVE';

      if (existing) {
        // Safe opening balance update for existing customer with audit log
        if (row.openingBalance !== undefined && row.openingBalance !== '') {
          const prevBal = existing.openingBalance;
          await prisma.$transaction([
            prisma.customer.update({
              where: { id: existing.id },
              data: {
                openingBalance: openingBalancePaise,
                openingBalanceType: openingBalanceType,
              }
            }),
            prisma.auditLog.create({
              data: {
                actorId: session?.user?.id || 'import',
                actorName: session?.user?.name || 'Bulk Importer',
                actorRole: session?.user?.role || 'FOUNDER_CEO',
                action: 'OPENING_BALANCE_BULK_IMPORTED',
                entityType: 'Customer',
                entityId: existing.id,
                customerId: existing.id,
                previousRate: prevBal,
                newRate: openingBalancePaise,
                details: `Opening balance bulk-updated via spreadsheet by identifier from ₹${(prevBal / 100).toFixed(2)} to ₹${(openingBalancePaise / 100).toFixed(2)} (${openingBalanceType}).`
              }
            })
          ]);
        }
        results.success++;
        continue;
      }

      await prisma.customer.create({
        data: {
          customerName,
          code,
          contact,
          address,
          stateId: defaultState.id,
          cityId: defaultCity.id,
          routeId,
          areaId,
          salesmanId,
          openingBalance: openingBalancePaise,
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
