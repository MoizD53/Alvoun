'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const StateSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export async function getStates() {
  return await prisma.state.findMany({
    orderBy: { name: 'asc' }
  });
}

export async function createState(data: FormData) {
  const result = StateSchema.safeParse(Object.fromEntries(data));
  if (!result.success) return { error: result.error.issues[0].message };

  try {
    await prisma.state.create({ data: result.data });
    revalidatePath('/dashboard/admin/states');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to create state' };
  }
}

export async function updateState(id: string, data: FormData) {
  const result = StateSchema.safeParse(Object.fromEntries(data));
  if (!result.success) return { error: result.error.issues[0].message };

  try {
    await prisma.state.update({
      where: { id },
      data: result.data
    });
    revalidatePath('/dashboard/admin/states');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to update state' };
  }
}
