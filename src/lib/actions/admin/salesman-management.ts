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
    const { name, phone, loginId, password, routeId, areaIds = [], isActive } = data;

    // Check if profile (login ID) already exists
    const existingProfile = await prisma.profile.findUnique({
      where: { email: loginId },
    });

    if (existingProfile) {
      return { error: 'Login ID already exists.' };
    }

    const employeeCode = `SLM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

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
    const { name, phone, loginId, routeId, areaIds, isActive } = data;

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
          isActive,
        },
      });

      if (!isActive) {
        // Force close active work sessions
        await tx.workSession.updateMany({
          where: { 
            salesmanId: id,
            logoutAt: null 
          },
          data: {
            logoutAt: new Date(),
            status: 'FORCE_CLOSED'
          }
        });

        // Close active visits
        await tx.visit.updateMany({
          where: {
            salesmanId: id,
            status: 'STARTED'
          },
          data: {
            status: 'COMPLETED',
            noSaleReason: 'Account disabled'
          }
        });
      }

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
    revalidatePath('/dashboard/admin/sessions');
    revalidatePath('/dashboard/admin');
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
    await prisma.$transaction(async (tx) => {
      await tx.profile.update({
        where: { id: profileId },
        data: { isActive },
      });

      if (!isActive) {
        const salesman = await tx.salesman.findUnique({
          where: { profileId },
        });

        if (salesman) {
          await tx.workSession.updateMany({
            where: { 
              salesmanId: salesman.id,
              logoutAt: null 
            },
            data: {
              logoutAt: new Date(),
              status: 'FORCE_CLOSED'
            }
          });

          await tx.visit.updateMany({
            where: {
              salesmanId: salesman.id,
              status: 'STARTED'
            },
            data: {
              status: 'COMPLETED',
              noSaleReason: 'Account disabled'
            }
          });
        }
      }
    });

    revalidatePath('/dashboard/admin/salesmen');
    revalidatePath('/dashboard/admin/sessions');
    revalidatePath('/dashboard/admin');
    return { success: true };
  } catch (error: any) {
    console.error('Error toggling login access:', error);
    return { error: 'Failed to toggle login access.' };
  }
}
export async function deleteSalesman(id: string) {
  try {
    const salesman = await prisma.salesman.findUnique({
      where: { id },
    });

    if (!salesman) {
      return { error: 'Salesman not found.' };
    }

    await prisma.$transaction(async (tx) => {
      await tx.sale.deleteMany({
        where: { salesmanId: id }
      });
      
      await tx.payment.deleteMany({
        where: { salesmanId: id }
      });

      await tx.visit.deleteMany({
        where: { salesmanId: id }
      });

      await tx.workSession.deleteMany({
        where: { salesmanId: id }
      });

      await tx.profile.delete({
        where: { id: salesman.profileId }
      });
    });

    revalidatePath('/dashboard/admin/salesmen');
    revalidatePath('/dashboard/admin/sessions');
    revalidatePath('/dashboard/admin');
    
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting salesman:', error);
    return { error: error.message || 'Failed to completely delete salesman.' };
  }
}
