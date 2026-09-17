'use server';

import { prisma } from '@/lib/db';
import { requireActiveSalesmanSession } from '@/lib/session';
import { z } from 'zod';

export async function getProductsWithRates() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      rates: {
        orderBy: { minQuantity: 'desc' }
      }
    },
    orderBy: { bottlesPerCrate: 'asc' } // just to keep 1L (12), 500ml (24), 250ml (48) in order
  });
  return products;
}

const SaleItemSchema = z.object({
  productId: z.string(),
  crates: z.number().min(0),
  actualRate: z.number().min(0) // paise
});

const SaleSchema = z.object({
  customerId: z.string(),
  items: z.array(SaleItemSchema).min(1, "At least one product is required"),
  paymentAmount: z.number().min(0),
  paymentMethod: z.string().optional()
});

export async function createSale(data: any) {
  let salesmanId: string;
  try {
    const { salesman } = await requireActiveSalesmanSession();
    salesmanId = salesman.id;
  } catch (error: any) {
    return { error: error.message };
  }
  
  const parsed = SaleSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  
  const { customerId, items, paymentAmount, paymentMethod } = parsed.data;

  // Verify ownership
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer || customer.salesmanId !== salesmanId) return { error: 'Unauthorized' };

  // Filter out items with 0 crates
  const validItems = items.filter(i => i.crates > 0);
  if (validItems.length === 0) return { error: 'No items with quantity > 0' };

  try {
    const products = await getProductsWithRates();
    let totalAmount = 0;
    const saleItemsData: any[] = [];

    for (const item of validItems) {
      const product = products.find(p => p.id === item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);

      // Find applicable standard rate based on quantity
      const applicableRate = product.rates.find(r => item.crates >= r.minQuantity) || product.rates[product.rates.length - 1];
      const standardRate = applicableRate ? applicableRate.rate : 0;
      
      const amount = item.crates * item.actualRate;
      totalAmount += amount;

      saleItemsData.push({
        productId: item.productId,
        crates: item.crates,
        looseBottles: 0, // as requested, ignore loose unless cleanly supported. Let's stick to crates.
        standardRate,
        actualRate: item.actualRate,
        amount
      });
    }

    // Execute in transaction
    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          customerId,
          salesmanId,
          totalAmount,
          items: {
            create: saleItemsData
          }
        }
      });

      if (paymentAmount > 0) {
        if (!paymentMethod) throw new Error('Payment method required when amount > 0');
        await tx.payment.create({
          data: {
            customerId,
            salesmanId,
            amount: paymentAmount,
            paymentMethod
          }
        });
      }
    });

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to create sale' };
  }
}
