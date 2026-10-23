'use server';

import { prisma } from '@/lib/db';
import { requireAdminSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getKolkataStartOfDay, getKolkataEndOfDay, getCurrentKolkataTime } from '@/lib/time';

const ProductionSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  cratesProduced: z.number().int().positive('PKGs produced must be positive'),
  looseBottles: z.number().int().min(0).default(0),
  productionDate: z.string().optional(),
  shift: z.enum(['DAY', 'NIGHT']).default('DAY'),
  supervisor: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

function getBottleVolumeLitres(productName: string): number {
  const norm = productName.toLowerCase();
  if (norm.includes('2 litre') || norm.includes('2l')) return 2.0;
  if (norm.includes('1 litre') || norm.includes('1l')) return 1.0;
  if (norm.includes('500')) return 0.5;
  if (norm.includes('250')) return 0.25;
  return 1.0;
}

export async function getProductionBatches(filters?: {
  productId?: string;
  startDate?: string;
  endDate?: string;
}) {
  await requireAdminSession();

  const where: any = {};

  if (filters?.productId && filters.productId !== 'ALL') {
    where.productId = filters.productId;
  }

  if (filters?.startDate || filters?.endDate) {
    where.productionDate = {};
    if (filters.startDate) {
      where.productionDate.gte = getKolkataStartOfDay(filters.startDate);
    }
    if (filters.endDate) {
      where.productionDate.lte = getKolkataEndOfDay(filters.endDate);
    }
  }

  const [batches, products, rawMaterials, rawMovements, salesItems] = await Promise.all([
    prisma.productionBatch.findMany({
      where,
      include: { product: true },
      orderBy: { productionDate: 'desc' },
    }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { bottlesPerCrate: 'asc' } }),
    prisma.rawMaterial.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }]
    }),
    prisma.rawMaterialMovement.findMany({
      take: 50,
      orderBy: { movementDate: 'desc' },
      include: { material: true }
    }),
    prisma.saleItem.groupBy({
      by: ['productId'],
      _sum: {
        crates: true,
        looseBottles: true
      }
    })
  ]);

  const totalCrates = batches.reduce((sum, b) => sum + b.cratesProduced, 0);
  const totalBottles = batches.reduce((sum, b) => sum + b.totalBottles, 0);
  const totalLitres = batches.reduce((sum, b) => sum + b.volumeLitres, 0);

  // Product volume breakdown
  const productTotals: Record<string, { crates: number; litres: number; batches: number }> = {};
  for (const b of batches) {
    const pName = b.product.name;
    if (!productTotals[pName]) {
      productTotals[pName] = { crates: 0, litres: 0, batches: 0 };
    }
    productTotals[pName].crates += b.cratesProduced;
    productTotals[pName].litres += b.volumeLitres;
    productTotals[pName].batches += 1;
  }

  // Finished Goods Inventory Calculation
  const salesByProduct: Record<string, { crates: number; loose: number }> = {};
  salesItems.forEach((si) => {
    salesByProduct[si.productId] = {
      crates: si._sum.crates || 0,
      loose: si._sum.looseBottles || 0
    };
  });

  const productInventory = products.map((prod) => {
    const producedCrates = productTotals[prod.name]?.crates || 0;
    const soldCrates = salesByProduct[prod.id]?.crates || 0;
    const stockCrates = Math.max(0, producedCrates - soldCrates);
    const bottleLitres = getBottleVolumeLitres(prod.name);
    return {
      productId: prod.id,
      productName: prod.name,
      bottlesPerCrate: prod.bottlesPerCrate,
      producedCrates,
      soldCrates,
      stockCrates,
      stockBottles: stockCrates * prod.bottlesPerCrate,
      stockLitres: stockCrates * prod.bottlesPerCrate * bottleLitres,
    };
  });

  return {
    batches,
    products,
    rawMaterials,
    rawMovements,
    productInventory,
    totalCrates,
    totalBottles,
    totalLitres,
    productTotals,
    count: batches.length,
  };
}

export async function createProductionBatch(data: {
  productId: string;
  cratesProduced: number;
  looseBottles?: number;
  productionDate?: string;
  shift?: 'DAY' | 'NIGHT';
  supervisor?: string;
  notes?: string;
}) {
  const session = await requireAdminSession();

  const parsed = ProductionSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { productId, cratesProduced, looseBottles = 0, productionDate, shift, supervisor, notes } = parsed.data;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return { error: 'Selected product not found' };
  }

  const dateToUse = productionDate
    ? new Date(`${productionDate}T12:00:00+05:30`)
    : getCurrentKolkataTime();

  const totalBottles = cratesProduced * product.bottlesPerCrate + looseBottles;
  const bottleVolume = getBottleVolumeLitres(product.name);
  const volumeLitres = totalBottles * bottleVolume;

  const dateStr = dateToUse.toISOString().split('T')[0].replace(/-/g, '');
  const countToday = await prisma.productionBatch.count({
    where: {
      productionDate: {
        gte: getKolkataStartOfDay(dateToUse.toISOString().split('T')[0]),
        lte: getKolkataEndOfDay(dateToUse.toISOString().split('T')[0]),
      },
    },
  });

  const batchNumber = `BATCH-${dateStr}-${String(countToday + 1).padStart(3, '0')}`;

  try {
    const batch = await prisma.productionBatch.create({
      data: {
        batchNumber,
        productId,
        cratesProduced,
        looseBottles,
        totalBottles,
        volumeLitres,
        productionDate: dateToUse,
        shift: shift || 'DAY',
        supervisor: supervisor || session.user.name || 'Production Supervisor',
        notes: notes || null,
      },
    });

    try {
      revalidatePath('/dashboard/admin/production');
      revalidatePath('/dashboard/admin');
    } catch {}

    return { success: true, id: batch.id, batchNumber, volumeLitres: batch.volumeLitres };
  } catch (error: any) {
    return { error: error.message || 'Failed to record production batch' };
  }
}

export async function deleteProductionBatch(id: string) {
  await requireAdminSession();

  try {
    await prisma.productionBatch.delete({ where: { id } });
    try {
      revalidatePath('/dashboard/admin/production');
      revalidatePath('/dashboard/admin');
    } catch {}
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete production batch' };
  }
}

export async function recordRawMaterialMovement(data: {
  materialId: string;
  type: 'INWARD' | 'CONSUMED' | 'ADJUSTMENT';
  quantity: number;
  referenceNo?: string;
  notes?: string;
}) {
  await requireAdminSession();

  if (!data.materialId) return { error: 'Material is required' };
  if (!data.quantity || data.quantity <= 0) return { error: 'Quantity must be greater than zero' };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const mat = await tx.rawMaterial.findUnique({ where: { id: data.materialId } });
      if (!mat) throw new Error('Selected raw material not found');

      const openingStock = mat.currentStock;
      let closingStock = openingStock;

      if (data.type === 'INWARD') {
        closingStock = openingStock + data.quantity;
      } else if (data.type === 'CONSUMED') {
        closingStock = Math.max(0, openingStock - data.quantity);
      } else if (data.type === 'ADJUSTMENT') {
        closingStock = data.quantity;
      }

      await tx.rawMaterial.update({
        where: { id: data.materialId },
        data: { currentStock: closingStock }
      });

      return tx.rawMaterialMovement.create({
        data: {
          materialId: data.materialId,
          type: data.type,
          quantity: data.quantity,
          openingStock,
          closingStock,
          referenceNo: data.referenceNo?.trim() || null,
          notes: data.notes?.trim() || null,
          movementDate: new Date()
        }
      });
    });

    try {
      revalidatePath('/dashboard/admin/production');
    } catch {}

    return { success: true, id: result.id };
  } catch (error: any) {
    return { error: error.message || 'Failed to record movement' };
  }
}
