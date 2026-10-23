'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus,
  ChevronRight
} from 'lucide-react';
import MiniSparkline from './MiniSparkline';
import { formatMoney, formatNumber } from '@/lib/format';
import type { 
  SalesTrendsData, 
  ExpenseSummary, 
  ProductionSummary, 
  PurchaseSummary,
  StockSummary, 
  CashFlowSummary 
} from '@/lib/dashboard-data';

interface ExecutiveKPIRowProps {
  trends: SalesTrendsData;
  expenses?: ExpenseSummary;
  production?: ProductionSummary;
  purchase?: PurchaseSummary;
  stock?: StockSummary;
  cashFlow?: CashFlowSummary;
  isToday?: boolean;
  selectedDate?: string;
}

// 3D-Embossed Tactile Pill Button with Micro-Motion on Hover
const embossedViewButtonClass = 
  "group/btn text-[11px] font-bold text-primary inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full " +
  "bg-surface-raised border border-border-default " +
  "shadow-[1.5px_1.5px_4px_rgba(53,41,31,0.12),-1.5px_-1.5px_4px_rgba(255,255,255,0.95)] " +
  "hover:shadow-[2px_2px_6px_rgba(53,41,31,0.18),-2px_-2px_5px_rgba(255,255,255,1)] " +
  "hover:-translate-y-0.5 hover:text-teal-800 dark:hover:text-teal-300 hover:border-teal-700/40 " +
  "active:translate-y-0.5 active:shadow-[inset_1.5px_1.5px_3px_rgba(53,41,31,0.15),inset_-1px_-1px_2px_rgba(255,255,255,0.85)] " +
  "transition-all duration-200 ease-out cursor-pointer shrink-0 select-none";

export default function ExecutiveKPIRow({ 
  trends, 
  expenses,
  production,
  purchase,
  stock,
  cashFlow,
  isToday = true,
  selectedDate
}: ExecutiveKPIRowProps) {
  const salesHistory = trends?.points?.map(p => p.salesPaise) || [];
  const collectionsHistory = trends?.points?.map(p => p.collectionsPaise) || [];

  // Replace 'vs yest' with 'vs yesterday' as requested
  const comparisonPeriod = isToday ? 'vs yesterday' : 'vs yesterday';

  const renderDelta = (percent: number) => {
    if (percent > 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs font-bold text-success">
          <ArrowUpRight className="h-3.5 w-3.5" />
          <span>+{percent}%</span>
          <span className="text-secondary font-medium ml-0.5 text-[10px]">{comparisonPeriod}</span>
        </span>
      );
    }
    if (percent < 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs font-bold text-danger">
          <ArrowDownRight className="h-3.5 w-3.5" />
          <span>{percent}%</span>
          <span className="text-secondary font-medium ml-0.5 text-[10px]">{comparisonPeriod}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-secondary">
        <Minus className="h-3 w-3" />
        <span>0%</span>
        <span className="font-medium ml-0.5 text-[10px]">{comparisonPeriod}</span>
      </span>
    );
  };

  const periodLabel = isToday ? 'Today' : selectedDate || 'Selected';
  const dateQuery = selectedDate ? `?date=${encodeURIComponent(selectedDate)}` : '';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-4">
      {/* 1. PURCHASE (Authoritative Supplier Purchases & Inward Raw Materials) */}
      <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-200 hover:shadow-hover group select-none min-h-[148px]">
        <div className="flex items-center justify-between gap-1.5">
          <div className="min-w-0">
            <span className="text-xs font-bold text-primary truncate block tracking-tight">
              Purchase
            </span>
          </div>
          <Link
            href={`/dashboard/admin/purchases${selectedDate ? `?startDate=${encodeURIComponent(selectedDate)}&endDate=${encodeURIComponent(selectedDate)}` : ''}`}
            className={embossedViewButtonClass}
            title="Open Purchases & Procurement Workspace"
          >
            <span>View</span>
            <ChevronRight className="h-3 w-3 text-secondary group-hover/btn:text-teal-800 dark:group-hover/btn:text-teal-300 group-hover/btn:translate-x-0.5 transition-all duration-200" />
          </Link>
        </div>

        <div className="my-2">
          <div className="text-2xl sm:text-[26px] font-black text-primary tracking-tight font-sans tabular-nums leading-none">
            {formatNumber(purchase?.todayQuantity ?? 0)} <span className="text-base font-semibold text-secondary font-sans">Units</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border-subtle text-[11px]">
          <span className="text-secondary truncate">
            {purchase?.purchasesCount ? `${purchase.purchasesCount} Purchases` : '0 Purchases'}
          </span>
          <span className="text-muted font-bold tracking-tight">
            {formatMoney(purchase?.todayTotalAmountPaise ?? 0)}
          </span>
        </div>
      </div>

      {/* 2. SALES */}
      <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-200 hover:shadow-hover group select-none min-h-[148px]">
        <div className="flex items-center justify-between gap-1.5">
          <div className="min-w-0">
            <span className="text-xs font-bold text-primary truncate block tracking-tight">
              Sales
            </span>
          </div>
          <Link
            href={`/dashboard/admin/reports/daily${dateQuery}`}
            className={embossedViewButtonClass}
            title="Open Daily Sales Register"
          >
            <span>View</span>
            <ChevronRight className="h-3 w-3 text-secondary group-hover/btn:text-teal-800 dark:group-hover/btn:text-teal-300 group-hover/btn:translate-x-0.5 transition-all duration-200" />
          </Link>
        </div>

        <div className="my-2">
          <div className="text-2xl sm:text-[26px] font-black text-primary tracking-tight font-sans tabular-nums leading-none">
            {formatMoney(trends?.todaySalesPaise ?? 0)}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border-subtle text-xs">
          <div>{renderDelta(trends?.salesChangePercent ?? 0)}</div>
          <div className="shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
            <MiniSparkline
              data={salesHistory}
              color="#1A5F63"
              fillColor="#1A5F63"
              height={18}
              width={52}
            />
          </div>
        </div>
      </div>

      {/* 3. COLLECTIONS */}
      <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-200 hover:shadow-hover group select-none min-h-[148px]">
        <div className="flex items-center justify-between gap-1.5">
          <div className="min-w-0">
            <span className="text-xs font-bold text-primary truncate block tracking-tight">
              Collections
            </span>
          </div>
          <Link
            href={`/dashboard/admin/reports/daily${dateQuery}`}
            className={embossedViewButtonClass}
            title="Open Collections Register"
          >
            <span>View</span>
            <ChevronRight className="h-3 w-3 text-secondary group-hover/btn:text-teal-800 dark:group-hover/btn:text-teal-300 group-hover/btn:translate-x-0.5 transition-all duration-200" />
          </Link>
        </div>

        <div className="my-2">
          <div className="text-2xl sm:text-[26px] font-black text-primary tracking-tight font-sans tabular-nums leading-none">
            {formatMoney(trends?.todayCollectionsPaise ?? 0)}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border-subtle text-xs">
          <div>{renderDelta(trends?.collectionsChangePercent ?? 0)}</div>
          <div className="shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
            <MiniSparkline
              data={collectionsHistory}
              color="#2E7D32"
              fillColor="#2E7D32"
              height={18}
              width={52}
            />
          </div>
        </div>
      </div>

      {/* 4. CASH FLOW */}
      <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-200 hover:shadow-hover group select-none min-h-[148px]">
        <div className="flex items-center justify-between gap-1.5">
          <div className="min-w-0">
            <span className="text-xs font-bold text-primary truncate block tracking-tight">
              Cash Flow
            </span>
          </div>
          <Link
            href={`/dashboard/admin/cashflow${dateQuery}`}
            className={embossedViewButtonClass}
            title="Open Dedicated Cash Flow Register"
          >
            <span>View</span>
            <ChevronRight className="h-3 w-3 text-secondary group-hover/btn:text-teal-800 dark:group-hover/btn:text-teal-300 group-hover/btn:translate-x-0.5 transition-all duration-200" />
          </Link>
        </div>

        <div className="my-2">
          <div className={`text-2xl sm:text-[26px] font-black tracking-tight font-sans tabular-nums leading-none ${
            (cashFlow?.netPaise ?? 0) >= 0 
              ? 'text-emerald-700 dark:text-emerald-400' 
              : 'text-rose-700 dark:text-rose-400'
          }`}>
            {(cashFlow?.netPaise ?? 0) > 0 ? '+' : ''}
            {formatMoney(cashFlow?.netPaise ?? 0)}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border-subtle text-[11px]">
          <span className="text-secondary font-medium">
            In: {formatMoney(cashFlow?.inflowPaise ?? 0)}
          </span>
          <span className="text-secondary font-medium">
            Out: {formatMoney(cashFlow?.outflowPaise ?? 0)}
          </span>
        </div>
      </div>

      {/* 5. EXPENSES */}
      <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-200 hover:shadow-hover group select-none min-h-[148px]">
        <div className="flex items-center justify-between gap-1.5">
          <div className="min-w-0">
            <span className="text-xs font-bold text-primary truncate block tracking-tight">
              Expenses
            </span>
          </div>
          <Link
            href={`/dashboard/admin/expenses${dateQuery}`}
            className={embossedViewButtonClass}
            title="Open Company Expenses"
          >
            <span>View</span>
            <ChevronRight className="h-3 w-3 text-secondary group-hover/btn:text-teal-800 dark:group-hover/btn:text-teal-300 group-hover/btn:translate-x-0.5 transition-all duration-200" />
          </Link>
        </div>

        <div className="my-2">
          <div className="text-2xl sm:text-[26px] font-black text-primary tracking-tight font-sans tabular-nums leading-none">
            {formatMoney(expenses?.todayExpensesPaise ?? 0)}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border-subtle text-[11px]">
          <span className="text-secondary truncate">
            {expenses?.expensesCount ? `${expenses.expensesCount} Vouchers` : '0 Vouchers'}
          </span>
          <span className="text-muted font-bold tracking-tight">
            {expenses?.monthExpensesPaise ? `MTD: ${formatMoney(expenses.monthExpensesPaise)}` : 'MTD: ₹0'}
          </span>
        </div>
      </div>

      {/* 6. STOCK OVERVIEW */}
      <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-200 hover:shadow-hover group select-none min-h-[148px]">
        <div className="flex items-center justify-between gap-1.5">
          <div className="min-w-0">
            <span className="text-xs font-bold text-primary truncate block tracking-tight">
              Stock Overview
            </span>
          </div>
          <Link
            href={`/dashboard/admin/stock${dateQuery}`}
            className={embossedViewButtonClass}
            title="Open Stock & Raw Materials"
          >
            <span>View</span>
            <ChevronRight className="h-3 w-3 text-secondary group-hover/btn:text-teal-800 dark:group-hover/btn:text-teal-300 group-hover/btn:translate-x-0.5 transition-all duration-200" />
          </Link>
        </div>

        <div className="my-2">
          <div className="text-2xl sm:text-[26px] font-black text-primary tracking-tight font-sans tabular-nums leading-none">
            {formatNumber(stock?.totalAvailableCrates ?? 0)} <span className="text-base font-semibold text-secondary font-sans">PKGs</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border-subtle text-[11px]">
          <span className="text-secondary truncate">
            Finished Goods
          </span>
          <span className="text-muted font-bold tracking-tight">
            {formatNumber(stock?.totalAvailableLitres ?? 0)} L
          </span>
        </div>
      </div>
    </div>
  );
}
