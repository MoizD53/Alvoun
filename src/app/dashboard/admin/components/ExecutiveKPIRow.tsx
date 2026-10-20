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

export default function ExecutiveKPIRow({ 
  trends, 
  dispatches,
  isToday = true,
  selectedDate
}: ExecutiveKPIRowProps) {
  const salesHistory = trends.points.map(p => p.salesPaise);
  const collectionsHistory = trends.points.map(p => p.collectionsPaise);
  const volumeHistory = trends.points.map(p => p.salesPaise);

  const comparisonPeriod = isToday ? 'vs. yesterday' : 'vs. prev day';

  const renderDelta = (percent: number, comparisonText: string = comparisonPeriod) => {
    if (percent > 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-success">
          <ArrowUpRight className="h-3.5 w-3.5" />
          <span>+{percent}%</span>
          <span className="text-muted font-normal ml-0.5">{comparisonText}</span>
        </span>
      );
    }
    if (percent < 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-danger">
          <ArrowDownRight className="h-3.5 w-3.5" />
          <span>{percent}%</span>
          <span className="text-muted font-normal ml-0.5">{comparisonText}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-muted">
        <Minus className="h-3 w-3" />
        <span>0%</span>
        <span className="font-normal ml-0.5">{comparisonText}</span>
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
      {/* 1. NET SALES */}
      <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-hover group select-none">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-700 dark:text-teal-400 shrink-0">
              <Droplets className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-secondary truncate block">
                Net Sales ({isToday ? 'Today' : selectedDate})
              </span>
            </div>
          </div>
          <Link
            href="/dashboard/admin/reports/daily"
            className="text-[10px] font-semibold text-secondary hover:text-primary inline-flex items-center gap-0.5 bg-surface-inset border border-border-default shadow-inset px-2 py-0.5 rounded-lg transition-colors shrink-0"
            title="Open Daily Sales Register"
          >
            <span>Register</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Value */}
        <div className="mt-2 mb-1">
          <div className="text-2xl sm:text-[26px] font-black text-primary tracking-tight font-sans">
            {formatMoney(trends.todaySalesPaise)}
          </div>
        </div>

        {/* Bottom: Delta Comparison + Sparkline */}
        <div className="flex items-center justify-between pt-2 border-t border-border-subtle/80 text-xs">
          <div>{renderDelta(trends.salesChangePercent)}</div>
          <div className="shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
            <MiniSparkline
              data={salesHistory}
              color="#1A5F63"
              fillColor="#1A5F63"
              height={20}
              width={55}
            />
          </div>
        </div>
      </div>

      {/* 2. COLLECTIONS */}
      <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-hover group select-none">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-700 dark:text-teal-400 shrink-0">
              <Wallet className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-secondary truncate block">
                Collections ({isToday ? 'Today' : selectedDate})
              </span>
            </div>
          </div>
          <Link
            href="/dashboard/admin/reports/daily"
            className="text-[10px] font-semibold text-secondary hover:text-primary inline-flex items-center gap-0.5 bg-surface-inset border border-border-default shadow-inset px-2 py-0.5 rounded-lg transition-colors shrink-0"
            title="Open Collections & Daily Register"
          >
            <span>Vouchers</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="mt-2 mb-1">
          <div className="text-2xl sm:text-[26px] font-black text-primary tracking-tight font-sans">
            {formatMoney(trends.todayCollectionsPaise)}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border-subtle/80 text-xs">
          <div>{renderDelta(trends.collectionsChangePercent)}</div>
          <div className="shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
            <MiniSparkline
              data={collectionsHistory}
              color="#2E7D32"
              fillColor="#2E7D32"
              height={20}
              width={55}
            />
          </div>
        </div>
      </div>

      {/* 3. OUTSTANDING RECEIVABLES */}
      <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-hover group select-none">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
              <CreditCard className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-secondary truncate block">
                Outstanding Receivables
              </span>
            </div>
          </div>
          <Link
            href="/dashboard/admin/reports/outstanding"
            className="text-[10px] font-semibold text-secondary hover:text-primary inline-flex items-center gap-0.5 bg-surface-inset border border-border-default shadow-inset px-2 py-0.5 rounded-lg transition-colors shrink-0"
            title="Open Outstanding Market Dues & Ledgers"
          >
            <span>Ledgers</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="mt-2 mb-1">
          <div className="text-2xl sm:text-[26px] font-black text-primary tracking-tight font-sans">
            {formatMoney(trends.totalMarketDuesPaise)}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border-subtle/80 text-xs">
          <span className="text-[11px] font-medium text-secondary truncate">
            Across Market Base
          </span>
          <span className="text-[10px] text-muted font-mono">Total Debt</span>
        </div>
      </div>

      {/* 4. DISPATCHES / CLOSING VALUE */}
      <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-hover group select-none">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-700 dark:text-teal-400 shrink-0">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-secondary truncate block">
                Dispatches ({isToday ? 'Today' : selectedDate})
              </span>
            </div>
          </div>
          <Link
            href="/dashboard/admin/reports/products"
            className="text-[10px] font-semibold text-secondary hover:text-primary inline-flex items-center gap-0.5 bg-surface-inset border border-border-default shadow-inset px-2 py-0.5 rounded-lg transition-colors shrink-0"
            title="Open Products & Inventory"
          >
            <span>Products</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="mt-2 mb-1 flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-[26px] font-black text-primary tracking-tight font-sans">
            {formatNumber(dispatches.totalLitres)}
          </span>
          <span className="text-xs font-bold text-secondary">Ltr Volume</span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border-subtle/80 text-xs">
          <div>{renderDelta(trends.dispatchedLitresChangePercent)}</div>
          <span className="text-[10px] text-muted font-mono">
            {dispatches.totalCrates} Crates
          </span>
        </div>
      </div>
    </div>
  );
}
