'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeftRight, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  Receipt, 
  Landmark, 
  Download, 
  Search, 
  Filter, 
  AlertCircle,
  ChevronLeft,
  Calendar
} from 'lucide-react';
import { formatMoney } from '@/lib/format';
import type { CashFlowData } from '@/lib/actions/admin/cashflow';

interface CashFlowClientProps {
  initialData: CashFlowData;
  currentPeriod: string;
}

export default function CashFlowClient({ initialData, currentPeriod }: CashFlowClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INFLOW' | 'OUTFLOW'>('ALL');

  const {
    period,
    startDate,
    endDate,
    openingBalancePaise,
    isOpeningBalanceVerified,
    totalInflowPaise,
    totalOutflowPaise,
    netMovementPaise,
    closingBalancePaise,
    methodBreakdown,
    transactions,
  } = initialData;

  const handlePeriodChange = (newPeriod: string) => {
    router.push(`/dashboard/admin/cashflow?period=${newPeriod}`);
  };

  // Filter transactions
  const filteredTransactions = transactions.filter((t) => {
    if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.source.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.referenceNo.toLowerCase().includes(q) ||
      t.paymentMethod.toLowerCase().includes(q)
    );
  });

  // Client-side CSV export
  const exportCSV = () => {
    if (filteredTransactions.length === 0) return;
    const headers = ['Date', 'Type', 'Counterparty / Source', 'Category', 'Description', 'Method', 'Reference', 'Amount (INR)'];
    const rows = filteredTransactions.map((t) => [
      `"${t.timestamp}"`,
      `"${t.type}"`,
      `"${t.source.replace(/"/g, '""')}"`,
      `"${t.category.replace(/"/g, '""')}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      `"${t.paymentMethod}"`,
      `"${t.referenceNo}"`,
      (t.type === 'INFLOW' ? t.amountPaise / 100 : -(t.amountPaise / 100)).toFixed(2)
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `alvoun_cashflow_${period}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 animate-fade-in-up select-none pb-8">
      {/* 1. Header with Breadcrumb and Period Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/admin"
            className="h-9 w-9 rounded-xl bg-surface-raised border border-border-default shadow-raised flex items-center justify-center text-primary hover:text-teal-700 transition-colors"
            title="Return to Dashboard"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
                Cash Flow Register
              </h1>
              <span className="text-xs font-bold text-teal-800 dark:text-teal-300 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20">
                Inflow & Outflow
              </span>
            </div>
            <p className="text-xs text-secondary mt-0.5">
              Audited daily collections and company expenses ({startDate} to {endDate})
            </p>
          </div>
        </div>

        {/* Period Filter Tabs */}
        <div className="flex items-center p-1 rounded-2xl bg-surface-inset border border-border-default shadow-inset text-xs overflow-x-auto">
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: '7d', label: '7 Days' },
            { id: '30d', label: '30 Days' },
            { id: 'month', label: 'This Month' },
          ].map((tab) => {
            const isActive = (currentPeriod || 'today') === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handlePeriodChange(tab.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#1A5F63] text-white shadow-raised'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Top Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Opening Balance */}
        <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-secondary font-bold">
            <span className="truncate">Opening Balance</span>
            <span className="text-[10px] bg-amber-500/10 text-amber-700 border border-amber-500/20 px-1.5 py-0.2 rounded ">
              Unverified
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-primary  tabular-nums">
              {formatMoney(openingBalancePaise)}
            </div>
          </div>
          <div className="text-[10px] text-muted truncate border-t border-border-subtle pt-2">
            No opening cashbook ledger
          </div>
        </div>

        {/* Total Inflow (Collections) */}
        <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-secondary font-bold">
            <div className="flex items-center gap-1.5">
              <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />
              <span>Money In (Inflow)</span>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-1.5 py-0.2 rounded ">
              Collections
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400  tabular-nums">
              +{formatMoney(totalInflowPaise)}
            </div>
          </div>
          <div className="text-[10px] text-muted truncate border-t border-border-subtle pt-2">
            Actual customer collections
          </div>
        </div>

        {/* Total Outflow (Expenses) */}
        <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-secondary font-bold">
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className="h-3.5 w-3.5 text-rose-600" />
              <span>Money Out (Outflow)</span>
            </div>
            <span className="text-[10px] bg-rose-500/10 text-rose-700 border border-rose-500/20 px-1.5 py-0.2 rounded ">
              Expenses
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-rose-700 dark:text-rose-400  tabular-nums">
              -{formatMoney(totalOutflowPaise)}
            </div>
          </div>
          <div className="text-[10px] text-muted truncate border-t border-border-subtle pt-2">
            Voucher payouts & operational costs
          </div>
        </div>

        {/* Net Movement */}
        <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-secondary font-bold">
            <div className="flex items-center gap-1.5">
              <ArrowLeftRight className="h-3.5 w-3.5 text-teal-700" />
              <span>Net Movement</span>
            </div>
            <span className="text-[10px] bg-teal-500/10 text-teal-700 border border-teal-500/20 px-1.5 py-0.2 rounded ">
              In − Out
            </span>
          </div>
          <div className="my-2">
            <div className={`text-2xl font-black  tabular-nums ${
              netMovementPaise >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
            }`}>
              {netMovementPaise > 0 ? '+' : ''}{formatMoney(netMovementPaise)}
            </div>
          </div>
          <div className="text-[10px] text-muted truncate border-t border-border-subtle pt-2">
            Period cash flow result
          </div>
        </div>

        {/* Closing Balance */}
        <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-secondary font-bold">
            <div className="flex items-center gap-1.5">
              <Landmark className="h-3.5 w-3.5 text-primary" />
              <span>Closing Balance</span>
            </div>
            <span className="text-[10px] bg-surface-inset border border-border-default px-1.5 py-0.2 rounded  text-muted">
              Net
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-primary  tabular-nums">
              {formatMoney(closingBalancePaise)}
            </div>
          </div>
          <div className="text-[10px] text-muted truncate border-t border-border-subtle pt-2">
            Opening + Net Movement
          </div>
        </div>
      </div>

      {/* 3. Payment Method Breakdown Cards */}
      <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-4">
        <h3 className="text-xs font-bold text-primary tracking-tight mb-3">
          Payment Method Liquidity
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {methodBreakdown.map((m) => (
            <div
              key={m.method}
              className="bg-surface-inset border border-border-default rounded-xl p-3 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary">{m.method}</span>
                <span className={`text-[10px]  font-bold ${
                  m.netPaise >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  {m.netPaise > 0 ? '+' : ''}{formatMoney(m.netPaise)}
                </span>
              </div>
              <div className="mt-2 text-[10px] space-y-0.5 text-secondary">
                <div className="flex justify-between">
                  <span>In:</span>
                  <span className=" text-emerald-700 font-semibold">+{formatMoney(m.inflowPaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Out:</span>
                  <span className=" text-rose-700 font-semibold">-{formatMoney(m.outflowPaise)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Cash Flow Transactions Register */}
      <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl overflow-hidden">
        {/* Table Controls */}
        <div className="p-3.5 border-b border-border-default flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-raised">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search counterparty, description, ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-surface-inset border border-border-default focus:outline-none focus:border-teal-600 transition-colors"
              />
            </div>
            {/* Type Filter */}
            <div className="flex items-center p-0.5 rounded-xl bg-surface-inset border border-border-default text-xs">
              {(['ALL', 'INFLOW', 'OUTFLOW'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    typeFilter === t
                      ? 'bg-[#1A5F63] text-white shadow-xs'
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={exportCSV}
              disabled={filteredTransactions.length === 0}
              className="text-xs font-bold text-primary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-raised border border-border-default shadow-raised hover:bg-surface-inset disabled:opacity-40 transition-all cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-teal-700" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-surface-inset text-secondary font-bold uppercase tracking-wider text-[9px] border-b border-border-default">
              <tr>
                <th className="px-4 py-2.5">Date & Time</th>
                <th className="px-3 py-2.5">Flow</th>
                <th className="px-3 py-2.5">Source / Counterparty</th>
                <th className="px-3 py-2.5">Category & Description</th>
                <th className="px-3 py-2.5">Method</th>
                <th className="px-3 py-2.5">Reference</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-[11px]">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-secondary">
                    <div className="max-w-xs mx-auto space-y-1">
                      <AlertCircle className="h-6 w-6 text-muted mx-auto mb-1 opacity-60" />
                      <div className="font-bold text-primary">No Cash Flow Transactions Found</div>
                      <div className="text-[11px] text-muted">
                        No payments or expenses recorded for {period} ({startDate} to {endDate}).
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-surface-inset/60 transition-colors">
                    <td className="px-4 py-2.5  text-[10px] text-muted whitespace-nowrap">
                      {tx.timestamp}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                        tx.type === 'INFLOW'
                          ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-700 border-rose-500/20'
                      }`}>
                        {tx.type === 'INFLOW' ? <ArrowDownLeft className="h-2.5 w-2.5" /> : <ArrowUpRight className="h-2.5 w-2.5" />}
                        <span>{tx.type}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-bold text-primary">
                      {tx.entityLink ? (
                        <Link href={tx.entityLink} className="hover:text-teal-700 hover:underline">
                          {tx.source}
                        </Link>
                      ) : (
                        tx.source
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-primary">{tx.category}</div>
                      <div className="text-[10px] text-muted truncate max-w-[200px]">{tx.description}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px]  font-semibold text-secondary bg-surface-inset border border-border-default px-1.5 py-0.5 rounded">
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td className="px-3 py-2.5  text-[10px] text-muted">
                      {tx.referenceNo}
                    </td>
                    <td className={`px-4 py-2.5 text-right  font-bold text-xs whitespace-nowrap ${
                      tx.type === 'INFLOW' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                    }`}>
                      {tx.type === 'INFLOW' ? '+' : '-'}{formatMoney(tx.amountPaise)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
