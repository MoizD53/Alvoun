'use client';

import React from 'react';
import Link from 'next/link';
import { Users, ChevronRight } from 'lucide-react';
import { formatMoney } from '@/lib/format';
import type { TopCustomerItem } from '@/lib/dashboard-data';
import AdminDatePicker from './AdminDatePicker';

interface TopCustomersCardProps {
  topCustomers: TopCustomerItem[];
  selectedDate?: string;
  isToday?: boolean;
}

export default function TopCustomersCard({
  topCustomers,
  selectedDate,
  isToday = true,
}: TopCustomersCardProps) {
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const periodLabel = isToday ? 'Today' : selectedDate || 'Selected';

  return (
    <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl overflow-hidden flex flex-col justify-between h-full select-none">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default flex items-center justify-between bg-surface-raised gap-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-800 dark:text-teal-400 shrink-0">
            <Users className="h-4 w-4" />
          </div>
          <h3 className="text-xs sm:text-sm font-bold text-primary tracking-tight">
            Top 10 Customers ({periodLabel})
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <AdminDatePicker currentDate={selectedDate || ''} compact />
          <Link
            href="/dashboard/admin/customers"
            className="text-[11px] font-semibold text-secondary hover:text-primary transition-colors inline-flex items-center gap-0.5 shrink-0"
            title="Open Customer Directory"
          >
            <span>View All</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Table */}
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
                <td colSpan={5} className="px-4 py-8 text-center text-secondary">
                  No customer billing recorded for this date.
                </td>
              </tr>
            ) : (
              topCustomers.slice(0, 10).map((cust, idx) => {
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
                        title={`Open ${cust.customerName} ledger`}
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
  );
}
