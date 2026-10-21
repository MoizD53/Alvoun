'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  IndianRupee,
  CreditCard,
  Briefcase,
  Calendar,
  Save,
  CheckCircle,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  createStaffMember, 
  saveDailyAttendance, 
  recordPayrollPayment 
} from '@/lib/actions/admin/payroll';

interface StaffItem {
  id: string;
  employeeCode: string;
  name: string;
  role: string;
  phone?: string | null;
  monthlySalary: number;
  isActive: boolean;
}

interface AttendanceStaffItem {
  id: string;
  employeeCode: string;
  name: string;
  role: string;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'PENDING';
  notes: string;
  attendanceId?: string | null;
}

interface LedgerItem {
  id: string;
  staffId: string;
  staff: StaffItem;
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  advances: number;
  netPayable: number;
  status: 'PENDING' | 'PAID';
  paymentDate?: Date | string | null;
  paymentMethod?: string | null;
  notes?: string | null;
}

interface PayrollClientProps {
  staffList: StaffItem[];
  attendanceData: {
    targetDateStr: string;
    staff: AttendanceStaffItem[];
    totalStaff: number;
    presentCount: number;
    halfDayCount: number;
    absentCount: number;
  };
  ledgerData: LedgerItem[];
  currentDate: string;
  currentMonth: number;
  currentYear: number;
}

const ROLE_LABELS: Record<string, string> = {
  PRODUCTION_STAFF: 'Production Staff',
  ACCOUNTANT: 'Accountant',
  DRIVER: 'Driver / Logistics',
  LABOUR: 'Plant Labour',
  SUPERVISOR: 'Plant Supervisor',
  SALESMAN: 'Sales Executive',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function PayrollClient({
  staffList,
  attendanceData,
  ledgerData,
  currentDate,
  currentMonth,
  currentYear,
}: PayrollClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'ATTENDANCE' | 'PAYROLL' | 'STAFF'>('ATTENDANCE');

  // Attendance state
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, { status: 'PRESENT' | 'ABSENT' | 'HALF_DAY'; notes: string }>>(
    () => {
      const initial: Record<string, { status: 'PRESENT' | 'ABSENT' | 'HALF_DAY'; notes: string }> = {};
      for (const s of attendanceData.staff) {
        initial[s.id] = {
          status: s.status === 'PENDING' ? 'PRESENT' : (s.status as any),
          notes: s.notes || '',
        };
      }
      return initial;
    }
  );
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [attendanceFeedback, setAttendanceFeedback] = useState('');

  // Add Staff Modal State
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffFormData, setStaffFormData] = useState({
    name: '',
    role: 'PRODUCTION_STAFF' as any,
    phone: '',
    monthlySalaryRupees: '',
  });

  // Disburse Modal State
  const [disburseModalOpen, setDisburseModalOpen] = useState(false);
  const [selectedStaffForDisburse, setSelectedStaffForDisburse] = useState<LedgerItem | null>(null);
  const [disburseFormData, setDisburseFormData] = useState({
    allowancesRupees: '0',
    deductionsRupees: '0',
    advancesRupees: '0',
    paymentMethod: 'CASH',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Handle Attendance Save
  const handleSaveAttendance = async () => {
    setIsSavingAttendance(true);
    setAttendanceFeedback('');
    try {
      const recordsToSave = Object.entries(attendanceRecords).map(([staffId, data]) => ({
        staffId,
        status: data.status,
        notes: data.notes || undefined,
      }));

      const res = await saveDailyAttendance(recordsToSave, currentDate);
      if (res.error) {
        setAttendanceFeedback(`Error: ${res.error}`);
      } else {
        setAttendanceFeedback('Daily attendance saved successfully!');
        setTimeout(() => {
          setAttendanceFeedback('');
          router.refresh();
        }, 1500);
      }
    } catch {
      setAttendanceFeedback('Failed to save attendance');
    } finally {
      setIsSavingAttendance(false);
    }
  };

  // Add Staff Submit
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const salary = parseFloat(staffFormData.monthlySalaryRupees);
    if (!staffFormData.name.trim()) {
      setErrorMsg('Staff name is required');
      return;
    }
    if (isNaN(salary) || salary <= 0) {
      setErrorMsg('Please enter a valid monthly salary');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createStaffMember({
        name: staffFormData.name.trim(),
        role: staffFormData.role,
        phone: staffFormData.phone.trim() || undefined,
        monthlySalaryPaise: Math.round(salary * 100),
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(`Employee ${res.employeeCode} added successfully!`);
        setTimeout(() => {
          setStaffModalOpen(false);
          setSuccessMsg('');
          router.refresh();
        }, 1200);
      }
    } catch {
      setErrorMsg('Failed to create staff member');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Disburse Submit
  const handleDisburseSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffForDisburse) return;
    setErrorMsg('');
    setSuccessMsg('');

    setIsSubmitting(true);
    try {
      const allowances = Math.round((parseFloat(disburseFormData.allowancesRupees) || 0) * 100);
      const deductions = Math.round((parseFloat(disburseFormData.deductionsRupees) || 0) * 100);
      const advances = Math.round((parseFloat(disburseFormData.advancesRupees) || 0) * 100);

      const res = await recordPayrollPayment({
        staffId: selectedStaffForDisburse.staffId,
        month: currentMonth,
        year: currentYear,
        basicSalaryPaise: selectedStaffForDisburse.basicSalary,
        allowancesPaise: allowances,
        deductionsPaise: deductions,
        advancesPaise: advances,
        paymentMethod: disburseFormData.paymentMethod,
        notes: disburseFormData.notes.trim() || undefined,
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(`Salary disbursed & recorded under Company Expenses!`);
        setTimeout(() => {
          setDisburseModalOpen(false);
          setSuccessMsg('');
          router.refresh();
        }, 1200);
      }
    } catch {
      setErrorMsg('Failed to process salary payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export Excel
  const handleExportXLSX = async () => {
    const xlsx = await import('xlsx');
    const wb = xlsx.utils.book_new();

    // 1. Payroll Ledger
    const ledgerRows = ledgerData.map((l) => ({
      'Employee Code': l.staff.employeeCode,
      'Staff Name': l.staff.name,
      'Role': ROLE_LABELS[l.staff.role] || l.staff.role,
      'Month/Year': `${MONTHS[l.month - 1]} ${l.year}`,
      'Basic Salary (INR)': (l.basicSalary / 100).toFixed(2),
      'Allowances (INR)': (l.allowances / 100).toFixed(2),
      'Deductions (INR)': (l.deductions / 100).toFixed(2),
      'Advances (INR)': (l.advances / 100).toFixed(2),
      'Net Payable (INR)': (l.netPayable / 100).toFixed(2),
      'Status': l.status,
      'Payment Method': l.paymentMethod || 'N/A',
      'Payment Date': l.paymentDate ? new Date(l.paymentDate).toLocaleDateString('en-IN') : 'N/A',
    }));
    const wsLedger = xlsx.utils.json_to_sheet(ledgerRows);
    xlsx.utils.book_append_sheet(wb, wsLedger, 'Payroll Ledger');

    // 2. Attendance
    const attendanceRows = attendanceData.staff.map((s) => ({
      'Date': currentDate,
      'Employee Code': s.employeeCode,
      'Staff Name': s.name,
      'Role': ROLE_LABELS[s.role] || s.role,
      'Status': attendanceRecords[s.id]?.status || s.status,
      'Notes': attendanceRecords[s.id]?.notes || s.notes,
    }));
    const wsAttendance = xlsx.utils.json_to_sheet(attendanceRows);
    xlsx.utils.book_append_sheet(wb, wsAttendance, 'Daily Attendance');

    xlsx.writeFile(wb, `Alvoun-Payroll-Attendance-${currentYear}-${currentMonth}.xlsx`);
  };

  // Payroll Totals
  const totalPayrollLiability = ledgerData.reduce((sum, l) => sum + l.netPayable, 0);
  const totalPaidOut = ledgerData.filter((l) => l.status === 'PAID').reduce((sum, l) => sum + l.netPayable, 0);
  const totalPending = totalPayrollLiability - totalPaidOut;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#EDE4D8]/60 p-6 rounded-2xl border border-[#DDD3C3] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_2px_8px_rgba(26,95,99,0.06)]">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#1A5F63]/10 border border-[#1A5F63]/20 flex items-center justify-center text-[#1A5F63]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#1A2E35]">Attendance & Staff Payroll</h1>
              <p className="text-sm text-[#5A6B72]">
                Factory attendance punches, monthly wage ledgers, and automated expense salary vouchers
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={handleExportXLSX}
            className="flex-1 sm:flex-none border-[#DDD3C3] bg-[#F5EFE6] hover:bg-[#EDE4D8] text-[#1A2E35] font-medium shadow-sm gap-2"
          >
            <Download className="h-4 w-4 text-[#1A5F63]" />
            Export Excel
          </Button>
          <Button
            onClick={() => {
              setErrorMsg('');
              setSuccessMsg('');
              setStaffModalOpen(true);
            }}
            className="flex-1 sm:flex-none bg-[#1A5F63] hover:bg-[#13484B] text-white font-medium shadow-sm gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Staff Member
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#DDD3C3]">
        <button
          onClick={() => setActiveTab('ATTENDANCE')}
          className={`py-3 px-6 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'ATTENDANCE'
              ? 'border-[#1A5F63] text-[#1A5F63]'
              : 'border-transparent text-[#5A6B72] hover:text-[#1A2E35]'
          }`}
        >
          <Clock className="h-4 w-4" />
          Daily Attendance Punch Board
        </button>
        <button
          onClick={() => setActiveTab('PAYROLL')}
          className={`py-3 px-6 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'PAYROLL'
              ? 'border-[#1A5F63] text-[#1A5F63]'
              : 'border-transparent text-[#5A6B72] hover:text-[#1A2E35]'
          }`}
        >
          <IndianRupee className="h-4 w-4" />
          Monthly Payroll Ledger
        </button>
        <button
          onClick={() => setActiveTab('STAFF')}
          className={`py-3 px-6 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'STAFF'
              ? 'border-[#1A5F63] text-[#1A5F63]'
              : 'border-transparent text-[#5A6B72] hover:text-[#1A2E35]'
          }`}
        >
          <Briefcase className="h-4 w-4" />
          Staff Directory ({staffList.length})
        </button>
      </div>

      {/* TAB 1: ATTENDANCE PUNCH BOARD */}
      {activeTab === 'ATTENDANCE' && (
        <div className="space-y-4">
          {/* Attendance KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 bg-[#F5EFE6] border-[#DDD3C3] shadow-sm">
              <span className="text-xs font-semibold text-[#5A6B72] uppercase">Total Active Staff</span>
              <div className="text-2xl font-bold text-[#1A2E35] mt-1">{attendanceData.totalStaff}</div>
            </Card>
            <Card className="p-4 bg-[#F5EFE6] border-[#DDD3C3] shadow-sm">
              <span className="text-xs font-semibold text-emerald-700 uppercase">Present</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">{attendanceData.presentCount}</div>
            </Card>
            <Card className="p-4 bg-[#F5EFE6] border-[#DDD3C3] shadow-sm">
              <span className="text-xs font-semibold text-amber-700 uppercase">Half Day</span>
              <div className="text-2xl font-bold text-amber-700 mt-1">{attendanceData.halfDayCount}</div>
            </Card>
            <Card className="p-4 bg-[#F5EFE6] border-[#DDD3C3] shadow-sm">
              <span className="text-xs font-semibold text-rose-700 uppercase">Absent</span>
              <div className="text-2xl font-bold text-rose-700 mt-1">{attendanceData.absentCount}</div>
            </Card>
          </div>

          {/* Date Selector & Save Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#EDE4D8]/60 p-4 rounded-xl border border-[#DDD3C3]">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#1A5F63]" />
              <span className="text-xs font-semibold text-[#1A2E35]">Attendance Date:</span>
              <input
                type="date"
                defaultValue={currentDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  if (newDate) {
                    router.push(`/dashboard/admin/payroll?date=${newDate}&month=${currentMonth}&year=${currentYear}`);
                  }
                }}
                className="text-xs h-9 px-3 rounded-lg border border-[#DDD3C3] bg-[#F5EFE6] text-[#1A2E35] font-medium"
              />
            </div>

            <div className="flex items-center gap-3">
              {attendanceFeedback && (
                <span className="text-xs font-semibold text-emerald-800 animate-in fade-in">
                  {attendanceFeedback}
                </span>
              )}
              <Button
                onClick={handleSaveAttendance}
                disabled={isSavingAttendance}
                className="bg-[#1A5F63] hover:bg-[#13484B] text-white text-xs h-9 px-4 gap-1.5 font-medium"
              >
                <Save className="h-3.5 w-3.5" />
                {isSavingAttendance ? 'Saving...' : 'Save Attendance'}
              </Button>
            </div>
          </div>

          {/* Attendance Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {attendanceData.staff.map((s) => {
              const currentStatus = attendanceRecords[s.id]?.status || 'PRESENT';
              const currentNote = attendanceRecords[s.id]?.notes || '';

              return (
                <div
                  key={s.id}
                  className="p-4 rounded-xl border border-[#DDD3C3] bg-[#F5EFE6] shadow-sm flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-[#1A2E35]">{s.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#EDE4D8] text-[#5A6B72]">
                          {s.employeeCode}
                        </span>
                      </div>
                      <p className="text-xs text-[#5A6B72] mt-0.5">{ROLE_LABELS[s.role] || s.role}</p>
                    </div>

                    <Badge
                      className={
                        currentStatus === 'PRESENT'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : currentStatus === 'HALF_DAY'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }
                    >
                      {currentStatus.replace('_', ' ')}
                    </Badge>
                  </div>

                  {/* Punch Buttons */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setAttendanceRecords((prev) => ({
                          ...prev,
                          [s.id]: { ...prev[s.id], status: 'PRESENT' },
                        }))
                      }
                      className={`h-8 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-all ${
                        currentStatus === 'PRESENT'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white border-[#DDD3C3] text-[#5A6B72] hover:bg-emerald-50'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Present
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setAttendanceRecords((prev) => ({
                          ...prev,
                          [s.id]: { ...prev[s.id], status: 'HALF_DAY' },
                        }))
                      }
                      className={`h-8 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-all ${
                        currentStatus === 'HALF_DAY'
                          ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                          : 'bg-white border-[#DDD3C3] text-[#5A6B72] hover:bg-amber-50'
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5" /> Half Day
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setAttendanceRecords((prev) => ({
                          ...prev,
                          [s.id]: { ...prev[s.id], status: 'ABSENT' },
                        }))
                      }
                      className={`h-8 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-all ${
                        currentStatus === 'ABSENT'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                          : 'bg-white border-[#DDD3C3] text-[#5A6B72] hover:bg-rose-50'
                      }`}
                    >
                      <XCircle className="h-3.5 w-3.5" /> Absent
                    </button>
                  </div>

                  {/* Note Input */}
                  <input
                    type="text"
                    placeholder="Punch remarks (optional)..."
                    value={currentNote}
                    onChange={(e) =>
                      setAttendanceRecords((prev) => ({
                        ...prev,
                        [s.id]: { ...prev[s.id], notes: e.target.value },
                      }))
                    }
                    className="w-full text-xs h-7 px-2 rounded-md border border-[#DDD3C3] bg-white text-[#1A2E35] focus:outline-none focus:ring-1 focus:ring-[#1A5F63]"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: MONTHLY PAYROLL LEDGER */}
      {activeTab === 'PAYROLL' && (
        <div className="space-y-4">
          {/* Payroll KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5 bg-[#F5EFE6] border-[#DDD3C3] shadow-sm">
              <span className="text-xs font-semibold text-[#5A6B72] uppercase">Monthly Payroll Liability</span>
              <div className="text-2xl font-bold text-[#1A2E35] mt-1">
                ₹{(totalPayrollLiability / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <p className="text-xs text-[#5A6B72] mt-0.5">For {MONTHS[currentMonth - 1]} {currentYear}</p>
            </Card>

            <Card className="p-5 bg-[#F5EFE6] border-[#DDD3C3] shadow-sm">
              <span className="text-xs font-semibold text-emerald-700 uppercase">Paid Out (Disbursed)</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">
                ₹{(totalPaidOut / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <p className="text-xs text-[#5A6B72] mt-0.5">Posted directly to Company Expenses</p>
            </Card>

            <Card className="p-5 bg-[#F5EFE6] border-[#DDD3C3] shadow-sm">
              <span className="text-xs font-semibold text-amber-700 uppercase">Pending Clearance</span>
              <div className="text-2xl font-bold text-amber-700 mt-1">
                ₹{(totalPending / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <p className="text-xs text-[#5A6B72] mt-0.5">Awaiting disbursement</p>
            </Card>
          </div>

          {/* Month / Year Selector */}
          <div className="flex items-center gap-3 bg-[#EDE4D8]/60 p-3 rounded-xl border border-[#DDD3C3]">
            <span className="text-xs font-semibold text-[#1A2E35]">Select Payroll Period:</span>
            <select
              value={currentMonth}
              onChange={(e) => {
                router.push(`/dashboard/admin/payroll?date=${currentDate}&month=${e.target.value}&year=${currentYear}`);
              }}
              className="text-xs h-8 px-3 rounded-lg border border-[#DDD3C3] bg-[#F5EFE6] text-[#1A2E35] font-medium"
            >
              {MONTHS.map((m, idx) => (
                <option key={m} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={currentYear}
              onChange={(e) => {
                router.push(`/dashboard/admin/payroll?date=${currentDate}&month=${currentMonth}&year=${e.target.value}`);
              }}
              className="text-xs h-8 px-3 rounded-lg border border-[#DDD3C3] bg-[#F5EFE6] text-[#1A2E35] font-medium"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          {/* Ledger Table */}
          <Card className="border-[#DDD3C3] bg-[#F5EFE6] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[#1A2E35]">
                <thead className="bg-[#EDE4D8] text-xs uppercase font-semibold text-[#5A6B72] border-b border-[#DDD3C3]">
                  <tr>
                    <th className="py-3.5 px-4">Code</th>
                    <th className="py-3.5 px-4">Staff Member</th>
                    <th className="py-3.5 px-4">Designation</th>
                    <th className="py-3.5 px-4 text-right">Base Wage</th>
                    <th className="py-3.5 px-4 text-right">Allowances</th>
                    <th className="py-3.5 px-4 text-right">Deductions</th>
                    <th className="py-3.5 px-4 text-right font-bold text-[#1A5F63]">Net Payable</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDD3C3]/60">
                  {ledgerData.map((item) => (
                    <tr key={item.id} className="hover:bg-[#EDE4D8]/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-[#5A6B72]">
                        {item.staff.employeeCode}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#1A2E35]">
                        {item.staff.name}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#5A6B72]">
                        {ROLE_LABELS[item.staff.role] || item.staff.role}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        ₹{(item.basicSalary / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-right text-emerald-700">
                        +₹{(item.allowances / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-right text-rose-700">
                        -₹{((item.deductions + item.advances) / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#1A5F63]">
                        ₹{(item.netPayable / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {item.status === 'PAID' ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">
                            Disbursed
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                            Pending
                          </Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {item.status === 'PAID' ? (
                          <span className="text-xs text-[#5A6B72]">
                            Paid {item.paymentDate ? new Date(item.paymentDate).toLocaleDateString('en-IN') : ''}
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedStaffForDisburse(item);
                              setDisburseFormData({
                                allowancesRupees: '0',
                                deductionsRupees: '0',
                                advancesRupees: '0',
                                paymentMethod: 'CASH',
                                notes: '',
                              });
                              setErrorMsg('');
                              setSuccessMsg('');
                              setDisburseModalOpen(true);
                            }}
                            className="bg-[#1A5F63] hover:bg-[#13484B] text-white text-xs h-8 px-3 gap-1 rounded-lg"
                          >
                            <CreditCard className="h-3.5 w-3.5" /> Disburse
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: STAFF DIRECTORY */}
      {activeTab === 'STAFF' && (
        <Card className="border-[#DDD3C3] bg-[#F5EFE6] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#1A2E35]">
              <thead className="bg-[#EDE4D8] text-xs uppercase font-semibold text-[#5A6B72] border-b border-[#DDD3C3]">
                <tr>
                  <th className="py-3.5 px-4">Employee Code</th>
                  <th className="py-3.5 px-4">Full Name</th>
                  <th className="py-3.5 px-4">Designation</th>
                  <th className="py-3.5 px-4">Contact Phone</th>
                  <th className="py-3.5 px-4 text-right">Monthly Salary (INR)</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD3C3]/60">
                {staffList.map((staff) => (
                  <tr key={staff.id} className="hover:bg-[#EDE4D8]/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-[#1A5F63]">
                      {staff.employeeCode}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#1A2E35]">
                      {staff.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-[#EDE4D8] border border-[#DDD3C3] font-medium text-[#1A2E35]">
                        {ROLE_LABELS[staff.role] || staff.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#5A6B72]">
                      {staff.phone || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#1A2E35]">
                      ₹{(staff.monthlySalary / 100).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">
                        Active Staff
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODAL 1: ADD STAFF MEMBER */}
      {staffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-[#F5EFE6] border border-[#DDD3C3] w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-[#DDD3C3] bg-[#EDE4D8]/60">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[#1A5F63]/10 flex items-center justify-center text-[#1A5F63]">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1A2E35]">Add Staff Member</h3>
                  <p className="text-xs text-[#5A6B72]">Create employee profile & salary ledger entry</p>
                </div>
              </div>
              <button
                onClick={() => setStaffModalOpen(false)}
                className="text-[#5A6B72] hover:text-[#1A2E35] p-1 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-3 text-xs bg-red-100 border border-red-200 text-red-700 rounded-lg">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-3 text-xs bg-green-100 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {successMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#1A2E35] mb-1">
                  Full Employee Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mukesh Parmar"
                  value={staffFormData.name}
                  onChange={(e) => setStaffFormData({ ...staffFormData, name: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-[#DDD3C3] bg-white text-sm text-[#1A2E35] focus:outline-none focus:ring-2 focus:ring-[#1A5F63]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A2E35] mb-1">
                  Designation / Role *
                </label>
                <select
                  value={staffFormData.role}
                  onChange={(e) => setStaffFormData({ ...staffFormData, role: e.target.value as any })}
                  className="w-full h-10 px-3 rounded-lg border border-[#DDD3C3] bg-white text-sm text-[#1A2E35] focus:outline-none focus:ring-2 focus:ring-[#1A5F63]"
                  required
                >
                  <option value="PRODUCTION_STAFF">Production Staff</option>
                  <option value="ACCOUNTANT">Accountant</option>
                  <option value="DRIVER">Driver / Logistics</option>
                  <option value="LABOUR">Plant Labour</option>
                  <option value="SUPERVISOR">Plant Supervisor</option>
                  <option value="SALESMAN">Sales Executive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A2E35] mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 98250 12345"
                  value={staffFormData.phone}
                  onChange={(e) => setStaffFormData({ ...staffFormData, phone: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-[#DDD3C3] bg-white text-sm text-[#1A2E35] focus:outline-none focus:ring-2 focus:ring-[#1A5F63]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A2E35] mb-1">
                  Monthly Basic Salary (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 18000"
                  value={staffFormData.monthlySalaryRupees}
                  onChange={(e) => setStaffFormData({ ...staffFormData, monthlySalaryRupees: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-[#DDD3C3] bg-white text-sm text-[#1A2E35] focus:outline-none focus:ring-2 focus:ring-[#1A5F63]"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#DDD3C3]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStaffModalOpen(false)}
                  className="border-[#DDD3C3] text-[#1A2E35]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#1A5F63] hover:bg-[#13484B] text-white"
                >
                  {isSubmitting ? 'Adding...' : 'Add Employee'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DISBURSE SALARY */}
      {disburseModalOpen && selectedStaffForDisburse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-[#F5EFE6] border border-[#DDD3C3] w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-[#DDD3C3] bg-[#EDE4D8]/60">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1A2E35]">Disburse Salary</h3>
                  <p className="text-xs text-[#5A6B72]">
                    {selectedStaffForDisburse.staff.name} ({MONTHS[currentMonth - 1]} {currentYear})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDisburseModalOpen(false)}
                className="text-[#5A6B72] hover:text-[#1A2E35] p-1 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDisburseSalary} className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-3 text-xs bg-red-100 border border-red-200 text-red-700 rounded-lg">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-3 text-xs bg-green-100 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {successMsg}
                </div>
              )}

              <div className="p-3 bg-[#EDE4D8] rounded-xl border border-[#DDD3C3] space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#5A6B72]">Basic Salary:</span>
                  <span className="font-semibold text-[#1A2E35]">
                    ₹{(selectedStaffForDisburse.basicSalary / 100).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-bold text-[#1A5F63] pt-1 border-t border-[#DDD3C3]">
                  <span>Calculated Net Payable:</span>
                  <span>
                    ₹{((selectedStaffForDisburse.basicSalary +
                      Math.round((parseFloat(disburseFormData.allowancesRupees) || 0) * 100) -
                      Math.round((parseFloat(disburseFormData.deductionsRupees) || 0) * 100) -
                      Math.round((parseFloat(disburseFormData.advancesRupees) || 0) * 100)) / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#1A2E35] mb-1">
                    Allowances (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={disburseFormData.allowancesRupees}
                    onChange={(e) => setDisburseFormData({ ...disburseFormData, allowancesRupees: e.target.value })}
                    className="w-full h-9 px-2 rounded-lg border border-[#DDD3C3] bg-white text-xs text-[#1A2E35]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#1A2E35] mb-1">
                    Deductions (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={disburseFormData.deductionsRupees}
                    onChange={(e) => setDisburseFormData({ ...disburseFormData, deductionsRupees: e.target.value })}
                    className="w-full h-9 px-2 rounded-lg border border-[#DDD3C3] bg-white text-xs text-[#1A2E35]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#1A2E35] mb-1">
                    Advances (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={disburseFormData.advancesRupees}
                    onChange={(e) => setDisburseFormData({ ...disburseFormData, advancesRupees: e.target.value })}
                    className="w-full h-9 px-2 rounded-lg border border-[#DDD3C3] bg-white text-xs text-[#1A2E35]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A2E35] mb-1">
                  Payment Mode *
                </label>
                <select
                  value={disburseFormData.paymentMethod}
                  onChange={(e) => setDisburseFormData({ ...disburseFormData, paymentMethod: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-[#DDD3C3] bg-white text-sm text-[#1A2E35] focus:outline-none focus:ring-2 focus:ring-[#1A5F63]"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI / GPay</option>
                  <option value="BANK_TRANSFER">Bank NEFT / RTGS</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A2E35] mb-1">
                  Disbursement Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid in cash against signed voucher"
                  value={disburseFormData.notes}
                  onChange={(e) => setDisburseFormData({ ...disburseFormData, notes: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-[#DDD3C3] bg-white text-sm text-[#1A2E35]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#DDD3C3]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDisburseModalOpen(false)}
                  className="border-[#DDD3C3] text-[#1A2E35]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white"
                >
                  {isSubmitting ? 'Disbursing...' : 'Confirm & Post Expense'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
