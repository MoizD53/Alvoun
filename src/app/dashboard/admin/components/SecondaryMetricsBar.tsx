'use client';

import React from 'react';
import Link from 'next/link';
import { Users, Route, UserCheck, Banknote, ChevronRight } from 'lucide-react';
import { formatMoney } from '@/lib/format';
import type { 
  AttendanceData, 
  CustomerActivitySummary, 
  PayrollSummary 
} from '@/lib/dashboard-data';

interface SecondaryMetricsBarProps {
  meta: {
    totalCustomersCount: number;
    activeCustomersCount: number;
    activeRoutesCount: number;
    totalAreasCount: number;
  };
  attendance: AttendanceData;
  customerActivity?: CustomerActivitySummary;
  payroll?: PayrollSummary;
}

export default function SecondaryMetricsBar({ 
  meta, 
  attendance,
  customerActivity,
  payroll
}: SecondaryMetricsBarProps) {
  const activeCount = customerActivity?.totalActiveCustomers ?? meta.activeCustomersCount ?? 333;
  const purchasedToday = customerActivity?.purchasedTodayCount ?? 0;
  const purchasePct = customerActivity?.purchasePercentage ?? 0;

  return (
    <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-2 sm:p-2.5 select-none">
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border-default/60">
        {/* 1. CUSTOMER ACTIVITY (TODAY'S PURCHASING CUSTOMERS) */}
        <Link
          href="/dashboard/admin/customers"
          className="flex items-center gap-2.5 p-2 sm:p-2.5 hover:bg-surface-inset/50 rounded-xl transition-colors group cursor-pointer"
          title="Open customer master directory"
        >
          <div className="h-8 w-8 rounded-lg bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-800 dark:text-teal-400 shrink-0">
            <Users className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold text-secondary truncate">
              Active Buyers Today
            </div>
            <div className="text-sm font-bold text-primary font-mono tracking-tight mt-0.5">
              <span>{purchasedToday}</span>
              <span className="text-[11px] font-normal text-secondary font-sans ml-1">/ {activeCount} Active</span>
            </div>
            <div className="text-[10px] text-muted font-medium">
              {purchasePct}% Purchase Ratio
            </div>
          </div>
        </Link>

        {/* 2. ACTIVE ROUTES & AREAS */}
        <Link
          href="/dashboard/admin/routes"
          className="flex items-center gap-2.5 p-2 sm:p-2.5 hover:bg-surface-inset/50 rounded-xl transition-colors group cursor-pointer"
          title="Open Routes, Areas, and Territory Master"
        >
          <div className="h-8 w-8 rounded-lg bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-800 dark:text-teal-400 shrink-0">
            <Route className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold text-secondary truncate">
              Routes & Sectors
            </div>
            <div className="text-sm font-bold text-primary font-mono tracking-tight mt-0.5">
              <span>{meta.activeRoutesCount} Routes</span>
            </div>
            <div className="text-[10px] text-muted font-medium">
              {meta.totalAreasCount} Territory Areas
            </div>
          </div>
        </Link>

        {/* 3. TODAY'S ATTENDANCE */}
        <Link
          href="/dashboard/admin/sessions"
          className="flex items-center gap-2.5 p-2 sm:p-2.5 hover:bg-surface-inset/50 rounded-xl transition-colors group cursor-pointer"
          title="Open Attendance & Field Operations"
        >
          <div className="h-8 w-8 rounded-lg bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-800 dark:text-teal-400 shrink-0">
            <UserCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold text-secondary truncate">
              Staff Attendance
            </div>
            <div className="text-sm font-bold text-primary font-mono tracking-tight mt-0.5">
              <span>{attendance.present}</span>
              <span className="text-[11px] font-normal text-secondary font-sans ml-1">/ {attendance.totalStaff} Staff</span>
            </div>
            <div className="text-[10px] text-muted font-medium">
              {attendance.attendancePercent}% Present Today
            </div>
          </div>
        </Link>

        {/* 4. STAFF SALARY & PAYROLL */}
        <Link
          href="/dashboard/admin/payroll"
          className="flex items-center gap-2.5 p-2 sm:p-2.5 hover:bg-surface-inset/50 rounded-xl transition-colors group cursor-pointer"
          title="Open Staff & Payroll Register"
        >
          <div className="h-8 w-8 rounded-lg bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-800 dark:text-teal-400 shrink-0">
            <Banknote className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold text-secondary truncate">
              Monthly Payroll
            </div>
            <div className="text-sm font-bold text-primary font-mono tracking-tight mt-0.5">
              {formatMoney(payroll?.monthlyLiabilityPaise ?? 0)}
            </div>
            <div className="text-[10px] text-muted font-medium">
              {payroll?.activeStaffCount ?? 0} Active Staff
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
