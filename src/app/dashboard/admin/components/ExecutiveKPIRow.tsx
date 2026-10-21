'use client';

import React from 'react';
import Link from 'next/link';
import { 
  TrendingUp, 
  Wallet, 
  CreditCard, 
  Droplets, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus,
  ChevronRight
} from 'lucide-react';
import MiniSparkline from './MiniSparkline';
import { formatMoney, formatNumber } from '@/lib/format';
import type { SalesTrendsData, DispatchSummary } from '@/lib/dashboard-data';

interface ExecutiveKPIRowProps {
  trends: SalesTrendsData;
  dispatches: DispatchSummary;
  isToday?: boolean;
  selectedDate?: string;
}

// 3D-Embossed Tactile Pill Button with Micro-Motion on Hover
const embossedViewButtonClass = 
  "group/btn text-xs font-black text-primary inline-flex items-center gap-1.5 px-3 py-1 rounded-full " +
  "bg-surface-raised border border-border-default " +
  "shadow-[2px_2px_5px_rgba(53,41,31,0.14),-2px_-2px_5px_rgba(255,255,255,0.95)] " +
  "hover:shadow-[3px_3px_9px_rgba(53,41,31,0.22),-2.5px_-2.5px_7px_rgba(255,255,255,1)] " +
  "hover:-translate-y-0.5 hover:text-teal-800 dark:hover:text-teal-300 hover:border-teal-700/40 " +
  "active:translate-y-0.5 active:shadow-[inset_2px_2px_4px_rgba(53,41,31,0.18),inset_-1.5px_-1.5px_3px_rgba(255,255,255,0.85)] " +
  "transition-all duration-200 ease-out cursor-pointer shrink-0 select-none";

export default function ExecutiveKPIRow({ 
  trends, 
  dispatches,
  isToday = true,
  selectedDate
}: ExecutiveKPIRowProps) {
  const salesHistory = trends?.points?.map(p => p.salesPaise) || [];
  const collectionsHistory = trends?.points?.map(p => p.collectionsPaise) || [];

  const comparisonPeriod = isToday ? 'vs. yesterday' : 'vs. prev day';

  const renderDelta = (percent: number, comparisonText: string = comparisonPeriod) => {
    if (percent > 0) {
      return (
        <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-success">
          <ArrowUpRight className="h-4 w-4" />
          <span>+{percent}%</span>
          <span className="text-secondary font-medium ml-0.5">{comparisonText}</span>
        </span>
      );
    }
    if (percent < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-danger">
          <ArrowDownRight className="h-4 w-4" />
          <span>{percent}%</span>
          <span className="text-secondary font-medium ml-0.5">{comparisonText}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-secondary">
        <Minus className="h-3.5 w-3.5" />
        <span>0%</span>
        <span className="font-medium ml-0.5">{comparisonText}</span>
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
      {/* 1. SALES (Distance-Readable 32-40px Primary) */}
      <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-hover group select-none">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-700 dark:text-teal-400 shrink-0">
              <Droplets className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-sm sm:text-base font-bold text-primary truncate block tracking-tight">
                Sales ({isToday ? 'Today' : selectedDate})
              </span>
            </div>
          </div>
          <Link
            href="/dashboard/admin/reports/daily"
            className={embossedViewButtonClass}
            title="Open Daily Sales Register"
          >
            <span>View</span>
            <ChevronRight className="h-3.5 w-3.5 text-secondary group-hover/btn:text-teal-800 dark:group-hover/btn:text-teal-300 group-hover/btn:translate-x-0.5 transition-all duration-200" />
          </Link>
        </div>

        {/* Distance-Readable Value (32-40px) */}
        <div className="mt-3 mb-2">
          <div className="text-3xl sm:text-[34px] lg:text-[38px] font-black text-primary tracking-tight font-sans tabular-nums leading-none">
            {formatMoney(trends?.todaySalesPaise ?? 0)}
          </div>
        </div>

        {/* Bottom: Delta Comparison + Sparkline */}
        <div className="flex items-center justify-between pt-3 border-t border-border-subtle text-xs sm:text-sm">
          <div>{renderDelta(trends?.salesChangePercent ?? 0)}</div>
          <div className="shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
            <MiniSparkline
              data={salesHistory}
              color="#1A5F63"
              fillColor="#1A5F63"
              height={22}
              width={60}
            />
          </div>
        </div>
      </div>

      {/* 2. COLLECTIONS (Distance-Readable 32-40px) */}
      <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-hover group select-none">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-700 dark:text-teal-400 shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-sm sm:text-base font-bold text-primary truncate block tracking-tight">
                Collections ({isToday ? 'Today' : selectedDate})
              </span>
            </div>
          </div>
          <Link
            href="/dashboard/admin/reports/daily"
            className={embossedViewButtonClass}
            title="Open Collections & Daily Register"
          >
            <span>View</span>
            <ChevronRight className="h-3.5 w-3.5 text-secondary group-hover/btn:text-teal-800 dark:group-hover/btn:text-teal-300 group-hover/btn:translate-x-0.5 transition-all duration-200" />
          </Link>
        </div>

        <div className="mt-3 mb-2">
          <div className="text-3xl sm:text-[34px] lg:text-[38px] font-black text-primary tracking-tight font-sans tabular-nums leading-none">
            {formatMoney(trends?.todayCollectionsPaise ?? 0)}
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border-subtle text-xs sm:text-sm">
          <div>{renderDelta(trends?.collectionsChangePercent ?? 0)}</div>
          <div className="shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
            <MiniSparkline
              data={collectionsHistory}
              color="#2E7D32"
              fillColor="#2E7D32"
              height={22}
              width={60}
            />
          </div>
        </div>
      </div>

      {/* 3. OUTSTANDING RECEIVABLES (Distance-Readable 32-40px) */}
      <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-hover group select-none">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-sm sm:text-base font-bold text-primary truncate block tracking-tight">
                Outstanding Receivables
              </span>
            </div>
          </div>
          <Link
            href="/dashboard/admin/reports/outstanding"
            className={embossedViewButtonClass}
            title="Open Outstanding Market Dues & Ledgers"
          >
            <span>View</span>
            <ChevronRight className="h-3.5 w-3.5 text-secondary group-hover/btn:text-teal-800 dark:group-hover/btn:text-teal-300 group-hover/btn:translate-x-0.5 transition-all duration-200" />
          </Link>
        </div>

        <div className="mt-3 mb-2">
          <div className="text-3xl sm:text-[34px] lg:text-[38px] font-black text-primary tracking-tight font-sans tabular-nums leading-none">
            {formatMoney(trends?.totalMarketDuesPaise ?? 0)}
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border-subtle text-xs sm:text-sm">
          <span className="text-xs sm:text-sm font-semibold text-secondary truncate">
            Across Market Base
          </span>
          <span className="text-xs sm:text-sm font-extrabold text-muted font-mono tracking-wide">
            Total Dues
          </span>
        </div>
      </div>

      {/* 4. DISPATCHES / CLOSING VALUE (Distance-Readable 32-40px) */}
      <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-hover group select-none">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-700 dark:text-teal-400 shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-sm sm:text-base font-bold text-primary truncate block tracking-tight">
                Dispatches ({isToday ? 'Today' : selectedDate})
              </span>
            </div>
          </div>
          <Link
            href="/dashboard/admin/reports/products"
            className={embossedViewButtonClass}
            title="Open Products & Inventory"
          >
            <span>View</span>
            <ChevronRight className="h-3.5 w-3.5 text-secondary group-hover/btn:text-teal-800 dark:group-hover/btn:text-teal-300 group-hover/btn:translate-x-0.5 transition-all duration-200" />
          </Link>
        </div>

        <div className="mt-3 mb-2 flex items-baseline gap-2">
          <span className="text-3xl sm:text-[34px] lg:text-[38px] font-black text-primary tracking-tight font-sans tabular-nums leading-none">
            {formatNumber(dispatches?.totalLitres ?? 0)}
          </span>
          <span className="text-sm sm:text-base font-bold text-secondary">Ltr Volume</span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border-subtle text-xs sm:text-sm">
          <div>{renderDelta(trends?.dispatchedLitresChangePercent ?? 0)}</div>
          <span className="text-xs sm:text-sm font-extrabold text-muted font-mono tracking-wide">
            {dispatches?.totalCrates ?? 0} PKG
          </span>
        </div>
      </div>
    </div>
  );
}
