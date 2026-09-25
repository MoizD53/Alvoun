'use server';

import { prisma } from '@/lib/db';
import { requireActiveSalesmanSession } from '@/lib/session';
import { logAndEmitActivity } from '@/lib/events';
import { z } from 'zod';
import { getProductsWithRates } from './sale';
import { calculateOutstanding } from '@/lib/outstanding';
import { revalidatePath } from 'next/cache';
import { formatKolkataVisitTime } from '@/lib/time';

const VisitFlowSchema = z.object({
  customerId: z.string(),
  isNoSale: z.boolean(),
  noSaleReason: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    crates: z.number().min(0)
  })).optional(),
  receivedNow: z.number().min(0)
});

export async function submitVisitFlow(data: any) {
  let salesmanId: string;
  let salesmanName: string;
  try {
    const { salesman } = await requireActiveSalesmanSession();
    salesmanId = salesman.id;
    salesmanName = salesman.name;
  } catch (error: any) {
    return { error: error.message };
  }
  
  const parsed = VisitFlowSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  
  const { customerId, isNoSale, noSaleReason, items = [], receivedNow } = parsed.data;

  // Verify ownership
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer || customer.salesmanId !== salesmanId) return { error: 'Unauthorized' };

  try {
    let totalAmount = 0;
    const saleItemsData: any[] = [];
    const validItems = items.filter(i => i.crates > 0);

    if (!isNoSale && validItems.length > 0) {
      const products = await getProductsWithRates();
      
      for (const item of validItems) {
        const product = products.find(p => p.id === item.productId);
        if (!product) throw new Error(`Product ${item.productId} not found`);

        // Find applicable standard rate based on quantity
        const applicableRate = product.rates.find(r => item.crates >= r.minQuantity) || product.rates[product.rates.length - 1];
        const rateToUse = applicableRate ? applicableRate.rate : 0;
        
        const amount = item.crates * rateToUse;
        totalAmount += amount;

        saleItemsData.push({
          productId: item.productId,
          crates: item.crates,
          looseBottles: 0,
          standardRate: rateToUse,
          actualRate: rateToUse, // the field sales flow auto-assigns the exact current standard rate
          amount
        });
      }
    }

    if (receivedNow > totalAmount) {
      throw new Error('Received amount cannot be greater than today\'s sale amount in this flow. Please use the standalone collection for previous dues if this exceeds the current sale.');
    }

    let createdVisit: any = null;
    let productsList: any[] = [];

    // Execute in transaction
    await prisma.$transaction(async (tx) => {
      // 1. Create Visit
      createdVisit = await tx.visit.create({
        data: {
          customerId,
          salesmanId,
          status: 'COMPLETED',
          noSaleReason: isNoSale ? (noSaleReason || 'No sale') : null
        }
      });

      // 2. Create Sale (if applicable)
      let sale = null;
      if (!isNoSale && saleItemsData.length > 0) {
        sale = await tx.sale.create({
          data: {
            customerId,
            salesmanId,
            totalAmount,
            items: {
              create: saleItemsData
            }
          }
        });
      }

      // 3. Create Payment (if applicable)
      if (receivedNow > 0) {
        await tx.payment.create({
          data: {
            customerId,
            salesmanId,
            amount: receivedNow,
            paymentMethod: 'CASH'
          }
        });
      }
    });

    if (!isNoSale && validItems.length > 0) {
      productsList = await getProductsWithRates();
    }

    revalidatePath('/dashboard/salesman');
    revalidatePath('/dashboard/salesman/customers');
    revalidatePath(`/dashboard/salesman/customers/${customerId}`);
    revalidatePath('/dashboard/admin/activity');

    // Logging outside transaction for side-effects
    if (isNoSale) {
      await logAndEmitActivity({
        salesmanId,
        salesmanName,
        type: 'VISIT_END',
        description: `Completed no-sale visit at ${customer.customerName}`
      });
    } else {
      await logAndEmitActivity({
        salesmanId,
        salesmanName,
        type: 'SALE',
        description: `Completed visit and sale worth ₹${(totalAmount / 100).toFixed(2)} at ${customer.customerName}`,
        metadata: { amount: totalAmount }
      });
      if (receivedNow > 0) {
        await logAndEmitActivity({
          salesmanId,
          salesmanName,
          type: 'PAYMENT',
          description: `Collected ₹${(receivedNow / 100).toFixed(2)} at ${customer.customerName}`,
          metadata: { amount: receivedNow }
        });
      }
    }

    const dueFromSale = Math.max(0, totalAmount - receivedNow);

    return { 
      success: true,
      visit: {
        visitId: createdVisit.id,
        visitedAt: createdVisit.createdAt.toISOString(),
        formattedTime: formatKolkataVisitTime(createdVisit.createdAt),
        isNoSale,
        noSaleReason: isNoSale ? (noSaleReason || 'No sale') : null,
        saleAmount: totalAmount,
        receivedAmount: receivedNow,
        dueFromSale,
        items: saleItemsData.map(item => {
          const product = productsList.find(p => p.id === item.productId);
          return {
            productId: item.productId,
            productName: product?.name || 'Product',
            crates: item.crates,
            looseBottles: 0,
            rate: item.actualRate,
            amount: item.amount
          };
        })
      }
    };
  } catch (error: any) {
    return { error: error.message || 'Failed to complete visit' };
  }
}

export async function getCustomerWithOutstanding(customerId: string) {
  const { salesman } = await requireActiveSalesmanSession();
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { 
      route: true,
      sales: { select: { totalAmount: true } },
      payments: { select: { amount: true } }
    }
  });
  if (!customer || customer.salesmanId !== salesman.id) throw new Error('Unauthorized');
  
  const outstanding = calculateOutstanding(customer);
  return { ...customer, outstanding };
}
