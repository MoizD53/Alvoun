'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const CitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  stateId: z.string().min(1, "State is required"),
});

export async function getCities(stateId?: string) {
  return await prisma.city.findMany({
    where: stateId ? { stateId } : undefined,
    include: { state: true },
    orderBy: { name: 'asc' }
  });
}

export async function createCity(data: FormData) {
  const result = CitySchema.safeParse(Object.fromEntries(data));
  if (!result.success) return { error: result.error.issues[0].message };

  try {
    await prisma.city.create({ data: result.data });
    revalidatePath('/dashboard/admin/cities');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to create city' };
  }
}

export async function updateCity(id: string, data: FormData) {
  const result = CitySchema.safeParse(Object.fromEntries(data));
  if (!result.success) return { error: result.error.issues[0].message };

  try {
    await prisma.city.update({
      where: { id },
      data: result.data
    });
    revalidatePath('/dashboard/admin/cities');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to update city' };
  }
}
