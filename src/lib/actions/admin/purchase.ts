'use server';

import { prisma } from '@/lib/db';
import { requireAdminSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getKolkataStartOfDay, getKolkataEndOfDay, getCurrentKolkataTime } from '@/lib/time';

const PurchaseItemSchema = z.object({
  materialId: z.string().optional().nullable(),
  materialName: z.string().min(1, 'Material name is required'),
  category: z.string().default('RAW_MATERIAL'),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unit: z.string().min(1, 'Unit is required'),
  ratePaise: z.number().int().min(0, 'Rate must be non-negative'),
  totalAmountPaise: z.number().int().min(0, 'Total must be non-negative'),
});

const PaymentEntrySchema = z.object({
  amountPaise: z.number().int().min(0),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE']).default('CASH'),
  referenceNo: z.string().optional().nullable(),
});

const CreatePurchaseSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  purchaseDate: z.string().optional(),
  supplierInvoiceNo: z.string().optional().nullable(),
  items: z.array(PurchaseItemSchema).min(1, 'At least one purchase item is required'),
  paidAmountPaise: z.number().int().min(0).default(0),
  paymentMethod: z.string().default('CASH'),
  payments: z.array(PaymentEntrySchema).optional(),
  remarks: z.string().optional().nullable(),
});

const SupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  gstin: z.string().optional().nullable(),
  openingBalancePaise: z.number().int().default(0),
  openingBalanceType: z.enum(['CREDIT', 'DEBIT']).default('CREDIT'),
  paymentTerms: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const SupplierPaymentSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  purchaseId: z.string().optional().nullable(),
  amountPaise: z.number().int().positive('Payment amount must be greater than zero'),
  paymentDate: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE']).default('CASH'),
  referenceNo: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

/**
 * Fetch purchases, suppliers, raw materials, live summary cards, and payments.
 */
export async function getPurchases(filters?: {
  startDate?: string;
  endDate?: string;
  supplierId?: string;
  paymentStatus?: string;
  search?: string;
}) {
  const emptyFallback = {
    purchases: [],
    suppliers: [],
    rawMaterials: [],
    payments: [],
    rawMaterialPurchases: [],
    summary: {
      totalPurchaseValuePaise: 0,
      paymentsMadePaise: 0,
      outstandingPayablesPaise: 0,
      itemsPurchasedCount: 0,
      suppliersServedCount: 0,
    },
  };

  try {
    await requireAdminSession();
  } catch {
    // Continue in Server Component context
  }

  try {
    const whereClause: any = {};

    if (filters?.startDate && filters?.endDate) {
      const start = getKolkataStartOfDay(filters.startDate);
      const end = getKolkataEndOfDay(filters.endDate);
      whereClause.purchaseDate = { gte: start, lte: end };
    } else if (filters?.startDate) {
      const start = getKolkataStartOfDay(filters.startDate);
      whereClause.purchaseDate = { gte: start };
    } else if (filters?.endDate) {
      const end = getKolkataEndOfDay(filters.endDate);
      whereClause.purchaseDate = { lte: end };
    }

  if (filters?.supplierId && filters.supplierId !== 'ALL') {
    whereClause.supplierId = filters.supplierId;
  }

  if (filters?.paymentStatus && filters.paymentStatus !== 'ALL') {
    whereClause.paymentStatus = filters.paymentStatus;
  }

  const [purchases, suppliers, rawMaterials, payments] = await Promise.all([
    prisma.purchase.findMany({
      where: whereClause,
      include: {
        supplier: true,
        items: {
          include: {
            material: true,
          },
        },
        payments: true,
      },
      orderBy: { purchaseDate: 'desc' },
    }),
    prisma.supplier.findMany({
      where: { isActive: true },
      include: {
        purchases: { select: { totalAmount: true, paidAmount: true } },
        payments: { select: { amount: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.rawMaterial.findMany({
      orderBy: { name: 'asc' },
    }),
    prisma.supplierPayment.findMany({
      include: {
        supplier: true,
        purchase: true,
      },
      orderBy: { paymentDate: 'desc' },
      take: 100,
    }),
  ]);

  // Compute live summary metrics
  let totalPurchaseValuePaise = 0;
  let paymentsMadePaise = 0;
  let itemsPurchasedCount = 0;
  const suppliersServedSet = new Set<string>();

  purchases.forEach((p) => {
    totalPurchaseValuePaise += p.totalAmount;
    paymentsMadePaise += p.paidAmount;
    suppliersServedSet.add(p.supplierId);
    p.items.forEach((item) => {
      itemsPurchasedCount += item.quantity;
    });
  });

  // Outstanding payables across all suppliers
  let outstandingPayablesPaise = 0;
  const enrichedSuppliers = suppliers.map((s) => {
    const purchasesTotal = s.purchases.reduce((acc, p) => acc + p.totalAmount, 0);
    const paymentsTotal = s.payments.reduce((acc, p) => acc + p.amount, 0);
    const opening = s.openingBalanceType === 'CREDIT' ? s.openingBalance : -s.openingBalance;
    const balance = opening + purchasesTotal - paymentsTotal;
    outstandingPayablesPaise += balance;

    return {
      id: s.id,
      name: s.name,
      contactPerson: s.contactPerson,
      phone: s.phone,
      address: s.address,
      gstin: s.gstin,
      openingBalance: s.openingBalance,
      openingBalanceType: s.openingBalanceType,
      paymentTerms: s.paymentTerms,
      notes: s.notes,
      totalPurchasesPaise: purchasesTotal,
      totalPaidPaise: paymentsTotal,
      balancePaise: balance,
      purchasesCount: s.purchases.length,
    };
  });

  // Group raw material purchases by material & category
  const rawMaterialPurchasesMap: Record<string, {
    materialName: string;
    category: string;
    unit: string;
    totalQuantity: number;
    totalSpendPaise: number;
    purchasesCount: number;
  }> = {};

  purchases.forEach((p) => {
    p.items.forEach((item) => {
      const key = `${item.materialName}_${item.category}_${item.unit}`;
      if (!rawMaterialPurchasesMap[key]) {
        rawMaterialPurchasesMap[key] = {
          materialName: item.materialName,
          category: item.category,
          unit: item.unit,
          totalQuantity: 0,
          totalSpendPaise: 0,
          purchasesCount: 0,
        };
      }
      const entry = rawMaterialPurchasesMap[key];
      entry.totalQuantity += item.quantity;
      entry.totalSpendPaise += item.totalAmount;
      entry.purchasesCount++;
    });
  });

  const rawMaterialPurchases = Object.values(rawMaterialPurchasesMap).map((m) => ({
    ...m,
    averageRatePaise: m.totalQuantity > 0 ? Math.round(m.totalSpendPaise / m.totalQuantity) : 0,
  }));

  return {
    purchases,
    suppliers: enrichedSuppliers,
    rawMaterials,
    payments,
    rawMaterialPurchases,
    summary: {
      totalPurchaseValuePaise,
      paymentsMadePaise,
      outstandingPayablesPaise: Math.max(0, outstandingPayablesPaise),
      itemsPurchasedCount: Math.round(itemsPurchasedCount),
      suppliersServedCount: suppliersServedSet.size,
    },
  };
  } catch (err) {
    console.error('[getPurchases DB Error]:', err);
    return emptyFallback;
  }
}

/**
 * Record a new purchase and seamlessly integrate with raw material inventory.
 */
export async function createPurchase(data: z.infer<typeof CreatePurchaseSchema>) {
  const session = await requireAdminSession();

  const parsed = CreatePurchaseSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { supplierId, purchaseDate, supplierInvoiceNo, items, paidAmountPaise, paymentMethod, payments, remarks } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
      if (!supplier) throw new Error('Selected supplier not found');

      // Calculate total amount in paise
      const totalAmountPaise = items.reduce((sum, item) => sum + item.totalAmountPaise, 0);

      // Support multi-payment / split payment
      const validPayments = (payments || []).filter(p => p.amountPaise > 0);
      const totalPaidPaise = validPayments.length > 0
        ? validPayments.reduce((sum, p) => sum + p.amountPaise, 0)
        : paidAmountPaise;

      // Determine payment status
      let paymentStatus = 'PENDING';
      if (totalPaidPaise >= totalAmountPaise && totalAmountPaise > 0) {
        paymentStatus = 'PAID';
      } else if (totalPaidPaise > 0) {
        paymentStatus = 'PARTIAL';
      }

      // Generate sequential Purchase Number
      const count = await tx.purchase.count();
      const now = getCurrentKolkataTime();
      const year = now.getFullYear();
      const purchaseNumber = `PO-${year}-${String(count + 1).padStart(4, '0')}`;

      const targetDate = purchaseDate ? new Date(purchaseDate) : now;

      // Method string
      const effectivePaymentMethod = validPayments.length > 1
        ? validPayments.map(p => p.paymentMethod).join(' + ')
        : validPayments[0]?.paymentMethod || paymentMethod || 'CASH';

      // 1. Create Purchase Record
      const purchase = await tx.purchase.create({
        data: {
          purchaseNumber,
          supplierId,
          supplierInvoiceNo: supplierInvoiceNo?.trim() || null,
          purchaseDate: targetDate,
          totalAmount: totalAmountPaise,
          paidAmount: totalPaidPaise,
          paymentStatus,
          paymentMethod: effectivePaymentMethod,
          remarks: remarks?.trim() || null,
          recordedBy: session.user.name || session.user.email,
        },
      });

      // 2. Create Purchase Items & Directly Update Raw Material & Finished Stock (INWARD)
      let lineIndex = 0;
      for (const item of items) {
        lineIndex++;
        let matchedMaterialId = item.materialId;

        // A. Check if this purchase is for Finished Product (1L, 500ml, 250ml)
        const allProducts = await tx.product.findMany();
        const matchedProduct = allProducts.find((p) => {
          const pNorm = p.name.toLowerCase().replace(/\s+/g, '');
          const iNorm = item.materialName.toLowerCase().replace(/\s+/g, '');
          return iNorm.includes(pNorm) || pNorm.includes(iNorm);
        });

        if (matchedProduct) {
          // Record inward batch so Finished Product Stock in Stock & Inventory directly updates!
          const crates = Math.round(item.quantity);
          const totalBottles = crates * matchedProduct.bottlesPerCrate;
          const litresPerBottle = matchedProduct.name.includes('1') ? 1.0 : matchedProduct.name.includes('500') ? 0.5 : 0.25;
          const volumeLitres = Math.round(totalBottles * litresPerBottle);

          // Guarantee ALWAYS UNIQUE batchNumber across multiple lines of the same product
          const uniqueBatchSuffix = `L${lineIndex}-${Date.now().toString().slice(-4)}`;
          await tx.productionBatch.create({
            data: {
              batchNumber: `PUR-${purchaseNumber}-${uniqueBatchSuffix}`,
              productId: matchedProduct.id,
              cratesProduced: crates,
              looseBottles: 0,
              totalBottles,
              volumeLitres,
              productionDate: targetDate,
              notes: `Inward Purchase from ${supplier.name} (#${purchaseNumber} - ${item.materialName})`,
            },
          });
        }

        // B. Match or auto-create Raw Material record
        if (!matchedMaterialId && item.materialName) {
          let existing = await tx.rawMaterial.findFirst({
            where: { name: item.materialName.trim() },
          });
          if (!existing) {
            existing = await tx.rawMaterial.create({
              data: {
                name: item.materialName.trim(),
                category: item.category || 'RAW_MATERIAL',
                unit: item.unit || 'PCS',
                currentStock: 0,
                minReorderLevel: 50,
              },
            });
          }
          matchedMaterialId = existing.id;
        }

        await tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            materialId: matchedMaterialId || null,
            materialName: item.materialName.trim(),
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.ratePaise,
            totalAmount: item.totalAmountPaise,
          },
        });

        // C. If matched to a RawMaterial, increment stock and log INWARD movement
        if (matchedMaterialId) {
          const mat = await tx.rawMaterial.findUnique({ where: { id: matchedMaterialId } });
          if (mat) {
            const openingStock = mat.currentStock;
            const closingStock = openingStock + item.quantity;

            await tx.rawMaterial.update({
              where: { id: matchedMaterialId },
              data: { currentStock: closingStock },
            });

            await tx.rawMaterialMovement.create({
              data: {
                materialId: matchedMaterialId,
                type: 'INWARD',
                quantity: item.quantity,
                openingStock,
                closingStock,
                referenceNo: purchaseNumber,
                notes: `Purchased from ${supplier.name}${supplierInvoiceNo ? ` (Invoice #${supplierInvoiceNo})` : ''}`,
                movementDate: targetDate,
              },
            });
          }
        }
      }

      // 3. Record Supplier Payments (supports multiple splits e.g. Cash + UPI)
      if (validPayments.length > 0) {
        for (const p of validPayments) {
          await tx.supplierPayment.create({
            data: {
              supplierId,
              purchaseId: purchase.id,
              amount: p.amountPaise,
              paymentDate: targetDate,
              paymentMethod: p.paymentMethod,
              referenceNo: p.referenceNo || supplierInvoiceNo || purchaseNumber,
              remarks: `Payment for PO #${purchaseNumber} (${p.paymentMethod})`,
              recordedBy: session.user.name || session.user.email,
            },
          });
        }
      } else if (totalPaidPaise > 0) {
        await tx.supplierPayment.create({
          data: {
            supplierId,
            purchaseId: purchase.id,
            amount: totalPaidPaise,
            paymentDate: targetDate,
            paymentMethod: effectivePaymentMethod,
            referenceNo: supplierInvoiceNo || purchaseNumber,
            remarks: `Initial payment on ${purchaseNumber}`,
            recordedBy: session.user.name || session.user.email,
          },
        });
      }

      return purchase;
    });

    try {
      revalidatePath('/dashboard/admin/purchases');
      revalidatePath('/dashboard/admin/stock');
      revalidatePath('/dashboard/admin/production');
      revalidatePath('/dashboard/admin');
    } catch {}

    return { success: true, purchase: result };
  } catch (err: any) {
    return { error: err.message || 'Failed to record purchase' };
  }
}

/**
 * Delete a purchase with complete inventory and payment reconciliation.
 */
export async function deletePurchase(purchaseId: string) {
  await requireAdminSession();

  try {
    await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: { id: purchaseId },
        include: { items: true },
      });

      if (!purchase) throw new Error('Purchase record not found');

      // Reverse stock additions for linked raw materials
      for (const item of purchase.items) {
        if (item.materialId) {
          const mat = await tx.rawMaterial.findUnique({ where: { id: item.materialId } });
          if (mat) {
            const openingStock = mat.currentStock;
            const closingStock = Math.max(0, openingStock - item.quantity);

            await tx.rawMaterial.update({
              where: { id: item.materialId },
              data: { currentStock: closingStock },
            });

            await tx.rawMaterialMovement.create({
              data: {
                materialId: item.materialId,
                type: 'ADJUSTMENT',
                quantity: -item.quantity,
                openingStock,
                closingStock,
                referenceNo: `REVERSE-${purchase.purchaseNumber}`,
                notes: `Purchase cancellation reversal for ${purchase.purchaseNumber}`,
                movementDate: getCurrentKolkataTime(),
              },
            });
          }
        }
      }

      // Delete linked supplier payments
      await tx.supplierPayment.deleteMany({
        where: { purchaseId },
      });

      // Delete purchase (cascade deletes items)
      await tx.purchase.delete({
        where: { id: purchaseId },
      });
    });

    try {
      revalidatePath('/dashboard/admin/purchases');
      revalidatePath('/dashboard/admin/stock');
      revalidatePath('/dashboard/admin');
    } catch {}

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to delete purchase' };
  }
}

/**
 * Create a new external supplier.
 */
export async function createSupplier(data: z.infer<typeof SupplierSchema>) {
  await requireAdminSession();

  const parsed = SupplierSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const supplier = await prisma.supplier.create({
      data: {
        name: parsed.data.name.trim(),
        contactPerson: parsed.data.contactPerson?.trim() || null,
        phone: parsed.data.phone?.trim() || null,
        address: parsed.data.address?.trim() || null,
        gstin: parsed.data.gstin?.trim() || null,
        openingBalance: parsed.data.openingBalancePaise,
        openingBalanceType: parsed.data.openingBalanceType,
        paymentTerms: parsed.data.paymentTerms?.trim() || null,
        notes: parsed.data.notes?.trim() || null,
      },
    });

    revalidatePath('/dashboard/admin/purchases');
    return { success: true, supplier };
  } catch (err: any) {
    return { error: err.message || 'Failed to create supplier' };
  }
}

/**
 * Update an existing supplier.
 */
export async function updateSupplier(supplierId: string, data: z.infer<typeof SupplierSchema>) {
  await requireAdminSession();

  const parsed = SupplierSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const supplier = await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        name: parsed.data.name.trim(),
        contactPerson: parsed.data.contactPerson?.trim() || null,
        phone: parsed.data.phone?.trim() || null,
        address: parsed.data.address?.trim() || null,
        gstin: parsed.data.gstin?.trim() || null,
        openingBalance: parsed.data.openingBalancePaise,
        openingBalanceType: parsed.data.openingBalanceType,
        paymentTerms: parsed.data.paymentTerms?.trim() || null,
        notes: parsed.data.notes?.trim() || null,
      },
    });

    revalidatePath('/dashboard/admin/purchases');
    return { success: true, supplier };
  } catch (err: any) {
    return { error: err.message || 'Failed to update supplier' };
  }
}

/**
 * Record a payment to an external supplier.
 */
export async function recordSupplierPayment(data: z.infer<typeof SupplierPaymentSchema>) {
  const session = await requireAdminSession();

  const parsed = SupplierPaymentSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { supplierId, purchaseId, amountPaise, paymentDate, paymentMethod, referenceNo, remarks } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
      if (!supplier) throw new Error('Supplier not found');

      const targetDate = paymentDate ? new Date(paymentDate) : getCurrentKolkataTime();

      await tx.supplierPayment.create({
        data: {
          supplierId,
          purchaseId: purchaseId || null,
          amount: amountPaise,
          paymentDate: targetDate,
          paymentMethod,
          referenceNo: referenceNo?.trim() || null,
          remarks: remarks?.trim() || null,
          recordedBy: session.user.name || session.user.email,
        },
      });

      // If associated with a specific purchase, update its paidAmount and status
      if (purchaseId) {
        const purchase = await tx.purchase.findUnique({ where: { id: purchaseId } });
        if (purchase) {
          const newPaidAmount = purchase.paidAmount + amountPaise;
          const newStatus = newPaidAmount >= purchase.totalAmount ? 'PAID' : 'PARTIAL';

          await tx.purchase.update({
            where: { id: purchaseId },
            data: {
              paidAmount: newPaidAmount,
              paymentStatus: newStatus,
            },
          });
        }
      }
    });

    try {
      revalidatePath('/dashboard/admin/purchases');
      revalidatePath('/dashboard/admin');
    } catch {}

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to record supplier payment' };
  }
}
