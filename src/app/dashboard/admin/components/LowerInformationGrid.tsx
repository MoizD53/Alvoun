'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Users, 
  MapPin, 
  Truck, 
  Droplets, 
  UserCheck, 
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { formatMoney, formatNumber } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import type { 
  TopCustomerItem, 
  AreaSaleItem, 
  AttendanceData, 
  DispatchSummary 
} from '@/lib/dashboard-data';

interface LowerInformationGridProps {
  topCustomers: TopCustomerItem[];
  areaSales: AreaSaleItem[];
  attendance: AttendanceData;
  dispatches: DispatchSummary;
  isToday?: boolean;
  selectedDate?: string;
}

export default function LowerInformationGrid({
  topCustomers,
  areaSales,
  attendance,
  dispatches,
  isToday = true,
  selectedDate,
}: LowerInformationGridProps) {
  const maxAreaSales = areaSales.length > 0 ? Math.max(...areaSales.map(a => a.salesPaise), 1) : 1;

  // Helper for 2-letter customer initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const periodLabel = isToday ? 'Today' : selectedDate || 'Selected Date';

  return (
    <div className="space-y-4 select-none">
      {/* ------------------------------------------------------------------ */}
      {/* ROW 1: TOP CUSTOMERS & AREA-WISE SALES (2-COLUMN GRID)             */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* A. TOP CUSTOMERS TABLE */}
        <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl overflow-hidden flex flex-col justify-between">
          <div className="px-4 py-3 border-b border-border-default flex items-center justify-between bg-surface-raised">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-800 dark:text-teal-400 shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-primary tracking-tight">
                Top Customers ({periodLabel})
              </h3>
            </div>
            <Link
              href="/dashboard/admin/customers"
              className="text-[11px] font-semibold text-secondary hover:text-primary transition-colors inline-flex items-center gap-0.5"
              title="Open full customer directory"
            >
              <span>View All</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface-inset text-secondary font-bold uppercase tracking-wider text-[9px] border-b border-border-default">
                <tr>
                  <th className="px-3 py-2 w-8 text-center">#</th>
                  <th className="px-3 py-2">Customer Name</th>
                  <th className="px-3 py-2">Sector / Area</th>
                  <th className="px-3 py-2 text-right">Sales</th>
                  <th className="px-4 py-2 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-[11px]">
                {topCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-secondary">
                      No customer billing recorded for this date.
                    </td>
                  </tr>
                ) : (
                  topCustomers.map((cust, idx) => {
                    const isHighDues = cust.outstandingPaise > 1000000;
                    return (
                      <tr 
                        key={cust.customerId} 
                        className="hover:bg-surface-inset/60 transition-colors group"
                      >
                        <td className="px-3 py-2 text-center font-mono font-bold text-muted text-[10px]">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2">
                          <Link 
                            href={`/dashboard/admin/customers/${cust.customerId}`}
                            className="flex items-center gap-2 group-hover:text-teal-700 dark:group-hover:text-teal-400"
                            title={`Open ${cust.customerName} workspace`}
                          >
                            <div className="h-6 w-6 rounded-full bg-surface-inset border border-border-default shadow-inset flex items-center justify-center font-bold text-[9px] text-teal-800 dark:text-teal-400 shrink-0">
                              {getInitials(cust.customerName)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-primary group-hover:text-teal-700 dark:group-hover:text-teal-400 truncate max-w-[120px] sm:max-w-[150px] transition-colors">
                                {cust.customerName}
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-secondary font-medium truncate block max-w-[95px] text-[10px]">
                            {cust.areaName !== 'Unassigned' ? cust.areaName : cust.routeName}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-primary">
                          {formatMoney(cust.todaySalesPaise)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Link
                            href={`/dashboard/admin/customers/${cust.customerId}`}
                            className={`font-mono font-bold inline-flex items-center gap-0.5 hover:underline ${
                              isHighDues
                                ? 'text-red-700 dark:text-red-400'
                                : cust.outstandingPaise > 0
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-emerald-700 dark:text-emerald-400'
                            }`}
                          >
                            {formatMoney(cust.outstandingPaise)}
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* B. AREA-WISE SALES DISTRIBUTION */}
        <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-800 dark:text-teal-400 shrink-0">
                <MapPin className="h-4 w-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-primary tracking-tight">
                Area-Wise Sales
              </h3>
            </div>
            <Link
              href="/dashboard/admin/routes"
              className="text-[11px] font-semibold text-secondary hover:text-primary transition-colors inline-flex items-center gap-0.5"
              title="Open Routes & Sectors"
            >
              <span>Routes</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[220px] pr-1">
            {areaSales.length === 0 ? (
              <div className="text-center py-6 text-xs text-secondary">
                No area-level distribution recorded for this date.
              </div>
            ) : (
              areaSales.slice(0, 5).map((area) => {
                const barWidth = Math.max(3, (area.salesPaise / maxAreaSales) * 100);
                return (
                  <Link
                    key={area.areaId}
                    href="/dashboard/admin/routes"
                    className="block space-y-1 p-1 rounded-xl hover:bg-surface-inset/60 transition-colors group"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 truncate pr-2">
                        <span className="font-bold text-primary group-hover:text-teal-700 dark:group-hover:text-teal-400 truncate text-[11px] transition-colors">
                          {area.areaName}
                        </span>
                        <span className="text-[10px] text-muted">
                          ({area.routeName})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-bold text-primary text-[11px]">
                          {formatMoney(area.salesPaise)}
                        </span>
                        <span className="font-mono text-[9px] font-bold text-teal-800 dark:text-teal-400 bg-surface-inset px-1.5 py-0.2 rounded border border-border-default shadow-inset">
                          {area.percentage}%
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-surface-inset border border-border-default shadow-inset rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#1A5F63] h-full rounded-full transition-all duration-300"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* ROW 2: FIELD STAFF & OPS SUMMARY (3-COLUMN SUBGRID)               */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* C. FIELD STAFF PERFORMANCE TABLE (2 COLS) */}
        <div className="lg:col-span-2 bg-surface-raised border border-border-default shadow-raised rounded-2xl overflow-hidden flex flex-col justify-between">
          <div className="px-4 py-3 border-b border-border-default flex items-center justify-between bg-surface-raised">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-800 dark:text-teal-400 shrink-0">
                <Truck className="h-4 w-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-primary tracking-tight">
                Field Staff Performance
              </h3>
            </div>
            <Link
              href="/dashboard/admin/locations"
              className="text-[11px] font-semibold text-secondary hover:text-primary transition-colors inline-flex items-center gap-0.5"
              title="Open Live Fleet Map"
            >
              <span>Live Fleet</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface-inset text-secondary font-bold uppercase tracking-wider text-[9px] border-b border-border-default">
                <tr>
                  <th className="px-4 py-2">Staff</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Current Activity</th>
                  <th className="px-3 py-2 text-right">Sales</th>
                  <th className="px-3 py-2 text-right">Collections</th>
                  <th className="px-4 py-2 text-right">Visits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-[11px]">
                {attendance.salesmen.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-secondary">
                      No field staff active on this date.
                    </td>
                  </tr>
                ) : (
                  attendance.salesmen.map((s) => (
                    <tr key={s.id} className="hover:bg-surface-inset/60 transition-colors group">
                      <td className="px-4 py-2 font-bold text-primary">
                        <Link 
                          href={`/dashboard/admin/salesmen/${s.id}`}
                          className="hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
                          title={`Open ${s.name} profile`}
                        >
                          <div>{s.name}</div>
                          <div className="text-[9px] font-mono text-muted">{s.employeeCode}</div>
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          variant={
                            s.status === 'Working'
                              ? 'success'
                              : s.status === 'Completed'
                              ? 'teal'
                              : 'neutral'
                          }
                          styleType="subtle"
                          size="sm"
                          dot
                          pulse={s.status === 'Working'}
                        >
                          {s.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-primary truncate max-w-[130px] text-[10px]">
                          {s.currentAction}
                        </div>
                        {s.currentCustomerName && (
                          <div className="text-[9px] text-muted truncate">
                            {s.currentCustomerName}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-primary">
                        {formatMoney(s.salesPaise)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {formatMoney(s.collectionPaise)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono font-bold text-secondary">
                        {s.visitsCount}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* D & E. DISPATCH SUMMARY & ATTENDANCE SUMMARY (1 COL) */}
        <div className="space-y-4">
          {/* D. DISPATCH SUMMARY */}
          <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-3.5 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="h-6 w-6 rounded-md bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-800 dark:text-teal-400 shrink-0">
                  <Droplets className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-primary tracking-tight">
                  Dispatches ({periodLabel})
                </h3>
              </div>
              <Link
                href="/dashboard/admin/reports/products"
                className="text-[9px] font-mono text-teal-800 dark:text-teal-300 uppercase hover:underline"
                title="View Product Stock"
              >
                Products →
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2.5">
              <div className="p-2 rounded-xl bg-surface-inset border border-border-default shadow-inset">
                <span className="text-[9px] font-semibold text-secondary uppercase block">Volume</span>
                <span className="font-mono text-sm font-bold text-primary">
                  {formatNumber(dispatches.totalLitres)} <span className="text-[10px] font-normal text-secondary">Ltr</span>
                </span>
              </div>
              <div className="p-2 rounded-xl bg-surface-inset border border-border-default shadow-inset">
                <span className="text-[9px] font-semibold text-secondary uppercase block">PKG</span>
                <span className="font-mono text-sm font-bold text-teal-800 dark:text-teal-400">
                  {formatNumber(dispatches.totalCrates)} <span className="text-[10px] font-normal text-secondary">PKG</span>
                </span>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              {dispatches.byProduct.length === 0 ? (
                <div className="text-center py-2 text-secondary text-[10px]">
                  No dispatches logged for this date.
                </div>
              ) : (
                dispatches.byProduct.map((p) => (
                  <Link
                    key={p.productId}
                    href="/dashboard/admin/reports/products"
                    className="flex items-center justify-between p-1 rounded-lg bg-surface-inset/60 hover:bg-surface-inset text-[10px] transition-colors"
                  >
                    <span className="font-semibold text-primary">{p.productName}</span>
                    <span className="font-mono font-bold text-secondary">
                      {p.crates} PKG / {p.volumeLitres}L
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* E. SHIFT ATTENDANCE */}
          <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="h-6 w-6 rounded-md bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-800 dark:text-teal-400 shrink-0">
                  <UserCheck className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-primary tracking-tight">
                  Staff Shift Attendance
                </h3>
              </div>
              <Link
                href="/dashboard/admin/sessions"
                className="text-[10px] font-semibold text-secondary hover:text-primary"
                title="Open Work Sessions"
              >
                Logs →
              </Link>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-inset border border-border-default shadow-inset my-1">
              <div>
                <span className="text-[10px] text-secondary block">Present</span>
                <div className="text-base font-bold text-primary font-mono leading-tight">
                  <span className="text-emerald-700 dark:text-emerald-400">{attendance.present}</span>
                  <span className="text-secondary text-xs font-normal"> / {attendance.totalStaff}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-secondary block">Shift Rate</span>
                <span className="text-sm font-bold text-teal-800 dark:text-teal-400 font-mono">
                  {attendance.attendancePercent}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1 text-center text-[9px] mt-1 font-semibold">
              <div className="p-1 rounded-lg bg-surface-inset border border-border-default text-emerald-800 dark:text-emerald-400">
                {attendance.working} Working
              </div>
              <div className="p-1 rounded-lg bg-surface-inset border border-border-default text-teal-800 dark:text-teal-400">
                {attendance.completed} Ended
              </div>
              <div className="p-1 rounded-lg bg-surface-inset border border-border-default text-red-800 dark:text-red-400">
                {attendance.absent} Off
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
