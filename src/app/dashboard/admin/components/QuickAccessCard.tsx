'use client';

import React from 'react';
import Link from 'next/link';
import { UserPlus, UserCheck, Banknote, ChevronRight, Sparkles } from 'lucide-react';

export default function QuickAccessCard() {
  return (
    <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-4 flex flex-col justify-between h-full select-none">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border-subtle">
        <div className="h-6 w-6 rounded-md bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-800 dark:text-teal-400 shrink-0">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-xs sm:text-sm font-bold text-primary tracking-tight">
          Quick Access
        </h3>
      </div>

      {/* 3 Quick Action Items (EXACTLY matching sketch) */}
      <div className="space-y-2.5">
        {/* 1. Add New Customer (Primary Action) */}
        <Link
          href="/dashboard/admin/customers/new"
          className="flex items-center gap-3 p-3 rounded-xl bg-[#1A5F63] hover:bg-[#144C4F] text-white shadow-raised transition-all duration-150 cursor-pointer group active:scale-[0.98]"
          title="Add New Customer to Territory"
        >
          <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0 text-white shadow-xs">
            <UserPlus className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs sm:text-sm font-bold text-white truncate leading-tight">
              Add New Customer
            </div>
            <div className="text-[10px] text-teal-100 truncate mt-0.5">
              Register outlet in Dahod network
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-white/70 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
        </Link>

        {/* 2. Staff Attendance */}
        <Link
          href="/dashboard/admin/sessions"
          className="flex items-center gap-3 p-3 rounded-xl bg-surface-raised hover:bg-surface-inset/60 border border-border-default/80 shadow-xs hover:shadow-hover transition-all duration-150 cursor-pointer group active:scale-[0.98]"
          title="Staff Attendance & Field Presence"
        >
          <div className="h-8 w-8 rounded-lg bg-surface-inset border border-border-default shadow-inset flex items-center justify-center shrink-0 text-teal-800 dark:text-teal-400 group-hover:scale-105 transition-all">
            <UserCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs sm:text-sm font-bold text-primary truncate leading-tight">
              Staff Attendance
            </div>
            <div className="text-[10px] text-secondary truncate mt-0.5">
              Field duty, check-in & active visits
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
        </Link>

        {/* 3. Their Salary */}
        <Link
          href="/dashboard/admin/payroll"
          className="flex items-center gap-3 p-3 rounded-xl bg-surface-raised hover:bg-surface-inset/60 border border-border-default/80 shadow-xs hover:shadow-hover transition-all duration-150 cursor-pointer group active:scale-[0.98]"
          title="Staff Salary & Payroll Management"
        >
          <div className="h-8 w-8 rounded-lg bg-surface-inset border border-border-default shadow-inset flex items-center justify-center shrink-0 text-teal-800 dark:text-teal-400 group-hover:scale-105 transition-all">
            <Banknote className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs sm:text-sm font-bold text-primary truncate leading-tight">
              Their Salary
            </div>
            <div className="text-[10px] text-secondary truncate mt-0.5">
              Monthly disbursements & wage liabilities
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
        </Link>
      </div>
    </div>
  );
}
