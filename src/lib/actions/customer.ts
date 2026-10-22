'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdminSession, requireAuthSession } from '@/lib/session';
import { normalizeRole } from '@/lib/rbac';

const CustomerSchema = z.object({
  customerName: z.string().min(1, "Name is required"),
  firmName: z.string().optional().nullable().transform(v => (v && v.trim() ? v.trim() : null)),
  category: z.enum(['RETAILER', 'DEALER', 'DISTRIBUTOR']).default('RETAILER'),
  code: z.string().optional().nullable().transform(v => (v && v.trim() ? v.trim() : null)),
  contact: z.string().min(1, "Contact is required"),
  address: z.string().min(1, "Address is required"),
  stateId: z.string().min(1, "State is required"),
  cityId: z.string().min(1, "City is required"),
  routeId: z.string().optional().nullable().transform(v => (v && v.trim() ? v.trim() : null)),
  areaId: z.string().optional().nullable().transform(v => (v && v.trim() ? v.trim() : null)),
  salesmanId: z.string().optional().nullable().transform(v => (v && v.trim() ? v.trim() : null)),
  openingBalance: z.number().min(0, "Balance must be >= 0"),
  openingBalanceType: z.enum(['DEBIT', 'CREDIT']),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export async function getCustomers(filters: any) {
  await requireAuthSession();
  const where: any = {};
  if (filters.search) {
    const cleanSearch = filters.search.trim();
    where.OR = [
      { customerName: { contains: cleanSearch } },
      { firmName: { contains: cleanSearch } },
      { contact: { contains: cleanSearch } },
      { code: { contains: cleanSearch } },
      { address: { contains: cleanSearch } },
      { route: { name: { contains: cleanSearch } } },
      { area: { name: { contains: cleanSearch } } },
    ];
  }
  if (filters.category && filters.category !== 'ALL') where.category = filters.category;
  if (filters.stateId) where.stateId = filters.stateId;
  if (filters.cityId) where.cityId = filters.cityId;
  if (filters.routeId) where.routeId = filters.routeId;
  if (filters.salesmanId) where.salesmanId = filters.salesmanId;
  if (filters.status) where.status = filters.status;

  const page = filters.page || 1;
  const pageSize = 50;

  return await prisma.customer.findMany({
    where,
    take: pageSize,
    skip: (page - 1) * pageSize,
    include: {
      state: true,
      city: true,
      route: true,
      area: true,
      salesman: true,
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getCustomer(id: string) {
  await requireAuthSession();
  return await prisma.customer.findUnique({
    where: { id },
    include: {
      state: true,
      city: true,
      route: true,
      area: true,
      salesman: true,
    }
  });
}

export async function createCustomer(data: any) {
  await requireAdminSession();
  const parsedData = {
    ...data,
    openingBalance: Number(data.openingBalance),
    areaId: data.areaId || null,
    salesmanId: data.salesmanId || null,
  };
  const result = CustomerSchema.safeParse(parsedData);
  if (!result.success) return { error: result.error.issues[0].message };

  // Duplicate submission check
  const existing = await prisma.customer.findFirst({
    where: {
      customerName: result.data.customerName.trim(),
      contact: result.data.contact.trim(),
    }
  });

  if (existing) {
    return { error: `A customer named "${result.data.customerName}" with contact "${result.data.contact}" already exists.` };
  }

  try {
    let code = result.data.code;
    if (!code) {
      const count = await prisma.customer.count();
      code = `CUST-${String(count + 1).padStart(4, '0')}`;
    }
    const customer = await prisma.customer.create({
      data: {
        ...result.data,
        code,
      },
    });
    try {
      revalidatePath('/dashboard/admin/customers');
      revalidatePath(`/dashboard/admin/routes/${result.data.routeId}`);
      revalidatePath('/dashboard/admin');
    } catch {}
    return { success: true, id: customer.id };
  } catch (error: any) {
    return { error: error.message || 'Failed to create customer' };
  }
}

export async function updateCustomer(id: string, data: any) {
  const session = await requireAdminSession();
  const parsedData = {
    ...data,
    openingBalance: Number(data.openingBalance),
    areaId: data.areaId || null,
    salesmanId: data.salesmanId || null,
  };
  const result = CustomerSchema.safeParse(parsedData);
  if (!result.success) return { error: result.error.issues[0].message };

  const existing = await prisma.customer.findFirst({
    where: {
      customerName: result.data.customerName.trim(),
      contact: result.data.contact.trim(),
      id: { not: id }
    }
  });

  if (existing) {
    return { error: `Another customer named "${result.data.customerName}" with contact "${result.data.contact}" already exists.` };
  }

  try {
    const currentCustomer = await prisma.customer.findUnique({
      where: { id },
      select: { openingBalance: true, openingBalanceType: true }
    });

    const isOpeningBalanceChanged = currentCustomer && (
      currentCustomer.openingBalance !== result.data.openingBalance ||
      currentCustomer.openingBalanceType !== result.data.openingBalanceType
    );

    const operations: any[] = [
      prisma.customer.update({
        where: { id },
        data: result.data
      })
    ];

    if (isOpeningBalanceChanged) {
      operations.push(
        prisma.auditLog.create({
          data: {
            actorId: session?.user?.id || 'system',
            actorName: session?.user?.name || 'Executive User',
            actorRole: session?.user?.role || 'FOUNDER_CEO',
            action: 'OPENING_BALANCE_UPDATED',
            entityType: 'Customer',
            entityId: id,
            customerId: id,
            previousRate: currentCustomer.openingBalance,
            newRate: result.data.openingBalance,
            details: `Opening balance modified via profile update from ₹${(currentCustomer.openingBalance / 100).toFixed(2)} (${currentCustomer.openingBalanceType}) to ₹${(result.data.openingBalance / 100).toFixed(2)} (${result.data.openingBalanceType}).`
          }
        })
      );
    }

    await prisma.$transaction(operations);

    try {
      revalidatePath('/dashboard/admin/customers');
      revalidatePath(`/dashboard/admin/customers/${id}`);
      revalidatePath(`/dashboard/admin/routes/${result.data.routeId}`);
      revalidatePath('/dashboard/admin');
    } catch {}
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to update customer' };
  }
}

/**
 * Dedicated, auditable opening balance adjustment for Founder/CEO & authorized executives.
 * Reconciles brought-forward debt from old paper registers or legacy accounting software.
 * Guarantees zero alteration of historical sales or payment records.
 */
export async function adjustCustomerOpeningBalance({
  customerId,
  newBalanceRupees,
  openingBalanceType = 'DEBIT',
  reason,
}: {
  customerId: string;
  newBalanceRupees: number;
  openingBalanceType: 'DEBIT' | 'CREDIT';
  reason: string;
}) {
  const session = await requireAuthSession();
  const role = session.user.role;
  const canonical = normalizeRole(role);

  // Strictly allow only Executive Business Roles: FOUNDER_CEO, OWNER, ADMIN, DIRECTOR
  const isAuthorized = canonical === 'FOUNDER_CEO' || canonical === 'DIRECTOR' || role === 'OWNER' || role === 'ADMIN';
  if (!isAuthorized) {
    return { error: 'Unauthorized. Only the Founder/CEO or Director can adjust customer opening balances.' };
  }

  if (typeof newBalanceRupees !== 'number' || isNaN(newBalanceRupees) || newBalanceRupees < 0) {
    return { error: 'Opening balance must be ₹0 or a positive number.' };
  }

  if (!reason || reason.trim().length < 3) {
    return { error: 'A valid reason (minimum 3 characters) is required for audit trail documentation.' };
  }

  const newBalancePaise = Math.round(newBalanceRupees * 100);

  const customer = await prisma.customer.findUnique({
    where: { id: customerId }
  });

  if (!customer) {
    return { error: 'Customer record not found.' };
  }

  const previousBalancePaise = customer.openingBalance;
  const previousType = customer.openingBalanceType;

  // Transactionally update the Customer balance and create a permanent AuditLog entry
  await prisma.$transaction([
    prisma.customer.update({
      where: { id: customerId },
      data: {
        openingBalance: newBalancePaise,
        openingBalanceType: openingBalanceType,
      }
    }),
    prisma.auditLog.create({
      data: {
        actorId: session.user.id || 'system',
        actorName: session.user.name || 'Founder & CEO',
        actorRole: session.user.role || 'FOUNDER_CEO',
        action: 'OPENING_BALANCE_UPDATED',
        entityType: 'Customer',
        entityId: customerId,
        customerId: customerId,
        previousRate: previousBalancePaise,
        newRate: newBalancePaise,
        details: `Opening balance adjusted from ₹${(previousBalancePaise / 100).toFixed(2)} (${previousType}) to ₹${(newBalancePaise / 100).toFixed(2)} (${openingBalanceType}). Reason: ${reason.trim()}`
      }
    })
  ]);

  try {
    revalidatePath('/dashboard/admin/customers');
    revalidatePath(`/dashboard/admin/customers/${customerId}`);
    revalidatePath('/dashboard/admin/reports/outstanding');
    revalidatePath('/dashboard/admin');
  } catch {}

  return {
    success: true,
    previousBalancePaise,
    newBalancePaise,
    message: `Opening balance successfully updated to ₹${(newBalancePaise / 100).toFixed(2)} (${openingBalanceType})`
  };
}

export async function moveCustomer(customerId: string, areaId: string | null, routeId: string, cityId: string, stateId: string, salesmanId: string | null) {
  await requireAdminSession();
  try {
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        areaId,
        routeId,
        cityId,
        stateId,
        salesmanId
      }
    });
    revalidatePath(`/dashboard/admin/routes/${routeId}`);
    return { success: true };
  } catch (error: any) {
    return { error: 'Failed to move customer' };
  }
}

export async function deactivateCustomer(id: string, routeId: string) {
  await requireAdminSession();
  try {
    await prisma.customer.update({
      where: { id },
      data: { status: 'INACTIVE' }
    });
    revalidatePath(`/dashboard/admin/routes/${routeId}`);
    revalidatePath('/dashboard/admin/customers');
    revalidatePath('/dashboard/admin');
    return { success: true };
  } catch (error: any) {
    return { error: 'Failed to deactivate customer' };
  }
}
