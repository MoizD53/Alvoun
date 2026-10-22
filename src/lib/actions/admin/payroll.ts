'use server';

import { prisma } from '@/lib/db';
import { requireAdminSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { 
  getKolkataStartOfDay, 
  getKolkataEndOfDay, 
  getCurrentKolkataTime, 
  getKolkataDateString,
  getKolkataMonthBoundaries
} from '@/lib/time';

const StaffSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['PRODUCTION_STAFF', 'ACCOUNTANT', 'DRIVER', 'LABOUR', 'SUPERVISOR', 'SALESMAN']).default('PRODUCTION_STAFF'),
  designation: z.string().min(1, 'Designation is required'),
  phone: z.string().optional().nullable(),
  monthlySalaryRupees: z.number().positive('Salary must be greater than zero'),
  joinDate: z.string().optional(),
  salesmanId: z.string().optional().nullable(),
});

export async function getStaffDirectory() {
  await requireAdminSession();
  return await prisma.staffMember.findMany({
    orderBy: { employeeCode: 'asc' },
    include: {
      salesman: {
        select: { id: true, employeeCode: true, name: true, phone: true }
      }
    }
  });
}

export async function getUnlinkedSalesmen() {
  await requireAdminSession();
  const allSalesmen = await prisma.salesman.findMany({
    where: { isActive: true },
    select: { id: true, employeeCode: true, name: true, phone: true }
  });

  const staff = await prisma.staffMember.findMany({
    select: { salesmanId: true }
  });
  const linkedSalesmanIds = new Set(staff.map(s => s.salesmanId).filter(Boolean));

  return allSalesmen.filter(s => !linkedSalesmanIds.has(s.id));
}

export async function createStaffMember(data: {
  name: string;
  role?: 'PRODUCTION_STAFF' | 'ACCOUNTANT' | 'DRIVER' | 'LABOUR' | 'SUPERVISOR' | 'SALESMAN';
  designation: string;
  phone?: string;
  monthlySalaryRupees: number;
  joinDate?: string;
  salesmanId?: string;
}) {
  const session = await requireAdminSession();

  const parsed = StaffSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const count = await prisma.staffMember.count();
  const employeeCode = `EMP-${String(count + 1).padStart(3, '0')}`;
  const monthlySalaryPaise = Math.round(parsed.data.monthlySalaryRupees * 100);
  const joinDate = parsed.data.joinDate ? new Date(parsed.data.joinDate) : getCurrentKolkataTime();

  try {
    const staff = await prisma.staffMember.create({
      data: {
        employeeCode,
        name: parsed.data.name.trim(),
        role: parsed.data.role || (parsed.data.salesmanId ? 'SALESMAN' : 'PRODUCTION_STAFF'),
        designation: parsed.data.designation.trim(),
        phone: parsed.data.phone?.trim() || null,
        monthlySalary: monthlySalaryPaise,
        joinDate,
        isActive: true,
        salesmanId: parsed.data.salesmanId || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id || 'admin',
        actorName: session.user.name || 'Admin',
        actorRole: session.user.role || 'FOUNDER_CEO',
        action: 'STAFF_MEMBER_CREATED',
        entityType: 'StaffMember',
        entityId: staff.id,
        details: JSON.stringify({
          employeeCode: staff.employeeCode,
          name: staff.name,
          designation: staff.designation,
          monthlySalaryPaise,
          salesmanId: staff.salesmanId,
        }),
      }
    }).catch(() => {});

    // Initialize current month's payroll record
    const now = getCurrentKolkataTime();
    await recalculateMonthlyPayroll(now.getMonth() + 1, now.getFullYear());

    try {
      revalidatePath('/dashboard/admin/payroll');
      revalidatePath('/dashboard/admin');
    } catch {}

    return { success: true, id: staff.id, employeeCode };
  } catch (error: any) {
    return { error: error.message || 'Failed to add staff member' };
  }
}

export async function updateStaffMember(id: string, data: {
  name: string;
  role?: string;
  designation: string;
  phone?: string;
  monthlySalaryRupees: number;
  isActive?: boolean;
}) {
  const session = await requireAdminSession();

  try {
    const existing = await prisma.staffMember.findUnique({ where: { id } });
    if (!existing) return { error: 'Staff member not found.' };

    const newSalaryPaise = Math.round(data.monthlySalaryRupees * 100);

    const updated = await prisma.staffMember.update({
      where: { id },
      data: {
        name: data.name.trim(),
        role: data.role || existing.role,
        designation: data.designation.trim(),
        phone: data.phone?.trim() || null,
        monthlySalary: newSalaryPaise,
        isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
      }
    });

    // If salary changed, record audit trail and recalculate active payroll month
    if (existing.monthlySalary !== newSalaryPaise) {
      await prisma.auditLog.create({
        data: {
          actorId: session.user.id || 'admin',
          actorName: session.user.name || 'Admin',
          actorRole: session.user.role || 'FOUNDER_CEO',
          action: 'STAFF_SALARY_UPDATED',
          entityType: 'StaffMember',
          entityId: id,
          previousRate: existing.monthlySalary,
          newRate: newSalaryPaise,
          details: JSON.stringify({
            employeeCode: updated.employeeCode,
            name: updated.name,
            oldSalaryRupees: existing.monthlySalary / 100,
            newSalaryRupees: newSalaryPaise / 100,
            effectiveDate: getKolkataDateString(getCurrentKolkataTime()),
          })
        }
      }).catch(() => {});

      const now = getCurrentKolkataTime();
      await recalculateMonthlyPayroll(now.getMonth() + 1, now.getFullYear());
    }

    try {
      revalidatePath('/dashboard/admin/payroll');
      revalidatePath('/dashboard/admin');
    } catch {}

    return { success: true, staff: updated };
  } catch (error: any) {
    return { error: error.message || 'Failed to update staff member' };
  }
}

export async function toggleStaffStatus(id: string, nextActive: boolean) {
  const session = await requireAdminSession();
  try {
    const staff = await prisma.staffMember.update({
      where: { id },
      data: { isActive: nextActive },
    });

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id || 'admin',
        actorName: session.user.name || 'Admin',
        actorRole: session.user.role || 'FOUNDER_CEO',
        action: nextActive ? 'STAFF_ACTIVATED' : 'STAFF_DEACTIVATED',
        entityType: 'StaffMember',
        entityId: id,
        details: JSON.stringify({
          employeeCode: staff.employeeCode,
          name: staff.name,
          isActive: nextActive,
        }),
      }
    }).catch(() => {});

    try {
      revalidatePath('/dashboard/admin/payroll');
      revalidatePath('/dashboard/admin');
    } catch {}

    return { success: true, isActive: staff.isActive };
  } catch (error: any) {
    return { error: error.message || 'Failed to toggle staff status' };
  }
}

export async function deleteStaffMember(id: string) {
  await requireAdminSession();
  try {
    const [attCount, payCount, salCount] = await Promise.all([
      prisma.staffAttendance.count({ where: { staffId: id } }),
      prisma.payrollRecord.count({ where: { staffId: id } }),
      prisma.salaryPayment.count({ where: { staffId: id } }),
    ]);

    if (attCount > 0 || payCount > 0 || salCount > 0) {
      return { 
        error: `Cannot delete employee because ${attCount + payCount + salCount} financial/attendance records exist. Please deactivate this employee instead to preserve audit records.` 
      };
    }

    await prisma.staffMember.delete({ where: { id } });

    try {
      revalidatePath('/dashboard/admin/payroll');
      revalidatePath('/dashboard/admin');
    } catch {}

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete staff member' };
  }
}

export async function getDailyAttendance(dateStr?: string) {
  await requireAdminSession();

  const todayStr = getKolkataDateString(getCurrentKolkataTime());
  const targetDateStr = dateStr || todayStr;
  const start = getKolkataStartOfDay(targetDateStr);
  const end = getKolkataEndOfDay(targetDateStr);

  const [allStaff, attendances] = await Promise.all([
    prisma.staffMember.findMany({ 
      where: { isActive: true }, 
      orderBy: { employeeCode: 'asc' },
      include: {
        salesman: {
          select: { id: true, employeeCode: true, name: true }
        }
      }
    }),
    prisma.staffAttendance.findMany({
      where: {
        OR: [
          { dateStr: targetDateStr },
          { date: { gte: start, lte: end } }
        ]
      },
    }),
  ]);

  const attendanceMap = new Map<string, any>();
  for (const a of attendances) {
    attendanceMap.set(a.staffId, a);
  }

  const staffWithAttendance = allStaff.map((s) => {
    const record = attendanceMap.get(s.id);
    const dailyRatePaise = Math.floor(s.monthlySalary / 30);
    return {
      id: s.id,
      employeeCode: s.employeeCode,
      name: s.name,
      designation: s.designation || s.role,
      role: s.role,
      monthlySalaryPaise: s.monthlySalary,
      dailyRatePaise,
      salesman: s.salesman,
      status: (record?.status || 'PENDING') as 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'PENDING',
      notes: record?.notes || '',
      attendanceId: record?.id || null,
    };
  });

  const presentCount = attendances.filter((a) => a.status === 'PRESENT').length;
  const halfDayCount = attendances.filter((a) => a.status === 'HALF_DAY').length;
  const absentCount = attendances.filter((a) => a.status === 'ABSENT').length;
  const pendingCount = allStaff.length - (presentCount + halfDayCount + absentCount);

  return {
    targetDateStr,
    todayStr,
    isFutureDate: targetDateStr > todayStr,
    staff: staffWithAttendance,
    totalStaff: allStaff.length,
    presentCount,
    halfDayCount,
    absentCount,
    pendingCount: Math.max(0, pendingCount),
  };
}

export async function saveDailyAttendance(records: {
  staffId: string;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY';
  notes?: string;
}[], dateStr?: string) {
  const session = await requireAdminSession();

  const todayStr = getKolkataDateString(getCurrentKolkataTime());
  const targetDateStr = dateStr || todayStr;

  // Server-side strict rejection of future dates in Asia/Kolkata
  if (targetDateStr > todayStr) {
    return { error: 'Attendance cannot be marked or edited for future dates.' };
  }

  const dateToUse = new Date(`${targetDateStr}T12:00:00+05:30`);
  const start = getKolkataStartOfDay(targetDateStr);
  const end = getKolkataEndOfDay(targetDateStr);

  const [yearStr, monthStr] = targetDateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  try {
    await prisma.$transaction(async (tx) => {
      for (const r of records) {
        const existing = await tx.staffAttendance.findFirst({
          where: {
            staffId: r.staffId,
            OR: [
              { dateStr: targetDateStr },
              { date: { gte: start, lte: end } }
            ]
          },
        });

        if (existing) {
          if (existing.status !== r.status) {
            const staff = await tx.staffMember.findUnique({ where: { id: r.staffId } });
            await tx.auditLog.create({
              data: {
                actorId: session.user.id || 'admin',
                actorName: session.user.name || 'Admin',
                actorRole: session.user.role || 'FOUNDER_CEO',
                action: 'ATTENDANCE_CORRECTED',
                entityType: 'StaffAttendance',
                entityId: existing.id,
                details: JSON.stringify({
                  staffName: staff?.name,
                  employeeCode: staff?.employeeCode,
                  date: targetDateStr,
                  previousStatus: existing.status,
                  newStatus: r.status,
                  notes: r.notes || null,
                })
              }
            });
          }

          await tx.staffAttendance.update({
            where: { id: existing.id },
            data: { 
              status: r.status, 
              notes: r.notes || null,
              dateStr: targetDateStr,
              date: dateToUse,
            },
          });
        } else {
          await tx.staffAttendance.create({
            data: {
              staffId: r.staffId,
              date: dateToUse,
              dateStr: targetDateStr,
              status: r.status,
              notes: r.notes || null,
            },
          });
        }
      }
    });

    await recalculateMonthlyPayroll(month, year);

    try {
      revalidatePath('/dashboard/admin/payroll');
      revalidatePath('/dashboard/admin');
    } catch {}

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to save attendance' };
  }
}

export async function recalculateMonthlyPayroll(month: number, year: number) {
  const boundaries = getKolkataMonthBoundaries(year, month);
  const start = boundaries.start;
  const end = boundaries.end;

  const allStaff = await prisma.staffMember.findMany({
    orderBy: { employeeCode: 'asc' },
  });

  for (const staff of allStaff) {
    const attendances = await prisma.staffAttendance.findMany({
      where: {
        staffId: staff.id,
        date: { gte: start, lte: end }
      }
    });

    const fullDayAbsences = attendances.filter(a => a.status === 'ABSENT').length;
    const halfDayAbsences = attendances.filter(a => a.status === 'HALF_DAY').length;

    const dailyRate = Math.floor(staff.monthlySalary / 30);
    const fullDayDeductions = fullDayAbsences * dailyRate;
    const halfDayDeductions = halfDayAbsences * Math.floor(dailyRate / 2);
    const totalDeductions = fullDayDeductions + halfDayDeductions;

    const netPayable = Math.max(0, staff.monthlySalary - totalDeductions);

    const existingPayroll = await prisma.payrollRecord.findUnique({
      where: { staffId_month_year: { staffId: staff.id, month, year } },
      include: {
        payments: {
          where: { isReversed: false }
        }
      }
    });

    const paidAmount = existingPayroll 
      ? existingPayroll.payments.reduce((sum, p) => sum + p.amount, 0)
      : 0;

    const remainingBalance = Math.max(0, netPayable - paidAmount);
    const status = paidAmount >= netPayable && netPayable > 0 
      ? 'PAID' 
      : paidAmount > 0 
        ? 'PARTIALLY_PAID' 
        : 'UNPAID';

    await prisma.payrollRecord.upsert({
      where: { staffId_month_year: { staffId: staff.id, month, year } },
      update: {
        basicSalary: staff.monthlySalary,
        fullDayAbsences,
        halfDayAbsences,
        fullDayDeductions,
        halfDayDeductions,
        deductions: totalDeductions,
        netPayable,
        paidAmount,
        remainingBalance,
        status,
      },
      create: {
        staffId: staff.id,
        month,
        year,
        basicSalary: staff.monthlySalary,
        fullDayAbsences,
        halfDayAbsences,
        fullDayDeductions,
        halfDayDeductions,
        deductions: totalDeductions,
        netPayable,
        paidAmount,
        remainingBalance,
        status,
      }
    });
  }
}

export async function getPayrollLedger(month: number, year: number) {
  await requireAdminSession();

  await recalculateMonthlyPayroll(month, year);

  const records = await prisma.payrollRecord.findMany({
    where: { month, year },
    include: {
      staff: {
        include: {
          salesman: {
            select: { id: true, employeeCode: true, name: true }
          }
        }
      },
      payments: {
        where: { isReversed: false },
        orderBy: { paymentDate: 'desc' }
      }
    },
    orderBy: { staff: { employeeCode: 'asc' } }
  });

  const ledger = records.map((r) => {
    const dailyRate = Math.floor(r.basicSalary / 30);
    return {
      id: r.id,
      staffId: r.staffId,
      staff: r.staff,
      month: r.month,
      year: r.year,
      basicSalary: r.basicSalary,
      dailyRate,
      fullDayAbsences: r.fullDayAbsences,
      halfDayAbsences: r.halfDayAbsences,
      fullDayDeductions: r.fullDayDeductions,
      halfDayDeductions: r.halfDayDeductions,
      totalDeductions: r.deductions,
      netPayable: r.netPayable,
      paidAmount: r.paidAmount,
      remainingBalance: r.remainingBalance,
      status: r.status as 'UNPAID' | 'PARTIALLY_PAID' | 'PAID',
      payments: r.payments,
      paymentDate: r.paymentDate,
      paymentMethod: r.paymentMethod,
      notes: r.notes,
    };
  });

  const totalBaseSalaryPaise = ledger.reduce((sum, item) => sum + item.basicSalary, 0);
  const totalDeductionsPaise = ledger.reduce((sum, item) => sum + item.totalDeductions, 0);
  const totalNetPayablePaise = ledger.reduce((sum, item) => sum + item.netPayable, 0);
  const totalPaidPaise = ledger.reduce((sum, item) => sum + item.paidAmount, 0);
  const totalRemainingBalancePaise = ledger.reduce((sum, item) => sum + item.remainingBalance, 0);

  const paidCount = ledger.filter((l) => l.status === 'PAID').length;
  const partiallyPaidCount = ledger.filter((l) => l.status === 'PARTIALLY_PAID').length;
  const unpaidCount = ledger.filter((l) => l.status === 'UNPAID').length;

  return {
    ledger,
    month,
    year,
    totalBaseSalaryPaise,
    totalDeductionsPaise,
    totalNetPayablePaise,
    totalPaidPaise,
    totalRemainingBalancePaise,
    paidCount,
    partiallyPaidCount,
    unpaidCount,
  };
}

export async function recordSalaryPayment(data: {
  staffId: string;
  month: number;
  year: number;
  amountRupees: number;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'UPI';
  paymentDateStr?: string;
  referenceNo?: string;
  notes?: string;
}) {
  const session = await requireAdminSession();

  const {
    staffId,
    month,
    year,
    amountRupees,
    paymentMethod,
    paymentDateStr,
    referenceNo,
    notes,
  } = data;

  const amountPaise = Math.round(amountRupees * 100);

  if (amountPaise <= 0) {
    return { error: 'Payment amount must be greater than zero.' };
  }

  const paymentDate = paymentDateStr 
    ? new Date(`${paymentDateStr}T12:00:00+05:30`) 
    : getCurrentKolkataTime();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const payroll = await tx.payrollRecord.findUnique({
        where: { staffId_month_year: { staffId, month, year } },
        include: { staff: true }
      });

      if (!payroll) {
        throw new Error('Payroll record for this month does not exist. Please generate attendance first.');
      }

      if (amountPaise > payroll.remainingBalance) {
        throw new Error(`Payment amount (₹${amountRupees.toLocaleString('en-IN')}) exceeds outstanding balance (₹${(payroll.remainingBalance / 100).toLocaleString('en-IN')}).`);
      }

      const payment = await tx.salaryPayment.create({
        data: {
          payrollRecordId: payroll.id,
          staffId,
          amount: amountPaise,
          paymentDate,
          paymentMethod,
          referenceNo: referenceNo?.trim() || null,
          notes: notes?.trim() || null,
          recordedBy: session.user.name || 'Admin',
        }
      });

      const newPaidAmount = payroll.paidAmount + amountPaise;
      const newRemainingBalance = Math.max(0, payroll.netPayable - newPaidAmount);
      const newStatus = newRemainingBalance === 0 ? 'PAID' : 'PARTIALLY_PAID';

      await tx.payrollRecord.update({
        where: { id: payroll.id },
        data: {
          paidAmount: newPaidAmount,
          remainingBalance: newRemainingBalance,
          status: newStatus,
          paymentDate,
          paymentMethod,
        }
      });

      // Synchronize to Company Expenses idempotently
      const expenseRef = `SAL-${year}-${String(month).padStart(2, '0')}-${payroll.staff.employeeCode}-${payment.id}`;
      const existingExpense = await tx.expense.findFirst({
        where: { referenceNo: expenseRef }
      });

      if (!existingExpense) {
        await tx.expense.create({
          data: {
            category: 'SALARY',
            title: `Salary Disbursement: ${payroll.staff.name} (${month}/${year})`,
            amount: amountPaise,
            expenseDate: paymentDate,
            paymentMethod,
            recipient: payroll.staff.name,
            referenceNo: expenseRef,
            notes: notes?.trim() || `Disbursed monthly salary for ${month}/${year}`,
            recordedBy: session.user.name || 'Admin',
          }
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: session.user.id || 'admin',
          actorName: session.user.name || 'Admin',
          actorRole: session.user.role || 'FOUNDER_CEO',
          action: 'SALARY_PAYMENT_RECORDED',
          entityType: 'SalaryPayment',
          entityId: payment.id,
          details: JSON.stringify({
            staffName: payroll.staff.name,
            employeeCode: payroll.staff.employeeCode,
            month,
            year,
            amountPaise,
            paymentMethod,
            referenceNo: referenceNo || null,
            remainingBalance: newRemainingBalance,
          })
        }
      });

      return { paymentId: payment.id, remainingBalance: newRemainingBalance };
    });

    try {
      revalidatePath('/dashboard/admin/payroll');
      revalidatePath('/dashboard/admin/expenses');
      revalidatePath('/dashboard/admin');
    } catch {}

    return { success: true, ...result };
  } catch (error: any) {
    return { error: error.message || 'Failed to record salary payment' };
  }
}

export async function reverseSalaryPayment(paymentId: string, reason: string) {
  const session = await requireAdminSession();

  if (!reason || !reason.trim()) {
    return { error: 'Reversal reason is required.' };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const payment = await tx.salaryPayment.findUnique({
        where: { id: paymentId },
        include: { payrollRecord: true, staff: true }
      });

      if (!payment) throw new Error('Payment record not found.');
      if (payment.isReversed) throw new Error('Payment has already been reversed.');

      const now = getCurrentKolkataTime();

      await tx.salaryPayment.update({
        where: { id: paymentId },
        data: {
          isReversed: true,
          reversalReason: reason.trim(),
          reversedAt: now,
          reversedBy: session.user.name || 'Admin',
        }
      });

      const payroll = payment.payrollRecord;
      const newPaidAmount = Math.max(0, payroll.paidAmount - payment.amount);
      const newRemainingBalance = Math.max(0, payroll.netPayable - newPaidAmount);
      const newStatus = newPaidAmount >= payroll.netPayable && payroll.netPayable > 0
        ? 'PAID'
        : newPaidAmount > 0
          ? 'PARTIALLY_PAID'
          : 'UNPAID';

      await tx.payrollRecord.update({
        where: { id: payroll.id },
        data: {
          paidAmount: newPaidAmount,
          remainingBalance: newRemainingBalance,
          status: newStatus,
        }
      });

      // Update associated expense record
      const expenseRef = `SAL-${payroll.year}-${String(payroll.month).padStart(2, '0')}-${payment.staff.employeeCode}-${payment.id}`;
      await tx.expense.updateMany({
        where: { referenceNo: expenseRef },
        data: {
          notes: `[REVERSED on ${now.toISOString().split('T')[0]} - Reason: ${reason.trim()}]`,
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: session.user.id || 'admin',
          actorName: session.user.name || 'Admin',
          actorRole: session.user.role || 'FOUNDER_CEO',
          action: 'SALARY_PAYMENT_REVERSED',
          entityType: 'SalaryPayment',
          entityId: paymentId,
          details: JSON.stringify({
            staffName: payment.staff.name,
            employeeCode: payment.staff.employeeCode,
            reversedAmountPaise: payment.amount,
            reason: reason.trim(),
            reversedBy: session.user.name,
          })
        }
      });
    });

    try {
      revalidatePath('/dashboard/admin/payroll');
      revalidatePath('/dashboard/admin/expenses');
      revalidatePath('/dashboard/admin');
    } catch {}

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to reverse salary payment' };
  }
}

export async function getStaffProfileDetails(staffId: string, year?: number) {
  await requireAdminSession();

  const targetYear = year || getCurrentKolkataTime().getFullYear();

  const [staff, attendances, payrolls, payments, auditLogs] = await Promise.all([
    prisma.staffMember.findUnique({
      where: { id: staffId },
      include: {
        salesman: {
          select: { id: true, employeeCode: true, name: true, phone: true }
        }
      }
    }),
    prisma.staffAttendance.findMany({
      where: { staffId },
      orderBy: { date: 'desc' },
      take: 60,
    }),
    prisma.payrollRecord.findMany({
      where: { staffId, year: targetYear },
      orderBy: { month: 'desc' },
      include: {
        payments: {
          where: { isReversed: false },
          orderBy: { paymentDate: 'desc' }
        }
      }
    }),
    prisma.salaryPayment.findMany({
      where: { staffId },
      orderBy: { paymentDate: 'desc' },
      take: 20,
    }),
    prisma.auditLog.findMany({
      where: { entityId: staffId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  if (!staff) return null;

  const dailyRatePaise = Math.floor(staff.monthlySalary / 30);

  return {
    staff: {
      ...staff,
      dailyRatePaise,
    },
    attendances,
    payrolls,
    payments,
    auditLogs,
  };
}
