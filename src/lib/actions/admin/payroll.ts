'use server';

import { prisma } from '@/lib/db';
import { requireAdminSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getKolkataStartOfDay, getKolkataEndOfDay, getCurrentKolkataTime } from '@/lib/time';

const StaffSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['PRODUCTION_STAFF', 'ACCOUNTANT', 'DRIVER', 'LABOUR', 'SUPERVISOR', 'SALESMAN']),
  phone: z.string().optional().nullable(),
  monthlySalaryPaise: z.number().int().positive('Salary must be positive'),
});

export async function getStaffDirectory() {
  await requireAdminSession();
  return await prisma.staffMember.findMany({
    orderBy: { employeeCode: 'asc' },
  });
}

export async function createStaffMember(data: {
  name: string;
  role: 'PRODUCTION_STAFF' | 'ACCOUNTANT' | 'DRIVER' | 'LABOUR' | 'SUPERVISOR' | 'SALESMAN';
  phone?: string;
  monthlySalaryPaise: number;
}) {
  await requireAdminSession();

  const parsed = StaffSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const count = await prisma.staffMember.count();
  const employeeCode = `EMP-${String(count + 1).padStart(3, '0')}`;

  try {
    const staff = await prisma.staffMember.create({
      data: {
        employeeCode,
        name: parsed.data.name,
        role: parsed.data.role,
        phone: parsed.data.phone || null,
        monthlySalary: parsed.data.monthlySalaryPaise,
        isActive: true,
      },
    });

    try {
      revalidatePath('/dashboard/admin/payroll');
      revalidatePath('/dashboard/admin');
    } catch {}

    return { success: true, id: staff.id, employeeCode };
  } catch (error: any) {
    return { error: error.message || 'Failed to add staff member' };
  }
}

export async function getDailyAttendance(dateStr?: string) {
  await requireAdminSession();

  const targetDateStr = dateStr || getCurrentKolkataTime().toISOString().split('T')[0];
  const start = getKolkataStartOfDay(targetDateStr);
  const end = getKolkataEndOfDay(targetDateStr);

  const [allStaff, attendances] = await Promise.all([
    prisma.staffMember.findMany({ where: { isActive: true }, orderBy: { employeeCode: 'asc' } }),
    prisma.staffAttendance.findMany({
      where: { date: { gte: start, lte: end } },
    }),
  ]);

  const attendanceMap = new Map<string, any>();
  for (const a of attendances) {
    attendanceMap.set(a.staffId, a);
  }

  const staffWithAttendance = allStaff.map((s) => {
    const record = attendanceMap.get(s.id);
    return {
      id: s.id,
      employeeCode: s.employeeCode,
      name: s.name,
      role: s.role,
      status: record?.status || 'PENDING',
      notes: record?.notes || '',
      attendanceId: record?.id || null,
    };
  });

  const presentCount = attendances.filter((a) => a.status === 'PRESENT').length;
  const halfDayCount = attendances.filter((a) => a.status === 'HALF_DAY').length;
  const absentCount = attendances.filter((a) => a.status === 'ABSENT').length;

  return {
    targetDateStr,
    staff: staffWithAttendance,
    totalStaff: allStaff.length,
    presentCount,
    halfDayCount,
    absentCount,
  };
}

export async function saveDailyAttendance(records: {
  staffId: string;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY';
  notes?: string;
}[], dateStr?: string) {
  await requireAdminSession();

  const targetDateStr = dateStr || getCurrentKolkataTime().toISOString().split('T')[0];
  const dateToUse = new Date(`${targetDateStr}T12:00:00+05:30`);

  try {
    await prisma.$transaction(async (tx) => {
      for (const r of records) {
        const existing = await tx.staffAttendance.findFirst({
          where: {
            staffId: r.staffId,
            date: {
              gte: getKolkataStartOfDay(targetDateStr),
              lte: getKolkataEndOfDay(targetDateStr),
            },
          },
        });

        if (existing) {
          await tx.staffAttendance.update({
            where: { id: existing.id },
            data: { status: r.status, notes: r.notes || null },
          });
        } else {
          await tx.staffAttendance.create({
            data: {
              staffId: r.staffId,
              date: dateToUse,
              status: r.status,
              notes: r.notes || null,
            },
          });
        }
      }
    });

    try {
      revalidatePath('/dashboard/admin/payroll');
      revalidatePath('/dashboard/admin');
    } catch {}

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to save attendance' };
  }
}

export async function getPayrollLedger(month: number, year: number) {
  await requireAdminSession();

  const allStaff = await prisma.staffMember.findMany({
    where: { isActive: true },
    orderBy: { employeeCode: 'asc' },
  });

  const records = await prisma.payrollRecord.findMany({
    where: { month, year },
    include: { staff: true },
  });

  const recordMap = new Map<string, any>();
  for (const r of records) {
    recordMap.set(r.staffId, r);
  }

  const ledger = allStaff.map((staff) => {
    const existing = recordMap.get(staff.id);
    if (existing) {
      return existing;
    }
    // Default draft
    return {
      id: `draft-${staff.id}`,
      staffId: staff.id,
      staff,
      month,
      year,
      basicSalary: staff.monthlySalary,
      allowances: 0,
      deductions: 0,
      advances: 0,
      netPayable: staff.monthlySalary,
      status: 'PENDING',
      paymentDate: null,
      paymentMethod: null,
      notes: null,
    };
  });

  const totalPayrollPaise = ledger.reduce((sum, item) => sum + item.netPayable, 0);
  const paidCount = ledger.filter((l) => l.status === 'PAID').length;
  const pendingCount = ledger.filter((l) => l.status === 'PENDING').length;

  return {
    ledger,
    month,
    year,
    totalPayrollPaise,
    paidCount,
    pendingCount,
  };
}

export async function recordPayrollPayment(data: {
  staffId: string;
  month: number;
  year: number;
  basicSalaryPaise: number;
  allowancesPaise?: number;
  deductionsPaise?: number;
  advancesPaise?: number;
  paymentMethod: string;
  notes?: string;
}) {
  const session = await requireAdminSession();

  const {
    staffId,
    month,
    year,
    basicSalaryPaise,
    allowancesPaise = 0,
    deductionsPaise = 0,
    advancesPaise = 0,
    paymentMethod,
    notes,
  } = data;

  const netPayable = basicSalaryPaise + allowancesPaise - deductionsPaise - advancesPaise;
  const now = getCurrentKolkataTime();

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.payrollRecord.findUnique({
        where: { staffId_month_year: { staffId, month, year } },
      });

      if (existing) {
        await tx.payrollRecord.update({
          where: { id: existing.id },
          data: {
            basicSalary: basicSalaryPaise,
            allowances: allowancesPaise,
            deductions: deductionsPaise,
            advances: advancesPaise,
            netPayable,
            status: 'PAID',
            paymentDate: now,
            paymentMethod,
            notes: notes || null,
          },
        });
      } else {
        await tx.payrollRecord.create({
          data: {
            staffId,
            month,
            year,
            basicSalary: basicSalaryPaise,
            allowances: allowancesPaise,
            deductions: deductionsPaise,
            advances: advancesPaise,
            netPayable,
            status: 'PAID',
            paymentDate: now,
            paymentMethod,
            notes: notes || null,
          },
        });
      }

      // Also create an Expense entry under SALARY so cash flow automatically reconciles!
      const staff = await tx.staffMember.findUnique({ where: { id: staffId } });
      await tx.expense.create({
        data: {
          category: 'SALARY',
          title: `Salary Disbursement: ${staff?.name || 'Staff'} (${month}/${year})`,
          amount: netPayable,
          expenseDate: now,
          paymentMethod: paymentMethod === 'UPI' ? 'UPI' : paymentMethod === 'BANK_TRANSFER' ? 'BANK_TRANSFER' : 'CASH',
          recipient: staff?.name,
          referenceNo: `PAYROLL-${year}-${String(month).padStart(2, '0')}-${staff?.employeeCode}`,
          notes: notes || `Disbursed monthly salary for ${month}/${year}`,
          recordedBy: session.user.name || 'Admin',
        },
      });
    });

    try {
      revalidatePath('/dashboard/admin/payroll');
      revalidatePath('/dashboard/admin/expenses');
      revalidatePath('/dashboard/admin');
    } catch {}

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to record payroll payment' };
  }
}
