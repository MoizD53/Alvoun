'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const CustomerSchema = z.object({
  customerName: z.string().min(1, "Name is required"),
  contact: z.string().min(1, "Contact is required"),
  address: z.string().min(1, "Address is required"),
  stateId: z.string().min(1, "State is required"),
  cityId: z.string().min(1, "City is required"),
  routeId: z.string().min(1, "Route is required"),
  salesmanId: z.string().min(1, "Salesman is required"),
  openingBalance: z.number().min(0, "Balance must be >= 0"),
  openingBalanceType: z.enum(['DEBIT', 'CREDIT']),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export async function getCustomers(filters: any) {
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
  return await prisma.customer.findUnique({
    where: { id },
  });
}

export async function createCustomer(data: any) {
  const parsedData = {
    ...data,
    openingBalance: Number(data.openingBalance),
  };
  const result = CustomerSchema.safeParse(parsedData);
  if (!result.success) return { error: result.error.issues[0].message };

  try {
    const customer = await prisma.customer.create({ data: result.data });
    revalidatePath('/dashboard/admin/customers');
    return { success: true, id: customer.id };
  } catch (error: any) {
    return { error: error.message || 'Failed to create customer' };
  }
}

export async function updateCustomer(id: string, data: any) {
  const parsedData = {
    ...data,
    openingBalance: Number(data.openingBalance),
  };
  const result = CustomerSchema.safeParse(parsedData);
  if (!result.success) return { error: result.error.issues[0].message };

  try {
    await prisma.customer.update({
      where: { id },
      data: result.data
    });
    revalidatePath('/dashboard/admin/customers');
    revalidatePath(`/dashboard/admin/customers/${id}`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to update customer' };
  }
}

// Bulk import logic will go in a separate file or be called from client to here
