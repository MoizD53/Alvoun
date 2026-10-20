'use client';

import React from 'react';
import Link from 'next/link';
import { Users, Route, MapPin, UserCheck } from 'lucide-react';
import type { AttendanceData } from '@/lib/dashboard-data';

interface SecondaryMetricsBarProps {
  meta: {
    totalCustomersCount: number;
    activeCustomersCount: number;
    activeRoutesCount: number;
    totalAreasCount: number;
  };
  attendance: AttendanceData;
}

export default function SecondaryMetricsBar({ meta, attendance }: SecondaryMetricsBarProps) {
  return (
    <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-2 sm:p-2.5 select-none">
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border-default/60">
        {/* 1. TODAY'S ACTIVE CUSTOMERS */}
        <Link
          href="/dashboard/admin/customers"
          className="flex items-center gap-2.5 p-2 sm:p-2.5 hover:bg-surface-inset/50 rounded-xl transition-colors group cursor-pointer"
        >
          <div className="h-8 w-8 rounded-lg bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-800 dark:text-teal-400 shrink-0">
            <Users className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold text-secondary truncate">
              Today&apos;s Active Customers
            </div>
            <div className="text-sm font-bold text-primary font-mono tracking-tight mt-0.5">
              <span>{meta.activeCustomersCount}</span>
              <span className="text-[11px] font-normal text-secondary font-sans ml-1">/ 30 days</span>
            </div>
          </div>
        </Link>

        {/* 2. TOTAL CUSTOMERS */}
        <Link
          href="/dashboard/admin/customers"
          className="flex items-center gap-2.5 p-2 sm:p-2.5 hover:bg-surface-inset/50 rounded-xl transition-colors group cursor-pointer"
        >
          <div className="h-8 w-8 rounded-lg bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-800 dark:text-teal-400 shrink-0">
            <Users className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold text-secondary truncate">
              Total Customers
            </div>
            <div className="text-sm font-bold text-primary font-mono tracking-tight mt-0.5">
              {meta.totalCustomersCount}
            </div>
          </div>
        </Link>

        {/* 3. ACTIVE DEALERS & DISTRIBUTORS */}
        <Link
          href="/dashboard/admin/routes"
          className="flex items-center gap-2.5 p-2 sm:p-2.5 hover:bg-surface-inset/50 rounded-xl transition-colors group cursor-pointer"
        >
          <div className="h-8 w-8 rounded-lg bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-800 dark:text-teal-400 shrink-0">
            <Route className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold text-secondary truncate">
              Active Routes & Areas
            </div>
            <div className="text-sm font-bold text-primary font-mono tracking-tight mt-0.5">
              <span>{meta.activeRoutesCount} Routes</span>
              <span className="text-[11px] font-normal text-secondary font-sans ml-1">({meta.totalAreasCount} Sectors)</span>
            </div>
          </div>
        </Link>

        {/* 4. TODAY'S ATTENDANCE */}
        <Link
          href="/dashboard/admin/sessions"
          className="flex items-center gap-2.5 p-2 sm:p-2.5 hover:bg-surface-inset/50 rounded-xl transition-colors group cursor-pointer"
        >
          <div className="h-8 w-8 rounded-lg bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-800 dark:text-teal-400 shrink-0">
            <UserCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold text-secondary truncate">
              Today&apos;s Attendance
            </div>
            <div className="text-sm font-bold text-primary font-mono tracking-tight mt-0.5">
              <span>{attendance.present}</span>
              <span className="text-[11px] font-normal text-secondary font-sans ml-1">/ {attendance.totalStaff} Staff</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
