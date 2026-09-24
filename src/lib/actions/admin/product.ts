'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const ProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  bottlesPerCrate: z.number().int().positive("Must be a positive integer"),
  rate: z.number().int().positive("Rate must be positive"),
  isActive: z.boolean().default(true)
});

export async function createProduct(formData: FormData) {
  try {
    const rawData = {
      name: formData.get('name') as string,
      bottlesPerCrate: parseInt(formData.get('bottlesPerCrate') as string),
      rate: parseFloat(formData.get('rate') as string) * 100, // store in paise
      isActive: true
    };

    const data = ProductSchema.parse(rawData);

    // Check duplicate name
    const existing = await prisma.product.findUnique({
      where: { name: data.name }
    });
    
    if (existing) {
      return { error: 'A product with this name already exists' };
    }

    await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: data.name,
          bottlesPerCrate: data.bottlesPerCrate,
          isActive: data.isActive
        }
      });

      await tx.rate.create({
        data: {
          productId: product.id,
          minQuantity: 0,
          rate: data.rate
        }
      });
    });

    revalidatePath('/dashboard/admin/reports/products');
    return { success: true };
  } catch (error: any) {
    if (error && Array.isArray(error.errors)) {
      return { error: error.errors[0].message };
    }
    return { error: error.message || 'Failed to create product' };
  }
}

export async function updateProduct(id: string, formData: FormData) {
  try {
    const rawData = {
      name: formData.get('name') as string,
      bottlesPerCrate: parseInt(formData.get('bottlesPerCrate') as string),
      rate: parseFloat(formData.get('rate') as string) * 100,
      isActive: formData.get('isActive') === 'true'
    };

    const data = ProductSchema.parse(rawData);

    const existing = await prisma.product.findUnique({
      where: { name: data.name }
    });

    if (existing && existing.id !== id) {
      return { error: 'Another product with this name already exists' };
    }

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          name: data.name,
          bottlesPerCrate: data.bottlesPerCrate,
          isActive: data.isActive
        }
      });

      const existingRate = await tx.rate.findFirst({
        where: { productId: id, minQuantity: 0 }
      });

      if (existingRate) {
        if (existingRate.rate !== data.rate) {
          await tx.rate.update({
            where: { id: existingRate.id },
            data: { rate: data.rate }
          });
        }
      } else {
        await tx.rate.create({
          data: {
            productId: id,
            minQuantity: 0,
            rate: data.rate
          }
        });
      }
    });

    revalidatePath('/dashboard/admin/reports/products');
    return { success: true };
  } catch (error: any) {
    if (error && Array.isArray(error.errors)) {
      return { error: error.errors[0].message };
    }
    return { error: error.message || 'Failed to update product' };
  }
}

export async function deactivateProduct(id: string) {
  try {
    await prisma.product.update({
      where: { id },
      data: { isActive: false }
    });
    revalidatePath('/dashboard/admin/reports/products');
    return { success: true };
  } catch (error: any) {
    return { error: 'Failed to deactivate product' };
  }
}

export async function activateProduct(id: string) {
  try {
    await prisma.product.update({
      where: { id },
      data: { isActive: true }
    });
    revalidatePath('/dashboard/admin/reports/products');
    return { success: true };
  } catch (error: any) {
    return { error: 'Failed to activate product' };
  }
}
