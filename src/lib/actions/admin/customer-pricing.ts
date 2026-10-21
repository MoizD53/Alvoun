'use server';

import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { isExecutiveRole } from '@/lib/rbac';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const SetRateSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  productId: z.string().min(1, 'Product ID is required'),
  ratePaise: z.number().int().min(0, 'Rate must be a non-negative integer in paise'),
});

const ResetRateSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  productId: z.string().min(1, 'Product ID is required'),
});

export interface CustomerProductRateItem {
  productId: string;
  productName: string;
  bottlesPerCrate: number;
  standardRatePaise: number;
  customerRatePaise: number | null;
  effectiveRatePaise: number;
  isCustomized: boolean;
  updatedAt?: string | null;
}

/**
 * Fetch all products with standard rates, customer-specific rates, and effective pricing.
 */
export async function getCustomerProductRates(customerId: string): Promise<{
  success: boolean;
  rates?: CustomerProductRateItem[];
  customerName?: string;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'Unauthorized: Session required' };
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, customerName: true },
  });

  if (!customer) {
    return { success: false, error: 'Customer not found' };
  }

  // 1. Fetch active products with standard rates
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      rates: {
        orderBy: { minQuantity: 'asc' },
      },
    },
    orderBy: { bottlesPerCrate: 'asc' }, // 1L (12), 500ml (24), 250ml (48)
  });

  // 2. Fetch configured customer-specific rates
  const customRates = await prisma.customerProductRate.findMany({
    where: { customerId },
  });

  const customRateMap = new Map(customRates.map((cr) => [cr.productId, cr]));

  const result: CustomerProductRateItem[] = products.map((prod) => {
    // Standard baseline rate (minQuantity = 0 or first rate entry)
    const baseStandardRate = prod.rates[0]?.rate ?? 0;
    const custom = customRateMap.get(prod.id);

    const hasCustomRate = custom !== undefined && custom.rate !== null;
    const customerRatePaise = hasCustomRate ? custom.rate : null;
    const effectiveRatePaise = hasCustomRate ? custom.rate : baseStandardRate;

    return {
      productId: prod.id,
      productName: prod.name,
      bottlesPerCrate: prod.bottlesPerCrate,
      standardRatePaise: baseStandardRate,
      customerRatePaise,
      effectiveRatePaise,
      isCustomized: hasCustomRate,
      updatedAt: custom?.updatedAt ? custom.updatedAt.toISOString() : null,
    };
  });

  return {
    success: true,
    rates: result,
    customerName: customer.customerName,
  };
}

/**
 * Configure or update a customer-specific product rate with transactional audit logging.
 */
export async function setCustomerProductRate(rawInput: {
  customerId: string;
  productId: string;
  ratePaise: number;
}) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'Authentication required' };
  }

  if (!isExecutiveRole(session.user.role)) {
    return { success: false, error: 'Permission denied: Executive role required' };
  }

  const parsed = SetRateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { customerId, productId, ratePaise } = parsed.data;

  // Validate customer and product exist
  const [customer, product] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId } }),
    prisma.product.findUnique({ where: { id: productId } }),
  ]);

  if (!customer) return { success: false, error: 'Customer not found' };
  if (!product) return { success: false, error: 'Product not found' };

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Fetch previous rate if exists
      const existing = await tx.customerProductRate.findUnique({
        where: {
          customerId_productId: { customerId, productId },
        },
      });

      const prevRate = existing ? existing.rate : null;

      // 2. Upsert customer product rate
      const record = await tx.customerProductRate.upsert({
        where: {
          customerId_productId: { customerId, productId },
        },
        create: {
          customerId,
          productId,
          rate: ratePaise,
        },
        update: {
          rate: ratePaise,
        },
      });

      // 3. Write immutable audit log entry
      await tx.auditLog.create({
        data: {
          actorId: session.user.id || 'system',
          actorName: session.user.name || 'Admin',
          actorRole: session.user.role || 'OWNER',
          action: 'CUSTOMER_RATE_UPDATED',
          entityType: 'CustomerProductRate',
          entityId: record.id,
          customerId,
          productId,
          previousRate: prevRate,
          newRate: ratePaise,
          details: `Set ${product.name} rate for "${customer.customerName}" to ₹${(ratePaise / 100).toFixed(2)}/crate`,
        },
      });

      return record;
    });

    revalidatePath(`/dashboard/admin/customers/${customerId}`);
    revalidatePath(`/dashboard/admin/customers`);

    return {
      success: true,
      data: updated,
      message: `Rate for ${product.name} set to ₹${(ratePaise / 100).toFixed(2)}`,
    };
  } catch (error: any) {
    console.error('Failed to set customer rate:', error);
    return { success: false, error: error.message || 'Database error occurred' };
  }
}

/**
 * Reset a customer's customized product rate back to the standard product rate.
 */
export async function resetCustomerProductRate(rawInput: {
  customerId: string;
  productId: string;
}) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'Authentication required' };
  }

  if (!isExecutiveRole(session.user.role)) {
    return { success: false, error: 'Permission denied: Executive role required' };
  }

  const parsed = ResetRateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { customerId, productId } = parsed.data;

  // Validate customer and product exist
  const [customer, product] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId } }),
    prisma.product.findUnique({
      where: { id: productId },
      include: { rates: { orderBy: { minQuantity: 'asc' } } },
    }),
  ]);

  if (!customer) return { success: false, error: 'Customer not found' };
  if (!product) return { success: false, error: 'Product not found' };

  const standardRate = product.rates[0]?.rate ?? 0;

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.customerProductRate.findUnique({
        where: {
          customerId_productId: { customerId, productId },
        },
      });

      if (existing) {
        await tx.customerProductRate.delete({
          where: { id: existing.id },
        });

        // Write audit log entry
        await tx.auditLog.create({
          data: {
            actorId: session.user.id || 'system',
            actorName: session.user.name || 'Admin',
            actorRole: session.user.role || 'OWNER',
            action: 'CUSTOMER_RATE_RESET',
            entityType: 'CustomerProductRate',
            entityId: existing.id,
            customerId,
            productId,
            previousRate: existing.rate,
            newRate: standardRate,
            details: `Reset ${product.name} rate for "${customer.customerName}" back to standard ₹${(standardRate / 100).toFixed(2)}/crate`,
          },
        });
      }
    });

    revalidatePath(`/dashboard/admin/customers/${customerId}`);
    revalidatePath(`/dashboard/admin/customers`);

    return {
      success: true,
      message: `Reset ${product.name} to standard rate (₹${(standardRate / 100).toFixed(2)})`,
    };
  } catch (error: any) {
    console.error('Failed to reset customer rate:', error);
    return { success: false, error: error.message || 'Database error occurred' };
  }
}
