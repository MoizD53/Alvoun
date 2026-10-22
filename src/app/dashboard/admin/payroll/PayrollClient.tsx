'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  IndianRupee,
  CreditCard,
  Briefcase,
  Calendar,
  Save,
  CheckCircle,
  X,
  Search,
  Filter,
  UserCheck,
  AlertCircle,
  RotateCcw,
  Eye,
  Edit2,
  Trash2,
  Download,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  UserX,
  FileText,
  Banknote
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  createStaffMember, 
  updateStaffMember,
  toggleStaffStatus,
  deleteStaffMember,
  saveDailyAttendance, 
  recordSalaryPayment,
  reverseSalaryPayment,
  getStaffProfileDetails
} from '@/lib/actions/admin/payroll';

interface StaffItem {
  id: string;
  employeeCode: string;
  name: string;
  role: string;
  designation?: string | null;
  phone?: string | null;
  monthlySalary: number; // in paise
  isActive: boolean;
  joinDate?: Date | string;
  salesman?: {
    id: string;
    employeeCode: string;
    name: string;
  } | null;
}

interface AttendanceStaffItem {
  id: string;
  employeeCode: string;
  name: string;
  designation?: string | null;
  role: string;
  monthlySalaryPaise: number;
  dailyRatePaise: number;
  salesman?: {
    id: string;
    employeeCode: string;
    name: string;
  } | null;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'PENDING';
  notes: string;
  attendanceId?: string | null;
}

interface PaymentTransaction {
  id: string;
  amount: number;
  paymentDate: Date | string;
  paymentMethod: string;
  referenceNo?: string | null;
  notes?: string | null;
  recordedBy?: string | null;
  isReversed: boolean;
  reversalReason?: string | null;
}

interface LedgerItem {
  id: string;
  staffId: string;
  staff: StaffItem;
  month: number;
  year: number;
  basicSalary: number; // in paise
  dailyRate: number; // in paise
  fullDayAbsences: number;
  halfDayAbsences: number;
  fullDayDeductions: number; // in paise
  halfDayDeductions: number; // in paise
  totalDeductions: number; // in paise
  netPayable: number; // in paise
  paidAmount: number; // in paise
  remainingBalance: number; // in paise
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  payments?: PaymentTransaction[];
  paymentDate?: Date | string | null;
  paymentMethod?: string | null;
  notes?: string | null;
}

interface UnlinkedSalesman {
  id: string;
  employeeCode: string;
  name: string;
  phone?: string | null;
}

interface PayrollClientProps {
  staffList: StaffItem[];
  attendanceData: {
    targetDateStr: string;
    todayStr: string;
    isFutureDate: boolean;
    staff: AttendanceStaffItem[];
    totalStaff: number;
    presentCount: number;
    halfDayCount: number;
    absentCount: number;
    pendingCount: number;
  };
  ledgerData: LedgerItem[];
  unlinkedSalesmen?: UnlinkedSalesman[];
  currentDate: string;
  currentMonth: number;
  currentYear: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function PayrollClient({
  staffList,
  attendanceData,
  ledgerData,
  unlinkedSalesmen = [],
  currentDate,
  currentMonth,
  currentYear,
}: PayrollClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<'ATTENDANCE' | 'PAYROLL' | 'STAFF'>('ATTENDANCE');

  // Attendance Form State
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
  const [attendanceFeedback, setAttendanceFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Staff Search & Filter State
  const [staffSearch, setStaffSearch] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState('ALL');
  const [staffStatusFilter, setStaffStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [staffSalesmanFilter, setStaffSalesmanFilter] = useState<'ALL' | 'SALESMAN' | 'INTERNAL'>('ALL');

  // Add Staff Modal
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [addStaffForm, setAddStaffForm] = useState({
    name: '',
    designation: '',
    role: 'PRODUCTION_STAFF',
    phone: '',
    monthlySalaryRupees: '',
    salesmanId: '',
  });

  // Edit Staff Modal
  const [editStaffOpen, setEditStaffOpen] = useState(false);
  const [selectedStaffForEdit, setSelectedStaffForEdit] = useState<StaffItem | null>(null);
  const [editStaffForm, setEditStaffForm] = useState({
    name: '',
    designation: '',
    role: 'PRODUCTION_STAFF',
    phone: '',
    monthlySalaryRupees: '',
    isActive: true,
  });

  // Pay Salary Modal
  const [paySalaryOpen, setPaySalaryOpen] = useState(false);
  const [selectedLedgerItem, setSelectedLedgerItem] = useState<LedgerItem | null>(null);
  const [paySalaryForm, setPaySalaryForm] = useState({
    amountRupees: '',
    paymentMethod: 'CASH' as 'CASH' | 'BANK_TRANSFER' | 'UPI',
    paymentDateStr: attendanceData.todayStr,
    referenceNo: '',
    notes: '',
  });

  // Employee Profile Detail Modal
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [employeeProfile, setEmployeeProfile] = useState<any>(null);

  // Action Loading & Messages
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Reversal confirmation prompt
  const [reversalModalOpen, setReversalModalOpen] = useState(false);
  const [selectedPaymentForReversal, setSelectedPaymentForReversal] = useState<PaymentTransaction | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  // Distinct designations for filtering
  const designations = useMemo(() => {
    const set = new Set<string>();
    staffList.forEach((s) => {
      if (s.designation) set.add(s.designation);
      else if (s.role) set.add(s.role);
    });
    return Array.from(set).sort();
  }, [staffList]);

  // Filtered staff directory
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const matchSearch = staffSearch === '' || 
        s.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
        s.employeeCode.toLowerCase().includes(staffSearch.toLowerCase()) ||
        (s.designation && s.designation.toLowerCase().includes(staffSearch.toLowerCase())) ||
        (s.phone && s.phone.includes(staffSearch));

      const matchRole = staffRoleFilter === 'ALL' || s.designation === staffRoleFilter || s.role === staffRoleFilter;
      const matchStatus = staffStatusFilter === 'ALL' || (staffStatusFilter === 'ACTIVE' ? s.isActive : !s.isActive);
      const matchSalesman = staffSalesmanFilter === 'ALL' 
        ? true 
        : staffSalesmanFilter === 'SALESMAN' 
          ? Boolean(s.salesman) 
          : !s.salesman;

      return matchSearch && matchRole && matchStatus && matchSalesman;
    });
  }, [staffList, staffSearch, staffRoleFilter, staffStatusFilter, staffSalesmanFilter]);

  // Helper to open salary payment modal for any staff member
  const openPayForStaff = (staff: StaffItem) => {
    const item = ledgerData.find((l) => l.staffId === staff.id) || {
      id: '',
      staffId: staff.id,
      month: currentMonth,
      year: currentYear,
      staff: {
        id: staff.id,
        name: staff.name,
        employeeCode: staff.employeeCode,
        designation: staff.designation,
        role: staff.role,
        monthlySalary: staff.monthlySalary,
      },
      basicSalary: staff.monthlySalary,
      workingDays: 30,
      presentDays: 30,
      halfDays: 0,
      absentDays: 0,
      payableDays: 30,
      grossEarnings: staff.monthlySalary,
      deductions: 0,
      netPayable: staff.monthlySalary,
      paidAmount: 0,
      remainingBalance: staff.monthlySalary,
      status: 'UNPAID',
    };
    openPaySalaryModal(item as any);
  };

  // Total active staff count
  const activeStaffCount = staffList.filter(s => s.isActive).length;

  // Monthly stats
  const totalBaseCommitmentRupees = ledgerData.reduce((acc, l) => acc + l.basicSalary, 0) / 100;
  const totalNetPayableRupees = ledgerData.reduce((acc, l) => acc + l.netPayable, 0) / 100;
  const totalPaidRupees = ledgerData.reduce((acc, l) => acc + l.paidAmount, 0) / 100;
  const totalRemainingRupees = ledgerData.reduce((acc, l) => acc + l.remainingBalance, 0) / 100;

  // Handle Attendance Save
  const handleSaveAttendance = async () => {
    setIsSavingAttendance(true);
    setAttendanceFeedback(null);

    const payload = Object.entries(attendanceRecords).map(([staffId, data]) => ({
      staffId,
      status: data.status,
      notes: data.notes,
    }));

    const res = await saveDailyAttendance(payload, currentDate);
    setIsSavingAttendance(false);

    if (res?.error) {
      setAttendanceFeedback({ type: 'error', message: res.error });
    } else {
      setAttendanceFeedback({ type: 'success', message: `Attendance for ${currentDate} saved successfully!` });
      router.refresh();
      setTimeout(() => setAttendanceFeedback(null), 4000);
    }
  };

  // Mark all present
  const handleMarkAllPresent = () => {
    const updated = { ...attendanceRecords };
    for (const s of attendanceData.staff) {
      updated[s.id] = {
        status: 'PRESENT',
        notes: updated[s.id]?.notes || '',
      };
    }
    setAttendanceRecords(updated);
  };

  // Handle Add Staff Submit
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    setActionLoading(true);

    const salaryRupees = parseFloat(addStaffForm.monthlySalaryRupees);
    if (isNaN(salaryRupees) || salaryRupees <= 0) {
      setActionError('Please enter a valid monthly salary.');
      setActionLoading(false);
      return;
    }

    const res = await createStaffMember({
      name: addStaffForm.name,
      designation: addStaffForm.designation || (addStaffForm.salesmanId ? 'Salesman' : 'Staff'),
      role: addStaffForm.role as any,
      phone: addStaffForm.phone,
      monthlySalaryRupees: salaryRupees,
      salesmanId: addStaffForm.salesmanId || undefined,
    });

    setActionLoading(false);
    if (res?.error) {
      setActionError(res.error);
    } else {
      setAddStaffOpen(false);
      setAddStaffForm({
        name: '',
        designation: '',
        role: 'PRODUCTION_STAFF',
        phone: '',
        monthlySalaryRupees: '',
        salesmanId: '',
      });
      router.refresh();
    }
  };

  // Open Edit Modal
  const openEditModal = (staff: StaffItem) => {
    setSelectedStaffForEdit(staff);
    setEditStaffForm({
      name: staff.name,
      designation: staff.designation || staff.role,
      role: staff.role,
      phone: staff.phone || '',
      monthlySalaryRupees: (staff.monthlySalary / 100).toString(),
      isActive: staff.isActive,
    });
    setActionError('');
    setEditStaffOpen(true);
  };

  // Handle Edit Staff Submit
  const handleEditStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffForEdit) return;
    setActionError('');
    setActionLoading(true);

    const salaryRupees = parseFloat(editStaffForm.monthlySalaryRupees);
    if (isNaN(salaryRupees) || salaryRupees <= 0) {
      setActionError('Please enter a valid monthly salary.');
      setActionLoading(false);
      return;
    }

    const res = await updateStaffMember(selectedStaffForEdit.id, {
      name: editStaffForm.name,
      designation: editStaffForm.designation,
      role: editStaffForm.role,
      phone: editStaffForm.phone,
      monthlySalaryRupees: salaryRupees,
      isActive: editStaffForm.isActive,
    });

    setActionLoading(false);
    if (res?.error) {
      setActionError(res.error);
    } else {
      setEditStaffOpen(false);
      setSelectedStaffForEdit(null);
      router.refresh();
    }
  };

  // Handle Staff Toggle Active
  const handleToggleStaff = async (staff: StaffItem) => {
    if (!confirm(`Are you sure you want to ${staff.isActive ? 'deactivate' : 'activate'} ${staff.name}?`)) {
      return;
    }
    const res = await toggleStaffStatus(staff.id, !staff.isActive);
    if (res?.error) {
      alert(res.error);
    } else {
      router.refresh();
    }
  };

  // Handle Delete Staff
  const handleDeleteStaff = async (staff: StaffItem) => {
    if (!confirm(`Are you sure you want to delete ${staff.name} (${staff.employeeCode})? This action cannot be undone.`)) {
      return;
    }
    const res = await deleteStaffMember(staff.id);
    if (res?.error) {
      alert(res.error);
    } else {
      router.refresh();
    }
  };

  // Open Pay Salary Modal
  const openPaySalaryModal = (item: LedgerItem) => {
    setSelectedLedgerItem(item);
    setPaySalaryForm({
      amountRupees: (item.remainingBalance / 100).toFixed(2),
      paymentMethod: 'CASH',
      paymentDateStr: attendanceData.todayStr,
      referenceNo: '',
      notes: '',
    });
    setActionError('');
    setPaySalaryOpen(true);
  };

  // Handle Pay Salary Submit
  const handlePaySalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLedgerItem) return;
    setActionError('');
    setActionLoading(true);

    const amount = parseFloat(paySalaryForm.amountRupees);
    if (isNaN(amount) || amount <= 0) {
      setActionError('Payment amount must be greater than zero.');
      setActionLoading(false);
      return;
    }

    const res = await recordSalaryPayment({
      staffId: selectedLedgerItem.staffId,
      month: selectedLedgerItem.month,
      year: selectedLedgerItem.year,
      amountRupees: amount,
      paymentMethod: paySalaryForm.paymentMethod,
      paymentDateStr: paySalaryForm.paymentDateStr,
      referenceNo: paySalaryForm.referenceNo,
      notes: paySalaryForm.notes,
    });

    setActionLoading(false);
    if (res?.error) {
      setActionError(res.error);
    } else {
      setPaySalaryOpen(false);
      setSelectedLedgerItem(null);
      router.refresh();
    }
  };

  // Open Employee Profile Modal
  const openProfileModal = async (staffId: string) => {
    setLoadingProfile(true);
    setProfileModalOpen(true);
    const details = await getStaffProfileDetails(staffId, currentYear);
    setEmployeeProfile(details);
    setLoadingProfile(false);
  };

  // Handle Payment Reversal Submit
  const handleReversePayment = async () => {
    if (!selectedPaymentForReversal) return;
    if (!reversalReason.trim()) {
      alert('Please enter a reason for payment reversal.');
      return;
    }
    setActionLoading(true);
    const res = await reverseSalaryPayment(selectedPaymentForReversal.id, reversalReason);
    setActionLoading(false);

    if (res?.error) {
      alert(res.error);
    } else {
      setReversalModalOpen(false);
      setSelectedPaymentForReversal(null);
      setReversalReason('');
      if (employeeProfile) {
        // Refresh profile details
        const details = await getStaffProfileDetails(employeeProfile.staff.id, currentYear);
        setEmployeeProfile(details);
      }
      router.refresh();
    }
  };

  // Export Ledger CSV
  const handleExportCSV = () => {
    const headers = ['Employee Code', 'Name', 'Designation', 'Base Salary (₹)', 'Daily Rate (₹)', 'Full Absences', 'Half Absences', 'Deductions (₹)', 'Net Payable (₹)', 'Paid (₹)', 'Remaining Balance (₹)', 'Status'];
    const rows = ledgerData.map(l => [
      l.staff.employeeCode,
      `"${l.staff.name}"`,
      `"${l.staff.designation || l.staff.role}"`,
      (l.basicSalary / 100).toFixed(2),
      (l.dailyRate / 100).toFixed(2),
      l.fullDayAbsences,
      l.halfDayAbsences,
      (l.totalDeductions / 100).toFixed(2),
      (l.netPayable / 100).toFixed(2),
      (l.paidAmount / 100).toFixed(2),
      (l.remainingBalance / 100).toFixed(2),
      l.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Alvoun_Payroll_${MONTHS[currentMonth - 1]}_${currentYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Staff */}
        <div className="p-5 rounded-2xl bg-surface-raised shadow-raised border border-border/40 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Staff</span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-primary">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">{activeStaffCount}</span>
            <span className="text-xs font-medium text-muted-foreground">Total: {staffList.length}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Live staff records in database</p>
        </div>

        {/* Card 2: Today's Attendance */}
        <div className="p-5 rounded-2xl bg-surface-raised shadow-raised border border-border/40 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today's Attendance</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold tracking-tight text-emerald-600">{attendanceData.presentCount}</span>
            <span className="text-xs font-semibold text-emerald-600">Present</span>
            <span className="text-sm font-bold text-amber-600">{attendanceData.halfDayCount}H</span>
            <span className="text-sm font-bold text-red-600">{attendanceData.absentCount}A</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {attendanceData.pendingCount > 0 ? `${attendanceData.pendingCount} staff unmarked for ${currentDate}` : `All active staff marked`}
          </p>
        </div>

        {/* Card 3: Monthly Commitment */}
        <div className="p-5 rounded-2xl bg-surface-raised shadow-raised border border-border/40 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Base Salary Commitment</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-xs font-bold text-muted-foreground">₹</span>
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {totalBaseCommitmentRupees.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-muted-foreground">/mo</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">{MONTHS[currentMonth - 1]} {currentYear} Gross</p>
        </div>

        {/* Card 4: Disbursed vs Pending */}
        <div className="p-5 rounded-2xl bg-surface-raised shadow-raised border border-border/40 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Disbursed / Pending</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-600">₹</span>
              <span className="text-xl font-bold text-emerald-600">
                {totalPaidRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">/</span>
            <div>
              <span className="text-xs font-bold text-destructive">₹</span>
              <span className="text-xl font-bold text-destructive">
                {totalRemainingRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
            <span>Net: ₹{totalNetPayableRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            <span className="font-semibold text-primary">{ledgerData.filter(l => l.status === 'PAID').length} Paid</span>
          </div>
        </div>
      </div>

      {/* Main Tab Bar & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        {/* Neumorphic Tab Switcher */}
        <div className="inline-flex bg-surface-inset shadow-inset p-1 rounded-2xl border border-border/40 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('ATTENDANCE')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'ATTENDANCE'
                ? 'bg-surface-raised shadow-raised text-primary border border-border/40'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="w-4 h-4" />
            Daily Punch Board
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PAYROLL')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'PAYROLL'
                ? 'bg-surface-raised shadow-raised text-primary border border-border/40'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Monthly Payroll Ledger
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('STAFF')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'STAFF'
                ? 'bg-surface-raised shadow-raised text-primary border border-border/40'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4" />
            Staff Directory ({staffList.length})
          </button>
        </div>

        {/* Quick Action Button */}
        <div className="flex items-center gap-2">
          {activeTab === 'ATTENDANCE' && !attendanceData.isFutureDate && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllPresent}
              className="text-xs font-semibold shadow-raised hover:shadow-raised-sm press-active"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Mark All Present
            </Button>
          )}

          {activeTab === 'PAYROLL' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="text-xs font-semibold shadow-raised hover:shadow-raised-sm press-active"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-primary" />
              Export CSV
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setActionError('');
              setAddStaffOpen(true);
            }}
            className="text-xs font-semibold shadow-raised hover:shadow-raised-sm press-active"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Staff Member
          </Button>
        </div>
      </div>

      {/* Feedback Alert Banner */}
      {attendanceFeedback && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold animate-fade-in ${
          attendanceFeedback.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300' 
            : 'bg-destructive/10 border-destructive/20 text-destructive'
        }`}>
          <span>{attendanceFeedback.message}</span>
          <button onClick={() => setAttendanceFeedback(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: DAILY ATTENDANCE PUNCH BOARD                       */}
      {/* ========================================================= */}
      {activeTab === 'ATTENDANCE' && (
        <div className="space-y-4">
          {/* Date Picker Bar */}
          <div className="p-4 rounded-2xl bg-surface-raised shadow-raised border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Attendance Date</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <input
                    type="date"
                    value={currentDate}
                    max={attendanceData.todayStr}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      if (newDate) {
                        router.push(`/dashboard/admin/payroll?date=${newDate}&month=${currentMonth}&year=${currentYear}`);
                      }
                    }}
                    className="bg-surface-inset shadow-inset border border-border/40 rounded-xl px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                  />
                  {currentDate === attendanceData.todayStr && (
                    <Badge variant="success" size="sm">Today (Asia/Kolkata)</Badge>
                  )}
                </div>
              </div>
            </div>

            {attendanceData.isFutureDate ? (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive bg-destructive/10 px-3 py-1.5 rounded-xl border border-destructive/20">
                <AlertCircle className="w-4 h-4" />
                Future date: Marking disabled
              </div>
            ) : (
              <Button
                variant="primary"
                onClick={handleSaveAttendance}
                isLoading={isSavingAttendance}
                className="shadow-raised hover:shadow-raised-sm press-active text-xs font-bold"
              >
                <Save className="w-4 h-4 mr-1.5" />
                Save Daily Attendance
              </Button>
            )}
          </div>

          {/* Punch Board Table */}
          <div className="bg-surface-raised shadow-raised rounded-2xl border border-border/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/40 bg-surface-inset/50 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Designation</th>
                    <th className="py-3.5 px-4">Salary Basis</th>
                    <th className="py-3.5 px-4 text-center">Attendance Status</th>
                    <th className="py-3.5 px-4">Notes / Remarks</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 text-xs">
                  {attendanceData.staff.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No active employees found. Please add staff members from the directory.
                      </td>
                    </tr>
                  ) : (
                    attendanceData.staff.map((staff) => {
                      const currentStatus = attendanceRecords[staff.id]?.status || 'PRESENT';
                      const currentNotes = attendanceRecords[staff.id]?.notes || '';
                      const dailyRateRupees = (staff.dailyRatePaise / 100).toFixed(0);

                      return (
                        <tr key={staff.id} className="hover:bg-surface-inset/30 transition-colors">
                          {/* Employee Info */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-foreground">{staff.name}</div>
                            <div className="flex items-center gap-1.5 flex-wrap font-mono text-[11px] text-muted-foreground mt-0.5">
                              <span>{staff.employeeCode}</span>
                              {staff.salesman && (
                                <Badge variant="neutral" styleType="outline" size="sm" className="text-[10px] py-0 px-1.5 border-teal-500/40 text-primary">
                                  Salesman: {staff.salesman.employeeCode}
                                </Badge>
                              )}
                            </div>
                          </td>

                          {/* Designation */}
                          <td className="py-3.5 px-4">
                            <Badge variant="neutral" styleType="outline" size="sm" className="font-semibold">
                              {staff.designation || staff.role}
                            </Badge>
                          </td>

                          {/* Salary Basis */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-foreground">
                              ₹{(staff.monthlySalaryPaise / 100).toLocaleString('en-IN')}
                              <span className="text-muted-foreground text-[10px]">/mo</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              ₹{dailyRateRupees}/day (30-day base)
                            </div>
                          </td>

                          {/* 3D Punch Buttons */}
                          <td className="py-3.5 px-4">
                            <div className="inline-flex bg-surface-inset shadow-inset p-1 rounded-xl border border-border/40 gap-1 mx-auto">
                              {/* 1st: PRESENT */}
                              <button
                                type="button"
                                disabled={attendanceData.isFutureDate}
                                onClick={() => {
                                  setAttendanceRecords(prev => ({
                                    ...prev,
                                    [staff.id]: { status: 'PRESENT', notes: prev[staff.id]?.notes || '' }
                                  }));
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                  currentStatus === 'PRESENT'
                                    ? 'bg-emerald-600 text-white shadow-raised'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Present
                              </button>

                              {/* 2nd: ABSENT */}
                              <button
                                type="button"
                                disabled={attendanceData.isFutureDate}
                                onClick={() => {
                                  setAttendanceRecords(prev => ({
                                    ...prev,
                                    [staff.id]: { status: 'ABSENT', notes: prev[staff.id]?.notes || '' }
                                  }));
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                  currentStatus === 'ABSENT'
                                    ? 'bg-red-600 text-white shadow-raised'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Absent
                              </button>

                              {/* 3rd: HALF DAY */}
                              <button
                                type="button"
                                disabled={attendanceData.isFutureDate}
                                onClick={() => {
                                  setAttendanceRecords(prev => ({
                                    ...prev,
                                    [staff.id]: { status: 'HALF_DAY', notes: prev[staff.id]?.notes || '' }
                                  }));
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                  currentStatus === 'HALF_DAY'
                                    ? 'bg-amber-500 text-white shadow-raised'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                <Clock className="w-3.5 h-3.5" />
                                Half Day
                              </button>
                            </div>
                          </td>

                          {/* Notes */}
                          <td className="py-3.5 px-4">
                            <input
                              type="text"
                              value={currentNotes}
                              disabled={attendanceData.isFutureDate}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAttendanceRecords(prev => ({
                                  ...prev,
                                  [staff.id]: { status: prev[staff.id]?.status || 'PRESENT', notes: val }
                                }));
                              }}
                              placeholder="Optional remarks"
                              className="w-full bg-surface-inset shadow-inset border border-border/40 rounded-lg px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                            />
                          </td>

                          {/* Per-Person Actions: Pay, View Details, Edit */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                  const fullStaff = staffList.find(s => s.id === staff.id);
                                  const item = ledgerData.find(l => l.staffId === staff.id) || {
                                    id: `tmp-${staff.id}`,
                                    staffId: staff.id,
                                    staff: fullStaff || {
                                      id: staff.id,
                                      employeeCode: staff.employeeCode,
                                      name: staff.name,
                                      role: staff.role,
                                      designation: staff.designation,
                                      monthlySalary: staff.monthlySalaryPaise,
                                      isActive: true,
                                    },
                                    month: currentMonth,
                                    year: currentYear,
                                    basicSalary: staff.monthlySalaryPaise,
                                    dailyRate: staff.dailyRatePaise,
                                    fullDayAbsences: 0,
                                    halfDayAbsences: 0,
                                    fullDayDeductions: 0,
                                    halfDayDeductions: 0,
                                    totalDeductions: 0,
                                    netPayable: staff.monthlySalaryPaise,
                                    paidAmount: 0,
                                    remainingBalance: staff.monthlySalaryPaise,
                                    status: 'UNPAID',
                                  };
                                  openPaySalaryModal(item as any);
                                }}
                                className="shadow-raised hover:shadow-raised-sm press-active text-xs font-bold"
                                title={`Pay salary to ${staff.name}`}
                              >
                                <CreditCard className="w-3.5 h-3.5 mr-1" />
                                Pay
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openProfileModal(staff.id)}
                                className="text-xs font-semibold"
                                title="View full employee profile, payroll & payment history"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                View Details
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const fullStaff = staffList.find(s => s.id === staff.id);
                                  if (fullStaff) {
                                    openEditModal(fullStaff);
                                  } else {
                                    openEditModal({
                                      id: staff.id,
                                      employeeCode: staff.employeeCode,
                                      name: staff.name,
                                      role: staff.role,
                                      designation: staff.designation,
                                      monthlySalary: staff.monthlySalaryPaise,
                                      isActive: true,
                                      salesman: staff.salesman,
                                    });
                                  }
                                }}
                                className="text-xs font-semibold"
                                title="Edit employee designation, salary or contact"
                              >
                                <Edit2 className="w-3.5 h-3.5 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Save Bar */}
            {!attendanceData.isFutureDate && attendanceData.staff.length > 0 && (
              <div className="p-4 border-t border-border/40 bg-surface-inset/30 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Saved attendance automatically synchronizes daily deductions to the monthly payroll ledger.
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveAttendance}
                  isLoading={isSavingAttendance}
                  className="shadow-raised hover:shadow-raised-sm press-active text-xs font-bold"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Save Daily Attendance
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: MONTHLY PAYROLL LEDGER                             */}
      {/* ========================================================= */}
      {activeTab === 'PAYROLL' && (
        <div className="space-y-4">
          {/* Month / Year Filter Bar */}
          <div className="p-4 rounded-2xl bg-surface-raised shadow-raised border border-border/40 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary" />
              <div className="flex items-center gap-2">
                <select
                  value={currentMonth}
                  onChange={(e) => {
                    const m = e.target.value;
                    router.push(`/dashboard/admin/payroll?date=${currentDate}&month=${m}&year=${currentYear}`);
                  }}
                  className="bg-surface-inset shadow-inset border border-border/40 rounded-xl px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
                >
                  {MONTHS.map((name, idx) => (
                    <option key={name} value={idx + 1}>{name}</option>
                  ))}
                </select>

                <select
                  value={currentYear}
                  onChange={(e) => {
                    const y = e.target.value;
                    router.push(`/dashboard/admin/payroll?date=${currentDate}&month=${currentMonth}&year=${y}`);
                  }}
                  className="bg-surface-inset shadow-inset border border-border/40 rounded-xl px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
                >
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
              </div>
            </div>

            {/* Quick Summary Pill */}
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div>Gross: <span className="text-foreground">₹{totalBaseCommitmentRupees.toLocaleString('en-IN')}</span></div>
              <div>Deductions: <span className="text-destructive">-₹{(ledgerData.reduce((acc, l) => acc + l.totalDeductions, 0) / 100).toLocaleString('en-IN')}</span></div>
              <div>Net: <span className="text-primary font-bold">₹{totalNetPayableRupees.toLocaleString('en-IN')}</span></div>
              <div>Disbursed: <span className="text-emerald-600 font-bold">₹{totalPaidRupees.toLocaleString('en-IN')}</span></div>
              <div>Pending: <span className="text-destructive font-bold">₹{totalRemainingRupees.toLocaleString('en-IN')}</span></div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-surface-raised shadow-raised rounded-2xl border border-border/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/40 bg-surface-inset/50 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4 text-right">Base Salary</th>
                    <th className="py-3.5 px-4 text-center">Absences</th>
                    <th className="py-3.5 px-4 text-right">Deductions</th>
                    <th className="py-3.5 px-4 text-right">Net Payable</th>
                    <th className="py-3.5 px-4 text-right">Paid</th>
                    <th className="py-3.5 px-4 text-right">Remaining</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 text-xs">
                  {ledgerData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-muted-foreground">
                        No payroll records found for this period.
                      </td>
                    </tr>
                  ) : (
                    ledgerData.map((item) => {
                      const baseRupees = item.basicSalary / 100;
                      const deductionsRupees = item.totalDeductions / 100;
                      const netPayableRupees = item.netPayable / 100;
                      const paidRupees = item.paidAmount / 100;
                      const remainingRupees = item.remainingBalance / 100;

                      return (
                        <tr key={item.id} className="hover:bg-surface-inset/30 transition-colors">
                          {/* Employee */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-foreground">{item.staff.name}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {item.staff.employeeCode} • {item.staff.designation || item.staff.role}
                            </div>
                          </td>

                          {/* Base Salary */}
                          <td className="py-3.5 px-4 text-right font-semibold text-foreground">
                            ₹{baseRupees.toLocaleString('en-IN')}
                          </td>

                          {/* Absences */}
                          <td className="py-3.5 px-4 text-center">
                            {item.fullDayAbsences === 0 && item.halfDayAbsences === 0 ? (
                              <span className="text-emerald-600 font-semibold text-[11px]">0 (Full Attend)</span>
                            ) : (
                              <div className="text-[11px] font-semibold">
                                {item.fullDayAbsences > 0 && <span className="text-destructive">{item.fullDayAbsences}F </span>}
                                {item.halfDayAbsences > 0 && <span className="text-amber-600">{item.halfDayAbsences}H</span>}
                              </div>
                            )}
                          </td>

                          {/* Deductions */}
                          <td className="py-3.5 px-4 text-right">
                            {deductionsRupees > 0 ? (
                              <span className="font-semibold text-destructive">-₹{deductionsRupees.toLocaleString('en-IN')}</span>
                            ) : (
                              <span className="text-muted-foreground">₹0</span>
                            )}
                          </td>

                          {/* Net Payable */}
                          <td className="py-3.5 px-4 text-right font-bold text-primary">
                            ₹{netPayableRupees.toLocaleString('en-IN')}
                          </td>

                          {/* Paid */}
                          <td className="py-3.5 px-4 text-right font-semibold text-emerald-600">
                            ₹{paidRupees.toLocaleString('en-IN')}
                          </td>

                          {/* Remaining */}
                          <td className="py-3.5 px-4 text-right font-bold text-foreground">
                            {remainingRupees > 0 ? (
                              <span className="text-destructive">₹{remainingRupees.toLocaleString('en-IN')}</span>
                            ) : (
                              <span className="text-muted-foreground">₹0</span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4 text-center">
                            {item.status === 'PAID' && (
                              <Badge variant="success" size="sm">PAID</Badge>
                            )}
                            {item.status === 'PARTIALLY_PAID' && (
                              <Badge variant="info" size="sm">PARTIAL</Badge>
                            )}
                            {item.status === 'UNPAID' && (
                              <Badge variant="danger" size="sm">UNPAID</Badge>
                            )}
                          </td>

                          {/* Action Button */}
                          <td className="py-3.5 px-4 text-right">
                            {remainingRupees > 0 ? (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => openPaySalaryModal(item)}
                                className="shadow-raised hover:shadow-raised-sm press-active text-xs font-bold"
                              >
                                <CreditCard className="w-3.5 h-3.5 mr-1" />
                                Pay
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openProfileModal(item.staffId)}
                                className="text-xs font-semibold"
                              >
                                <FileText className="w-3.5 h-3.5 mr-1" />
                                History
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: STAFF DIRECTORY                                    */}
      {/* ========================================================= */}
      {activeTab === 'STAFF' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-surface-raised shadow-raised border border-border/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  placeholder="Search name, code, designation, phone..."
                  className="w-full bg-surface-inset shadow-inset border border-border/40 rounded-xl pl-9 pr-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Status Filter */}
              <select
                value={staffStatusFilter}
                onChange={(e) => setStaffStatusFilter(e.target.value as any)}
                className="bg-surface-inset shadow-inset border border-border/40 rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
              >
                <option value="ACTIVE">Active Staff</option>
                <option value="INACTIVE">Deactivated Staff</option>
                <option value="ALL">All Status</option>
              </select>

              {/* Designation Filter */}
              <select
                value={staffRoleFilter}
                onChange={(e) => setStaffRoleFilter(e.target.value)}
                className="bg-surface-inset shadow-inset border border-border/40 rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Roles / Designations</option>
                {designations.map((des) => (
                  <option key={des} value={des}>{des}</option>
                ))}
              </select>

              {/* Salesman-Linked Filter */}
              <select
                value={staffSalesmanFilter}
                onChange={(e) => setStaffSalesmanFilter(e.target.value as any)}
                className="bg-surface-inset shadow-inset border border-border/40 rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Personnel</option>
                <option value="SALESMAN">Linked Salesmen Only</option>
                <option value="INTERNAL">Internal Staff Only</option>
              </select>
            </div>

            <div className="text-xs font-semibold text-muted-foreground">
              Showing {filteredStaff.length} of {staffList.length} employees
            </div>
          </div>

          {/* Employee Directory Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStaff.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground bg-surface-raised rounded-2xl border border-border/40">
                No matching staff records found.
              </div>
            ) : (
              filteredStaff.map((staff) => {
                const dailyRate = Math.floor(staff.monthlySalary / 30 / 100);
                const monthlyRupees = (staff.monthlySalary / 100).toLocaleString('en-IN');

                return (
                  <div
                    key={staff.id}
                    className="p-5 rounded-2xl bg-surface-raised shadow-raised border border-border/40 space-y-4 hover:border-primary/30 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row: Code & Status */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-muted-foreground">{staff.employeeCode}</span>
                        <Badge variant={staff.isActive ? 'success' : 'danger'} size="sm">
                          {staff.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                        </Badge>
                      </div>

                      {/* Name & Designation */}
                      <div className="mt-2">
                        <h3 className="text-base font-bold text-foreground">{staff.name}</h3>
                        <div className="text-xs font-semibold text-primary mt-0.5">
                          {staff.designation || staff.role}
                        </div>
                      </div>

                      {/* Salary & Daily Rate */}
                      <div className="mt-4 p-3 bg-surface-inset shadow-inset rounded-xl border border-border/40 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-muted-foreground">Monthly Salary</div>
                          <div className="text-sm font-extrabold text-foreground">₹{monthlyRupees}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] uppercase font-bold text-muted-foreground">Daily Rate</div>
                          <div className="text-sm font-extrabold text-teal-600 dark:text-teal-400">₹{dailyRate}/day</div>
                        </div>
                      </div>

                      {/* Phone & Salesman linkage */}
                      <div className="mt-3 text-xs text-muted-foreground space-y-1">
                        {staff.phone && (
                          <div className="flex items-center gap-1.5">
                            <span>Phone:</span>
                            <span className="font-medium text-foreground">{staff.phone}</span>
                          </div>
                        )}
                        {staff.salesman && (
                          <div className="flex items-center gap-1.5 text-primary text-[11px] font-semibold">
                            <span>Linked Field Salesman:</span>
                            <span>{staff.salesman.employeeCode} ({staff.salesman.name})</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-1.5 flex-wrap">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openPayForStaff(staff)}
                        className="text-xs font-bold shadow-raised hover:shadow-raised-sm press-active px-3"
                      >
                        <Banknote className="w-3.5 h-3.5 mr-1" />
                        Pay
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openProfileModal(staff.id)}
                        className="text-xs font-semibold px-2.5"
                        title="View employee profile & history"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Details
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(staff)}
                        className="text-xs font-semibold p-2"
                        title="Edit employee"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        variant={staff.isActive ? 'outline' : 'primary'}
                        size="sm"
                        onClick={() => handleToggleStaff(staff)}
                        className={`text-xs font-semibold p-2 ${staff.isActive ? 'text-amber-600 hover:bg-amber-500/10' : ''}`}
                        title={staff.isActive ? 'Deactivate staff member' : 'Activate staff member'}
                      >
                        {staff.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteStaff(staff)}
                        className="text-xs font-semibold p-2 text-destructive hover:bg-destructive/10 border-destructive/30"
                        title="Delete staff member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: ADD STAFF MEMBER                                 */}
      {/* ========================================================= */}
      {addStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-raised shadow-raised-lg rounded-3xl border border-border-default max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Add New Staff Member
              </h2>
              <button onClick={() => setAddStaffOpen(false)} className="p-1 rounded-lg hover:bg-surface-inset text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl font-semibold">
                {actionError}
              </div>
            )}

            <form onSubmit={handleAddStaffSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Link Field Salesman Account (Optional)
                </label>
                <select
                  value={addStaffForm.salesmanId}
                  onChange={(e) => {
                    const sid = e.target.value;
                    const match = unlinkedSalesmen?.find(s => s.id === sid);
                    if (match) {
                      setAddStaffForm({
                        ...addStaffForm,
                        salesmanId: sid,
                        name: match.name,
                        phone: match.phone || addStaffForm.phone,
                        designation: 'Salesman',
                        role: 'SALESMAN',
                      });
                    } else {
                      setAddStaffForm({
                        ...addStaffForm,
                        salesmanId: '',
                      });
                    }
                  }}
                  className="w-full bg-surface-inset shadow-inset border border-border/40 rounded-xl px-3 py-2 text-foreground focus:outline-none cursor-pointer"
                >
                  <option value="">None (Standard Plant / Non-sales Staff)</option>
                  {unlinkedSalesmen && unlinkedSalesmen.length > 0 ? (
                    unlinkedSalesmen.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.employeeCode} — {s.name} {s.phone ? `(${s.phone})` : ''}
                      </option>
                    ))
                  ) : (
                    <option disabled value="__all_linked__">
                      All field salesmen are currently linked to staff profiles
                    </option>
                  )}
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Select an existing field salesman to automatically sync their staff payroll with their salesman credentials.
                </p>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={addStaffForm.name}
                  onChange={(e) => setAddStaffForm({ ...addStaffForm, name: e.target.value })}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full bg-surface-inset shadow-inset border border-border/40 rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Designation <span className="text-destructive">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={addStaffForm.designation}
                    onChange={(e) => setAddStaffForm({ ...addStaffForm, designation: e.target.value })}
                    placeholder="e.g. Sales Representative"
                    className="w-full bg-surface-inset shadow-inset border border-border/40 rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    System Category
                  </label>
                  <select
                    value={addStaffForm.role}
                    onChange={(e) => setAddStaffForm({ ...addStaffForm, role: e.target.value as any })}
                    className="w-full bg-surface-inset shadow-inset border border-border/40 rounded-xl px-3 py-2 text-foreground focus:outline-none"
                  >
                    <option value="PRODUCTION_STAFF">Production Staff</option>
                    <option value="SALESMAN">Sales Representative / Salesman</option>
                    <option value="ACCOUNTANT">Accountant</option>
                    <option value="SUPERVISOR">Supervisor / Manager</option>
                    <option value="DRIVER">Driver</option>
                    <option value="LABOUR">Plant Labour</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Monthly Salary (₹) <span className="text-destructive">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    step="1"
                    min="1"
                    value={addStaffForm.monthlySalaryRupees}
                    onChange={(e) => setAddStaffForm({ ...addStaffForm, monthlySalaryRupees: e.target.value })}
                    placeholder="e.g. 15000"
                    className="w-full bg-surface-inset shadow-inset border border-border/40 rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={addStaffForm.phone}
                    onChange={(e) => setAddStaffForm({ ...addStaffForm, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-surface-inset shadow-inset border border-border/40 rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAddStaffOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={actionLoading}
                >
                  Add Staff Member
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: EDIT STAFF MEMBER                                */}
      {/* ========================================================= */}
      {editStaffOpen && selectedStaffForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-raised shadow-raised-lg rounded-3xl border border-border-default max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-primary" />
                Edit Staff Member — {selectedStaffForEdit.employeeCode}
              </h2>
              <button onClick={() => setEditStaffOpen(false)} className="p-1 rounded-lg hover:bg-surface-inset text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl font-semibold">
                {actionError}
              </div>
            )}

            <form onSubmit={handleEditStaffSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={editStaffForm.name}
                  onChange={(e) => setEditStaffForm({ ...editStaffForm, name: e.target.value })}
                  className="w-full bg-surface-inset shadow-inset border border-border/40 rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Designation <span className="text-destructive">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={editStaffForm.designation}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, designation: e.target.value })}
                    className="w-full bg-surface-inset shadow-inset border border-border/40 rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Monthly Salary (₹) <span className="text-destructive">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    step="1"
                    min="1"
                    value={editStaffForm.monthlySalaryRupees}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, monthlySalaryRupees: e.target.value })}
                    className="w-full bg-surface-inset shadow-inset border border-border/40 rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editStaffForm.phone}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, phone: e.target.value })}
                    className="w-full bg-surface-inset shadow-inset border border-border/40 rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Status
                  </label>
                  <select
                    value={editStaffForm.isActive ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, isActive: e.target.value === 'ACTIVE' })}
                    className="w-full bg-surface-inset shadow-inset border border-border/40 rounded-xl px-3 py-2 text-foreground focus:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">DEACTIVATED</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-inset/50 border border-border/40 text-[11px] text-muted-foreground">
                Notice: Changing monthly salary applies to future payroll periods and creates an audit record. Historical records are preserved.
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditStaffOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={actionLoading}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: PAY SALARY                                       */}
      {/* ========================================================= */}
      {paySalaryOpen && selectedLedgerItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-raised shadow-raised-lg rounded-3xl border border-border-default max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                Pay Salary — {selectedLedgerItem.staff.name}
              </h2>
              <button onClick={() => setPaySalaryOpen(false)} className="p-1 rounded-lg hover:bg-surface-inset text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Breakdown Card */}
            <div className="p-4 rounded-2xl bg-surface-inset shadow-inset border border-border/40 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payroll Month:</span>
                <span className="font-bold text-foreground">{MONTHS[selectedLedgerItem.month - 1]} {selectedLedgerItem.year}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base Salary:</span>
                <span className="font-semibold text-foreground">₹{(selectedLedgerItem.basicSalary / 100).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Attendance Deductions:</span>
                <span className="font-semibold text-destructive">-₹{(selectedLedgerItem.totalDeductions / 100).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-t border-border/40 pt-1.5">
                <span className="font-bold text-primary">Net Payable:</span>
                <span className="font-bold text-primary">₹{(selectedLedgerItem.netPayable / 100).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Previously Paid:</span>
                <span className="font-semibold text-emerald-600">₹{(selectedLedgerItem.paidAmount / 100).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-t border-border/40 pt-1.5 text-sm font-extrabold">
                <span className="text-destructive">Remaining Balance:</span>
                <span className="text-destructive">₹{(selectedLedgerItem.remainingBalance / 100).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {actionError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl font-semibold">
                {actionError}
              </div>
            )}

            <form onSubmit={handlePaySalarySubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Amount Being Paid (₹) <span className="text-destructive">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="1"
                    max={(selectedLedgerItem.remainingBalance / 100)}
                    value={paySalaryForm.amountRupees}
                    onChange={(e) => setPaySalaryForm({ ...paySalaryForm, amountRupees: e.target.value })}
                    className="w-full bg-surface-inset shadow-inset border border-border/40 rounded-xl px-3 py-2 text-foreground font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Payment Method <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={paySalaryForm.paymentMethod}
                    onChange={(e) => setPaySalaryForm({ ...paySalaryForm, paymentMethod: e.target.value as any })}
                    className="w-full bg-surface-inset shadow-inset border border-border/40 rounded-xl px-3 py-2 text-foreground font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Payment Date <span className="text-destructive">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={paySalaryForm.paymentDateStr}
                    max={attendanceData.todayStr}
                    onChange={(e) => setPaySalaryForm({ ...paySalaryForm, paymentDateStr: e.target.value })}
                    className="w-full bg-surface-inset shadow-inset border border-border/40 rounded-xl px-3 py-2 text-foreground focus:outline-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Ref / Cheque / UTR No
                  </label>
                  <input
                    type="text"
                    value={paySalaryForm.referenceNo}
                    onChange={(e) => setPaySalaryForm({ ...paySalaryForm, referenceNo: e.target.value })}
                    placeholder="Optional transaction ID"
                    className="w-full bg-surface-inset shadow-inset border border-border/40 rounded-xl px-3 py-2 text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Notes / Voucher Remarks
                </label>
                <input
                  type="text"
                  value={paySalaryForm.notes}
                  onChange={(e) => setPaySalaryForm({ ...paySalaryForm, notes: e.target.value })}
                  placeholder="Optional remarks"
                  className="w-full bg-surface-inset shadow-inset border border-border/40 rounded-xl px-3 py-2 text-foreground focus:outline-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPaySalaryOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={actionLoading}
                >
                  Confirm & Pay Salary
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: EMPLOYEE DETAIL PROFILE & AUDIT HISTORY          */}
      {/* ========================================================= */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-raised shadow-raised-lg rounded-3xl border border-border-default max-w-3xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Employee Full Profile & History
              </h2>
              <button onClick={() => setProfileModalOpen(false)} className="p-1 rounded-lg hover:bg-surface-inset text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingProfile || !employeeProfile ? (
              <div className="py-16 text-center text-muted-foreground text-xs font-semibold">
                Loading employee details and financial ledger...
              </div>
            ) : (
              <div className="space-y-6 text-xs">
                {/* Header Summary */}
                <div className="p-4 rounded-2xl bg-surface-inset shadow-inset border border-border/40 flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{employeeProfile.staff.name}</h3>
                    <div className="text-xs text-primary font-semibold mt-0.5">
                      {employeeProfile.staff.designation || employeeProfile.staff.role} • {employeeProfile.staff.employeeCode}
                    </div>
                    {employeeProfile.staff.phone && (
                      <div className="text-muted-foreground text-[11px] mt-1">Phone: {employeeProfile.staff.phone}</div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Monthly Salary</div>
                    <div className="text-lg font-extrabold text-foreground">
                      ₹{(employeeProfile.staff.monthlySalary / 100).toLocaleString('en-IN')}
                    </div>
                    <div className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
                      ₹{(employeeProfile.staff.dailyRatePaise / 100).toFixed(0)}/day (30-day denominator)
                    </div>
                  </div>
                </div>

                {/* Section: Monthly Payroll History */}
                <div className="space-y-2">
                  <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-[11px] flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-primary" />
                    Year {currentYear} Payroll Breakdown
                  </h4>
                  <div className="border border-border/40 rounded-xl overflow-hidden bg-surface-raised">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-surface-inset/50 border-b border-border/40 text-[10px] uppercase font-bold text-muted-foreground">
                          <th className="p-2.5">Month</th>
                          <th className="p-2.5 text-right">Base</th>
                          <th className="p-2.5 text-center">Absences</th>
                          <th className="p-2.5 text-right">Deductions</th>
                          <th className="p-2.5 text-right">Net Payable</th>
                          <th className="p-2.5 text-right">Paid</th>
                          <th className="p-2.5 text-right">Balance</th>
                          <th className="p-2.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {employeeProfile.payrolls.length === 0 ? (
                          <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">No payroll records for this year</td></tr>
                        ) : (
                          employeeProfile.payrolls.map((p: any) => (
                            <tr key={p.id} className="hover:bg-surface-inset/30">
                              <td className="p-2.5 font-bold">{MONTHS[p.month - 1]}</td>
                              <td className="p-2.5 text-right font-medium">₹{(p.basicSalary / 100).toLocaleString('en-IN')}</td>
                              <td className="p-2.5 text-center font-medium">{p.fullDayAbsences}F / {p.halfDayAbsences}H</td>
                              <td className="p-2.5 text-right text-destructive font-semibold">-₹{(p.deductions / 100).toLocaleString('en-IN')}</td>
                              <td className="p-2.5 text-right font-bold text-primary">₹{(p.netPayable / 100).toLocaleString('en-IN')}</td>
                              <td className="p-2.5 text-right font-semibold text-emerald-600">₹{(p.paidAmount / 100).toLocaleString('en-IN')}</td>
                              <td className="p-2.5 text-right font-bold text-foreground">₹{(p.remainingBalance / 100).toLocaleString('en-IN')}</td>
                              <td className="p-2.5 text-center">
                                <Badge variant={p.status === 'PAID' ? 'success' : p.status === 'PARTIALLY_PAID' ? 'info' : 'danger'} size="sm">
                                  {p.status}
                                </Badge>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section: Payment Transactions History */}
                <div className="space-y-2">
                  <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-[11px] flex items-center gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                    Salary Payment Transactions
                  </h4>
                  <div className="border border-border/40 rounded-xl overflow-hidden bg-surface-raised">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-surface-inset/50 border-b border-border/40 text-[10px] uppercase font-bold text-muted-foreground">
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Method</th>
                          <th className="p-2.5">Reference No</th>
                          <th className="p-2.5 text-right">Amount</th>
                          <th className="p-2.5">Disbursed By</th>
                          <th className="p-2.5 text-center">Status</th>
                          <th className="p-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {employeeProfile.payments.length === 0 ? (
                          <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No payments recorded</td></tr>
                        ) : (
                          employeeProfile.payments.map((pmt: any) => (
                            <tr key={pmt.id} className="hover:bg-surface-inset/30">
                              <td className="p-2.5 font-medium">{new Date(pmt.paymentDate).toLocaleDateString('en-IN')}</td>
                              <td className="p-2.5 font-semibold text-foreground">{pmt.paymentMethod}</td>
                              <td className="p-2.5 font-mono text-[11px] text-muted-foreground">{pmt.referenceNo || '—'}</td>
                              <td className="p-2.5 text-right font-extrabold text-emerald-600">
                                ₹{(pmt.amount / 100).toLocaleString('en-IN')}
                              </td>
                              <td className="p-2.5 text-muted-foreground">{pmt.recordedBy || 'Admin'}</td>
                              <td className="p-2.5 text-center">
                                {pmt.isReversed ? (
                                  <Badge variant="danger" size="sm">REVERSED</Badge>
                                ) : (
                                  <Badge variant="success" size="sm">VALID</Badge>
                                )}
                              </td>
                              <td className="p-2.5 text-right">
                                {!pmt.isReversed && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedPaymentForReversal(pmt);
                                      setReversalReason('');
                                      setReversalModalOpen(true);
                                    }}
                                    className="text-[10px] font-semibold text-destructive hover:bg-destructive/10 p-1"
                                    title="Reverse payment with audit trail"
                                  >
                                    <RotateCcw className="w-3 h-3 mr-0.5" />
                                    Reverse
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section: Audit Trail */}
                {employeeProfile.auditLogs && employeeProfile.auditLogs.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-[11px] flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                      Audit & Correction Log
                    </h4>
                    <div className="p-3 rounded-xl bg-surface-inset shadow-inset border border-border/40 space-y-2 text-[11px]">
                      {employeeProfile.auditLogs.map((log: any) => (
                        <div key={log.id} className="flex items-start justify-between border-b border-border/20 pb-1.5 last:border-0 last:pb-0">
                          <div>
                            <span className="font-semibold text-foreground">{log.action}: </span>
                            <span className="text-muted-foreground">{log.details}</span>
                          </div>
                          <span className="text-muted-foreground font-mono text-[10px]">
                            {new Date(log.createdAt).toLocaleDateString('en-IN')} by {log.actorName}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: PAYMENT REVERSAL CONFIRMATION                    */}
      {/* ========================================================= */}
      {reversalModalOpen && selectedPaymentForReversal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-raised shadow-raised-lg rounded-3xl border border-destructive/40 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <h3 className="text-sm font-bold text-destructive flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                Reverse Salary Payment
              </h3>
              <button onClick={() => setReversalModalOpen(false)} className="p-1 rounded-lg hover:bg-surface-inset text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Are you sure you want to reverse the salary disbursement of <strong className="text-foreground">₹{(selectedPaymentForReversal.amount / 100).toLocaleString('en-IN')}</strong> recorded on {new Date(selectedPaymentForReversal.paymentDate).toLocaleDateString('en-IN')}? This will restore the employee's outstanding payroll balance and create a permanent audit log entry.
            </p>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Reason for Reversal <span className="text-destructive">*</span>
              </label>
              <input
                required
                type="text"
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="e.g. Duplicate bank transfer, wrong amount, clerical error"
                className="w-full bg-surface-inset shadow-inset border border-border/40 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-destructive/40"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/40">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReversalModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleReversePayment}
                isLoading={actionLoading}
              >
                Confirm Reversal
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
