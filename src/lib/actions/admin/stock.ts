'use server';

import { prisma } from '@/lib/db';
import { requireAdminSession } from '@/lib/session';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCurrentKolkataTime, getKolkataEndOfDay, getKolkataStartOfDay } from '@/lib/time';
import { getOrComputeCached, invalidateDashboardCache } from '@/lib/cache/dashboard-cache';
import { recordQueryMetrics } from '@/lib/turso-budget';

const InwardSchema = z.object({
  materialId: z.string().min(1, 'Material is required'),
  quantity: z.number().positive('Quantity must be greater than zero'),
  referenceNo: z.string().optional().nullable(),
  movementDate: z.string().optional(),
  notes: z.string().optional().nullable(),
});

export async function getStockDashboard(selectedDateStr?: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        rawMaterials: [],
        productStockSummary: [],
        lowStockAlertsCount: 0,
        lowStockAlerts: [],
      };
    }
  } catch {
    // Continue in Server Component context
  }

  const cacheKey = `stock_dashboard_${selectedDateStr || 'today'}`;
  return getOrComputeCached(cacheKey, 60000, async () => {
    const endOfDay = selectedDateStr && /^\d{4}-\d{2}-\d{2}$/.test(selectedDateStr)
      ? getKolkataEndOfDay(selectedDateStr)
      : undefined;

    // 1. Raw Materials Stock & Status
    const rawMaterials = await prisma.rawMaterial.findMany({
      include: {
        movements: {
          where: endOfDay ? { movementDate: { lte: endOfDay } } : undefined,
          take: 10,
          orderBy: { movementDate: 'desc' },
        },
      },
      orderBy: { category: 'asc' },
    });

    // 2. Finished Product Stock (Opening + Produced - Sold = Closing)
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        rates: { where: { minQuantity: 0 } },
      },
      orderBy: { bottlesPerCrate: 'asc' },
    });

    const isHistorical = Boolean(endOfDay && endOfDay.getTime() < getKolkataStartOfDay().getTime());

    const [prodGroup, soldGroup] = await Promise.all([
      prisma.productionBatch.groupBy({
        by: ['productId'],
        where: isHistorical ? { productionDate: { lte: endOfDay! } } : undefined,
        _sum: { cratesProduced: true, totalBottles: true, volumeLitres: true },
      }),
      isHistorical
        ? prisma.saleItem.groupBy({
            by: ['productId'],
            where: { sale: { saleDate: { lte: endOfDay! } } },
            _sum: { crates: true, looseBottles: true, amount: true },
          })
        : prisma.saleItem.groupBy({
            by: ['productId'],
            _sum: { crates: true, looseBottles: true, amount: true },
          }),
    ]);

    recordQueryMetrics(rawMaterials.length + products.length + prodGroup.length + soldGroup.length);

    const prodMap = new Map(prodGroup.map((g) => [g.productId, g._sum]));
    const soldMap = new Map(soldGroup.map((g) => [g.productId, g._sum]));

    const productStockSummary = products.map((prod) => {
      const pSum = prodMap.get(prod.id);
      const sSum = soldMap.get(prod.id);

      const totalProducedCrates = pSum?.cratesProduced || 0;
      const totalSoldCrates = sSum?.crates || 0;
      const currentCrates = Math.max(0, totalProducedCrates - totalSoldCrates);

      return {
        id: prod.id,
        name: prod.name,
        bottlesPerCrate: prod.bottlesPerCrate,
        totalProducedCrates,
        totalSoldCrates,
        currentCrates,
        standardRatePaise: prod.rates[0]?.rate || 0,
        estimatedStockValuePaise: currentCrates * (prod.rates[0]?.rate || 0),
      };
    });

    // Raw materials alert count
    const lowStockAlerts = rawMaterials.filter((m) => m.currentStock <= m.minReorderLevel);

    return {
      rawMaterials,
      productStockSummary,
      lowStockAlertsCount: lowStockAlerts.length,
      lowStockAlerts,
    };
  });
}

export async function recordRawMaterialInward(data: {
  materialId: string;
  quantity: number;
  referenceNo?: string;
  movementDate?: string;
  notes?: string;
}) {
  await requireAdminSession();

  const parsed = InwardSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { materialId, quantity, referenceNo, movementDate, notes } = parsed.data;

  const dateToUse = movementDate
    ? new Date(`${movementDate}T12:00:00+05:30`)
    : getCurrentKolkataTime();

  let finalStock = 0;
  try {
    await prisma.$transaction(async (tx) => {
      const material = await tx.rawMaterial.findUnique({ where: { id: materialId } });
      if (!material) throw new Error('Raw material not found');

      const openingStock = material.currentStock;
      const closingStock = openingStock + quantity;
      finalStock = closingStock;

      await tx.rawMaterial.update({
        where: { id: materialId },
        data: { currentStock: closingStock },
      });

      await tx.rawMaterialMovement.create({
        data: {
          materialId,
          type: 'INWARD',
          quantity,
          openingStock,
          closingStock,
          referenceNo: referenceNo || null,
          movementDate: dateToUse,
          notes: notes || null,
        },
      });
    });

    try {
      invalidateDashboardCache('stock');
      revalidatePath('/dashboard/admin/stock');
      revalidatePath('/dashboard/admin');
    } catch {}

    return { success: true, newStock: finalStock };
  } catch (error: any) {
    return { error: error.message || 'Failed to record inward material' };
  }
}

export async function recordRawMaterialConsumption(data: {
  materialId: string;
  quantity: number;
  referenceNo?: string;
  movementDate?: string;
  notes?: string;
}) {
  await requireAdminSession();

  const parsed = InwardSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { materialId, quantity, referenceNo, movementDate, notes } = parsed.data;

  const dateToUse = movementDate
    ? new Date(`${movementDate}T12:00:00+05:30`)
    : getCurrentKolkataTime();

  let finalStock = 0;
  try {
    await prisma.$transaction(async (tx) => {
      const material = await tx.rawMaterial.findUnique({ where: { id: materialId } });
      if (!material) throw new Error('Raw material not found');

      if (material.currentStock < quantity) {
        throw new Error(
          `Insufficient stock: current stock is ${material.currentStock} ${material.unit}, requested consumption is ${quantity} ${material.unit}`
        );
      }

      const openingStock = material.currentStock;
      const closingStock = openingStock - quantity;
      finalStock = closingStock;

      await tx.rawMaterial.update({
        where: { id: materialId },
        data: { currentStock: closingStock },
      });

      await tx.rawMaterialMovement.create({
        data: {
          materialId,
          type: 'CONSUMED',
          quantity,
          openingStock,
          closingStock,
          referenceNo: referenceNo || null,
          movementDate: dateToUse,
          notes: notes || null,
        },
      });
    });

    try {
      invalidateDashboardCache('stock');
      revalidatePath('/dashboard/admin/stock');
      revalidatePath('/dashboard/admin');
    } catch {}

    return { success: true, newStock: finalStock };
  } catch (error: any) {
    return { error: error.message || 'Failed to record consumption' };
  }
}
