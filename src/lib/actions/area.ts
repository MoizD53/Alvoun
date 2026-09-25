'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const AreaSchema = z.object({
  name: z.string().min(1, "Name is required"),
  routeId: z.string().min(1, "Route is required"),
});

export async function createArea(data: FormData) {
  const parsed = {
    name: data.get('name') as string,
    routeId: data.get('routeId') as string,
  };
  
  const result = AreaSchema.safeParse(parsed);
  if (!result.success) return { error: result.error.issues[0].message };

  try {
    // Area uniqueness is scoped to Route (db schema constraint)
    const existing = await prisma.area.findFirst({
      where: { name: parsed.name, routeId: parsed.routeId }
    });
    if (existing) return { error: "An area with this name already exists in this route." };

    await prisma.area.create({ data: result.data });
    revalidatePath(`/dashboard/admin/routes/${parsed.routeId}`);
    return { success: true };
  } catch (error: any) {
    return { error: 'Failed to create area. Name might not be unique for this route.' };
  }
}

export async function updateArea(id: string, data: FormData) {
  const parsed = {
    name: data.get('name') as string,
    routeId: data.get('routeId') as string,
  };
  const result = AreaSchema.safeParse(parsed);
  if (!result.success) return { error: result.error.issues[0].message };

  try {
    await prisma.area.update({
      where: { id },
      data: { name: parsed.name }
    });
    revalidatePath(`/dashboard/admin/routes/${parsed.routeId}`);
    return { success: true };
  } catch (error: any) {
    return { error: 'Failed to update area' };
  }
}

export async function assignSalesmanToArea(areaId: string, routeId: string, salesmanId: string) {
  try {
    await prisma.$transaction(async (tx) => {
      // Create/update assignment
      const existing = await tx.salesmanAssignment.findUnique({
        where: { salesmanId_areaId: { salesmanId, areaId } }
      });
      if (!existing) {
        await tx.salesmanAssignment.create({
          data: { salesmanId, areaId, routeId }
        });
      }
      
      // Sync Customer.salesmanId
      await tx.customer.updateMany({
        where: { areaId },
        data: { salesmanId }
      });
    });
    revalidatePath(`/dashboard/admin/routes/${routeId}`);
    return { success: true };
  } catch (error: any) {
    return { error: 'Failed to assign salesman to area' };
  }
}
