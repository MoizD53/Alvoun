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
    orderBy: { bottlesPerCrate: 'asc' } // 1L (12), 500ml (24), 250ml (48)
  });
  return products;
}

/**
 * Fetch effective product rates for a specific customer.
 * Applies customer-specific rate if configured, otherwise falls back to standard product rate.
 */
export async function getCustomerEffectiveRates(customerId: string) {
  const [products, customRates] = await Promise.all([
    getProductsWithRates(),
    prisma.customerProductRate.findMany({ where: { customerId } })
  ]);
  const customRateMap = new Map(customRates.map(cr => [cr.productId, cr.rate]));

  return products.map(p => {
    const defaultStandardRate = p.rates[0]?.rate ?? 0;
    const isCustomized = customRateMap.has(p.id);
    const effectiveRate = isCustomized ? customRateMap.get(p.id)! : defaultStandardRate;
    return {
      productId: p.id,
      productName: p.name,
      bottlesPerCrate: p.bottlesPerCrate,
      standardRate: defaultStandardRate,
      effectiveRate,
      isCustomized,
      rates: p.rates
    };
  });
}

const SaleItemSchema = z.object({
  productId: z.string(),
  crates: z.number().min(0),
  actualRate: z.number().min(0).optional() // Client submitted price (server resolves authoritative rate)
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

  // Verify salesman authorization for this customer
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer || customer.salesmanId !== salesmanId) return { error: 'Unauthorized: Customer not assigned to you' };

  // Filter out items with 0 crates
  const validItems = items.filter(i => i.crates > 0);
  if (validItems.length === 0) return { error: 'No items with quantity > 0' };

  try {
    // 1. Fetch products and customer-specific rates server-side
    const [products, customRates] = await Promise.all([
      getProductsWithRates(),
      prisma.customerProductRate.findMany({ where: { customerId } })
    ]);
    const customRateMap = new Map(customRates.map(cr => [cr.productId, cr.rate]));

    let totalAmount = 0;
    const saleItemsData: any[] = [];

    // 2. Resolve authoritative rate per item server-side
    for (const item of validItems) {
      const product = products.find(p => p.id === item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);

      // Find standard rate based on quantity tier
      const applicableRate = product.rates.find(r => item.crates >= r.minQuantity) || product.rates[product.rates.length - 1];
      const standardRate = applicableRate ? applicableRate.rate : 0;

      // Customer-specific rate overrides standard rate if configured
      const effectiveRate = customRateMap.has(item.productId)
        ? customRateMap.get(item.productId)!
        : standardRate;
      
      const lineAmount = item.crates * effectiveRate;
      totalAmount += lineAmount;

      saleItemsData.push({
        productId: item.productId,
        crates: item.crates,
        looseBottles: 0,
        standardRate,
        actualRate: effectiveRate, // Server-enforced rate persisted in SaleItem
        amount: lineAmount
      });
    }

    // 3. Execute in atomic transaction
    let createdSaleId = '';
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
      createdSaleId = sale.id;

      if (paymentAmount > 0) {
        if (!paymentMethod) throw new Error('Payment method required when amount > 0');
        await tx.payment.create({
          data: {
            customerId,
            salesmanId,
            amount: paymentAmount,
            paymentMethod,
            paymentDate: new Date()
          }
        });
      }
    });

    return { 
      success: true, 
      saleId: createdSaleId,
      totalAmount
    };
  } catch (error: any) {
    console.error('Error creating sale:', error);
    return { error: error.message || 'Failed to create sale' };
  }
}
