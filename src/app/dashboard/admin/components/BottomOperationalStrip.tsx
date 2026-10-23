'use client';

import React from 'react';
import Link from 'next/link';
import { Users, Route, ChevronRight } from 'lucide-react';
import MiniSparkline from './MiniSparkline';
import type { SalesTrendsData } from '@/lib/dashboard-data';

interface BottomOperationalStripProps {
  activeCustomersCount: number;
  totalCustomersCount: number;
  activeAreasCount: number;
  activeRoutesCount: number;
  trends?: SalesTrendsData;
}

export default function BottomOperationalStrip({
  activeCustomersCount,
  totalCustomersCount,
  activeAreasCount,
  activeRoutesCount,
  trends
}: BottomOperationalStripProps) {
  const visitsHistory = trends?.points?.map(p => p.visitsCount) || [0, 0, 0, 0, 0, 0, 0];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 h-full select-none">
      {/* 1. DAHOD ACTIVE CUSTOMERS */}
      <Link
        href="/dashboard/admin/customers"
        className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-4 flex flex-col justify-between hover:shadow-hover transition-all duration-200 group cursor-pointer"
        title="Open Dahod Customer Directory"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-800 dark:text-teal-400 shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-primary group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                Today&apos;s Active Customers
              </span>
              <span className="text-[10px] text-muted block">
                Dahod Customer Master
              </span>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </div>

        <div className="my-2.5">
          <div className="text-2xl sm:text-3xl font-black text-primary  tabular-nums tracking-tight">
            <span>{activeCustomersCount}</span>
            <span className="text-sm sm:text-base font-bold text-secondary font-sans ml-1.5">
              / {totalCustomersCount} Total
            </span>
          </div>
        </div>

        {/* Visual Dots / Sparkline matching sketch */}
        <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-700 dark:text-emerald-400 font-bold  text-[10px]">
              100% Active Outlets
            </span>
          </div>
          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
            {[1, 2, 3, 4, 5, 6, 7].map((dot) => (
              <span 
                key={dot} 
                className="h-1.5 w-1.5 rounded-full bg-teal-700 dark:bg-teal-400" 
              />
            ))}
          </div>
        </div>
      </Link>

      {/* 2. ACTIVE AREAS */}
      <Link
        href="/dashboard/admin/routes"
        className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-4 flex flex-col justify-between hover:shadow-hover transition-all duration-200 group cursor-pointer"
        title="Open Territory & Route Network"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-800 dark:text-teal-400 shrink-0">
              <Route className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-primary group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                Active Areas
              </span>
              <span className="text-[10px] text-muted block">
                Dahod Distribution Network
              </span>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </div>

        <div className="my-2.5">
          <div className="text-2xl sm:text-3xl font-black text-primary  tabular-nums tracking-tight">
            <span>{activeAreasCount}</span>
            <span className="text-sm sm:text-base font-bold text-secondary font-sans ml-1.5">
              Active Areas
            </span>
          </div>
        </div>

        {/* Visual Dots / Sparkline matching sketch */}
        <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-[11px]">
          <span className="text-secondary font-medium">
            Across {activeRoutesCount} Delivery Routes
          </span>
          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
            {[1, 2, 3, 4, 5, 6, 7].map((dot) => (
              <span 
                key={dot} 
                className="h-1.5 w-1.5 rounded-full bg-teal-700 dark:bg-teal-400" 
              />
            ))}
          </div>
        </div>
      </Link>
    </div>
  );
}
