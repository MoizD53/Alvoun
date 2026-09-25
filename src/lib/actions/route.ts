'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const RouteSchema = z.object({
  name: z.string().min(1, "Name is required"),
  cityId: z.string().min(1, "City is required"),
  salesmanId: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function getRoutes(cityId?: string) {
  return await prisma.route.findMany({
    where: cityId ? { cityId } : undefined,
    include: {
      city: { include: { state: true } },
      salesman: true,
      _count: {
        select: {
          customers: { where: { status: 'ACTIVE' } }
        }
      }
    },
    orderBy: { name: 'asc' }
  });
}

export async function createRoute(data: FormData) {
  const parsed = {
    name: data.get('name') as string,
    cityId: data.get('cityId') as string,
    salesmanId: data.get('salesmanId') as string || undefined,
    isActive: data.get('isActive') === 'on' || data.get('isActive') === 'true',
  };
  
  const result = RouteSchema.safeParse(parsed);
  if (!result.success) return { error: result.error.issues[0].message };

  try {
    await prisma.route.create({ data: result.data });
    revalidatePath('/dashboard/admin/routes');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to create route' };
  }
}

export async function updateRoute(id: string, data: FormData) {
  const parsed = {
    name: data.get('name') as string,
    cityId: data.get('cityId') as string,
    salesmanId: data.get('salesmanId') as string || undefined,
    isActive: data.get('isActive') === 'on' || data.get('isActive') === 'true',
  };
  
  const result = RouteSchema.safeParse(parsed);
  if (!result.success) return { error: result.error.issues[0].message };

  try {
    await prisma.route.update({
      where: { id },
      data: result.data
    });
    revalidatePath('/dashboard/admin/routes');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to update route' };
  }
}

export async function deactivateRoute(id: string) {
  try {
    await prisma.route.update({
      where: { id },
      data: { isActive: false }
    });
    revalidatePath('/dashboard/admin/routes');
    return { success: true };
  } catch (error: any) {
    return { error: 'Failed to deactivate route' };
  }
}

export async function activateRoute(id: string) {
  try {
    await prisma.route.update({
      where: { id },
      data: { isActive: true }
    });
    revalidatePath('/dashboard/admin/routes');
    return { success: true };
  } catch (error: any) {
    return { error: 'Failed to activate route' };
  }
}

export async function deleteRoute(id: string) {
  try {
    const r = await prisma.route.findUnique({
      where: { id },
      include: { _count: { select: { customers: true } } }
    });
    if (!r) return { error: 'Route not found' };
    if (r._count.customers > 0) return { error: 'Cannot delete route with existing customers. Deactivate it instead.' };
    
    await prisma.route.delete({ where: { id } });
    revalidatePath('/dashboard/admin/routes');
    return { success: true };
  } catch (error: any) {
    return { error: 'Failed to delete route. Dependencies may exist.' };
  }
}
