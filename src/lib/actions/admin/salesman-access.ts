'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function getSalesmenAccess() {
  const salesmen = await prisma.salesman.findMany({
    include: {
      assignments: {
        include: {
          route: true,
          area: true
        }
      }
    }
  });

  const salesmanStats = await Promise.all(salesmen.map(async (salesman) => {
    // Get total customers in assigned areas
    const areaIds = salesman.assignments.map(a => a.areaId);
    
    let totalCustomers = 0;
    if (areaIds.length > 0) {
      totalCustomers = await prisma.customer.count({
        where: {
          areaId: { in: areaIds }
        }
      });
    }

    return {
      id: salesman.id,
      name: salesman.name,
      employeeCode: salesman.employeeCode,
      routes: Array.from(new Set(salesman.assignments.map(a => a.route.name))),
      areas: Array.from(new Set(salesman.assignments.map(a => a.area.name))),
      totalCustomers
    };
  }));

  return salesmanStats;
}

export async function getRoutesAndAreas() {
  return await prisma.route.findMany({
    include: {
      areas: true
    }
  });
}

export async function getSalesmanAssignments(salesmanId: string) {
  return await prisma.salesmanAssignment.findMany({
    where: { salesmanId }
  });
}

export async function assignTerritory(salesmanId: string, assignments: { routeId: string, areaId: string }[]) {
  // Use a transaction to ensure atomic updates
  await prisma.$transaction(async (tx) => {
    // 1. Delete existing assignments
    await tx.salesmanAssignment.deleteMany({
      where: { salesmanId }
    });

    // 2. Also remove this salesman from any customers they were previously assigned to
    await tx.customer.updateMany({
      where: { salesmanId },
      data: { salesmanId: null }
    });

    if (assignments.length > 0) {
      // 3. Insert new assignments
      await tx.salesmanAssignment.createMany({
        data: assignments.map(a => ({
          salesmanId,
          routeId: a.routeId,
          areaId: a.areaId
        }))
      });

      // 4. Assign customers in those areas to this salesman
      const areaIds = assignments.map(a => a.areaId);
      
      // Ensure no other salesman claims these areas (territory is exclusive)
      // Remove other salesmen from these areas if they exist
      await tx.salesmanAssignment.deleteMany({
        where: {
          areaId: { in: areaIds },
          salesmanId: { not: salesmanId }
        }
      });
      
      await tx.customer.updateMany({
        where: { areaId: { in: areaIds } },
        data: { salesmanId }
      });
    }
  });

  revalidatePath('/dashboard/admin/salesmen-access');
  revalidatePath('/dashboard/admin');
  revalidatePath('/dashboard/salesman');
  return { success: true };
}

export async function deleteAssignment(salesmanId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.salesmanAssignment.deleteMany({
      where: { salesmanId }
    });

    await tx.customer.updateMany({
      where: { salesmanId },
      data: { salesmanId: null }
    });
  });

  revalidatePath('/dashboard/admin/salesmen-access');
  return { success: true };
}
