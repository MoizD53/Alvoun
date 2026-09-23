'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

export async function getSalesmenAccounts() {
  const salesmen = await prisma.salesman.findMany({
    include: {
      profile: true,
      routes: true,
      assignments: {
        include: {
          route: true,
          area: true,
        },
      },
      workSessions: {
        where: {
          workDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return salesmen;
}

export async function createSalesmanAccount(data: any) {
  try {
    const { name, phone, employeeCode, loginId, password, routeId, areaIds = [], isActive } = data;

    // Check if profile (login ID) already exists
    const existingProfile = await prisma.profile.findUnique({
      where: { email: loginId },
    });

    if (existingProfile) {
      return { error: 'Login ID already exists.' };
    }

    // Check if employee code already exists
    const existingEmployee = await prisma.salesman.findUnique({
      where: { employeeCode },
    });

    if (existingEmployee) {
      return { error: 'Employee code already exists.' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const profile = await prisma.profile.create({
      data: {
        name,
        phone,
        email: loginId, // Storing login ID in the email field
        password: hashedPassword,
        role: 'SALESMAN', // Force role
        isActive,
      },
    });

    const salesman = await prisma.salesman.create({
      data: {
        profileId: profile.id,
        employeeCode,
        name,
        phone,
        isActive,
      },
    });

    // 1. Assign Primary Route if selected
    if (routeId) {
      await prisma.route.update({
        where: { id: routeId },
        data: { salesmanId: salesman.id },
      });
    }

    // 2. Assign Areas and territory
    if (areaIds && areaIds.length > 0) {
      const selectedAreas = await prisma.area.findMany({
        where: { id: { in: areaIds } },
      });

      // Clear any conflicting assignments for these areas
      await prisma.salesmanAssignment.deleteMany({
        where: { areaId: { in: areaIds } },
      });

      await prisma.salesmanAssignment.createMany({
        data: selectedAreas.map(a => ({
          salesmanId: salesman.id,
          routeId: a.routeId,
          areaId: a.id,
        })),
      });

      // Automatically attach customers in these assigned areas to this salesman
      await prisma.customer.updateMany({
        where: { areaId: { in: areaIds } },
        data: { salesmanId: salesman.id },
      });
    }

    revalidatePath('/dashboard/admin/salesmen');
    revalidatePath('/dashboard/admin/salesmen-access');
    return { success: true, id: salesman.id };
  } catch (error: any) {
    console.error('Error creating salesman:', error);
    return { error: error.message || 'Failed to create salesman.' };
  }
}

export async function updateSalesmanAccount(id: string, data: any) {
  try {
    const { name, phone, employeeCode, loginId, routeId, areaIds, isActive } = data;

    const salesman = await prisma.salesman.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!salesman) {
      return { error: 'Salesman not found.' };
    }

    // Check uniqueness if changing login ID
    if (loginId !== salesman.profile.email) {
      const existingProfile = await prisma.profile.findUnique({
        where: { email: loginId },
      });
      if (existingProfile) return { error: 'Login ID already exists.' };
    }

    // Check uniqueness if changing employee code
    if (employeeCode !== salesman.employeeCode) {
      const existingEmployee = await prisma.salesman.findUnique({
        where: { employeeCode },
      });
      if (existingEmployee) return { error: 'Employee code already exists.' };
    }

    await prisma.$transaction(async (tx) => {
      await tx.profile.update({
        where: { id: salesman.profileId },
        data: {
          name,
          phone,
          email: loginId,
          isActive,
        },
      });

      await tx.salesman.update({
        where: { id },
        data: {
          name,
          phone,
          employeeCode,
          isActive,
        },
      });

      if (routeId !== undefined) {
        // Unassign old route if changing
        await tx.route.updateMany({
          where: { salesmanId: id },
          data: { salesmanId: null },
        });

        if (routeId) {
          await tx.route.update({
            where: { id: routeId },
            data: { salesmanId: id },
          });
        }
      }

      // Update territory area assignments if provided
      if (areaIds !== undefined) {
        await tx.salesmanAssignment.deleteMany({
          where: { salesmanId: id },
        });

        // Unlink previous customers
        await tx.customer.updateMany({
          where: { salesmanId: id },
          data: { salesmanId: null },
        });

        if (areaIds.length > 0) {
          const selectedAreas = await tx.area.findMany({
            where: { id: { in: areaIds } },
          });

          // Unassign other salesmen from these areas
          await tx.salesmanAssignment.deleteMany({
            where: {
              areaId: { in: areaIds },
              salesmanId: { not: id },
            },
          });

          await tx.salesmanAssignment.createMany({
            data: selectedAreas.map(a => ({
              salesmanId: id,
              routeId: a.routeId,
              areaId: a.id,
            })),
          });

          await tx.customer.updateMany({
            where: { areaId: { in: areaIds } },
            data: { salesmanId: id },
          });
        }
      }
    });

    revalidatePath('/dashboard/admin/salesmen');
    revalidatePath(`/dashboard/admin/salesmen/${id}`);
    revalidatePath('/dashboard/admin/salesmen-access');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating salesman:', error);
    return { error: error.message || 'Failed to update salesman.' };
  }
}

export async function resetSalesmanPassword(profileId: string, newPassword: string) {
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.profile.update({
      where: { id: profileId },
      data: { password: hashedPassword },
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error resetting password:', error);
    return { error: 'Failed to reset password.' };
  }
}

export async function toggleSalesmanLoginAccess(profileId: string, isActive: boolean) {
  try {
    await prisma.profile.update({
      where: { id: profileId },
      data: { isActive },
    });

    revalidatePath('/dashboard/admin/salesmen');
    return { success: true };
  } catch (error: any) {
    console.error('Error toggling login access:', error);
    return { error: 'Failed to toggle login access.' };
  }
}
