'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdminSession, requireAuthSession } from '@/lib/session';

const CustomerSchema = z.object({
  customerName: z.string().min(1, "Name is required"),
  contact: z.string().min(1, "Contact is required"),
  address: z.string().min(1, "Address is required"),
  stateId: z.string().min(1, "State is required"),
  cityId: z.string().min(1, "City is required"),
  routeId: z.string().min(1, "Route is required"),
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
    where.OR = [
      { customerName: { contains: filters.search } },
      { contact: { contains: filters.search } }
    ];
  }
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
      salesman: true,
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getCustomer(id: string) {
  await requireAuthSession();
  return await prisma.customer.findUnique({
    where: { id },
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
    const customer = await prisma.customer.create({ data: result.data });
    try {
      revalidatePath('/dashboard/admin/customers');
      revalidatePath(`/dashboard/admin/routes/${result.data.routeId}`);
    } catch {}
    return { success: true, id: customer.id };
  } catch (error: any) {
    return { error: error.message || 'Failed to create customer' };
  }
}

export async function updateCustomer(id: string, data: any) {
  await requireAdminSession();
  const parsedData = {
    ...data,
    openingBalance: Number(data.openingBalance),
    areaId: data.areaId || null,
    salesmanId: data.salesmanId || null,
  };
  const result = CustomerSchema.safeParse(parsedData);
  if (!result.success) return { error: result.error.issues[0].message };

  // Check duplicate on edit
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
    await prisma.customer.update({
      where: { id },
      data: result.data
    });
    try {
      revalidatePath('/dashboard/admin/customers');
      revalidatePath(`/dashboard/admin/customers/${id}`);
      revalidatePath(`/dashboard/admin/routes/${result.data.routeId}`);
    } catch {}
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to update customer' };
  }
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
    return { success: true };
  } catch (error: any) {
    return { error: 'Failed to deactivate customer' };
  }
}

// Bulk import logic will go in a separate file or be called from client to here
