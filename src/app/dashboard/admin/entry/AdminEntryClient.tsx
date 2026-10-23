'use client';

import React, { useState, useMemo, useTransition, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Save, 
  RotateCcw, 
  Search, 
  Filter, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Store, 
  ExternalLink,
  ChevronDown,
  Layers,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatMoney, formatNumber } from '@/lib/format';
import AdminDatePicker from '../components/AdminDatePicker';
import { saveAdminEntryBatch } from '@/lib/actions/admin/admin-entry';

interface CustomerRowData {
  id: string;
  customerName: string;
  firmName?: string | null;
  code?: string | null;
  contact: string;
  address: string;
  routeName: string;
  areaName: string;
  salesmanId?: string | null;
  currentOutstandingPaise: number;
  previousDuePaise: number;
  rate1LPaise: number;
  rate500mlPaise: number;
  rate250mlPaise: number;
  hasCustom1L: boolean;
  hasCustom500ml: boolean;
  hasCustom250ml: boolean;
  savedPkg1L: number;
  savedPkg500ml: number;
  savedPkg250ml: number;
  savedReceivedRupees: number;
  savedRemarks: string;
  existingSaleIds: string[];
  existingPaymentIds: string[];
}

interface AdminEntryClientProps {
  initialData: {
    targetDate: string;
    customers: CustomerRowData[];
    prod1LId: string;
    prod500mlId: string;
    prod250mlId: string;
    prod1LRatePaise: number;
    prod500mlRatePaise: number;
    prod250mlRatePaise: number;
    daySummary: {
      totalSalesPaise: number;
      totalReceivedPaise: number;
      netDuePaise: number;
      totalPKGs: number;
      accountsCount: number;
      totalCustomersCount: number;
    };
  };
  selectedDate: string;
}

interface RowState {
  pkg1L: number;
  pkg500ml: number;
  pkg250ml: number;
  receivedAmount: string;
  remarks: string;
  isModified: boolean;
}

export default function AdminEntryClient({ initialData, selectedDate }: AdminEntryClientProps) {
  const [isPending, startTransition] = useTransition();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('ALL');
  const [showModifiedOnly, setShowModifiedOnly] = useState(false);

  // Status feedback
  const [isSaving, setIsSaving] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Table rows editable state dictionary: customerId -> RowState
  const [rowsState, setRowsState] = useState<Record<string, RowState>>(() => {
    const initialMap: Record<string, RowState> = {};
    initialData.customers.forEach((c) => {
      initialMap[c.id] = {
        pkg1L: c.savedPkg1L || 0,
        pkg500ml: c.savedPkg500ml || 0,
        pkg250ml: c.savedPkg250ml || 0,
        receivedAmount: c.savedReceivedRupees > 0 ? String(c.savedReceivedRupees) : '',
        remarks: c.savedRemarks || '',
        isModified: false,
      };
    });
    return initialMap;
  });

  // Reset row state when switching dates
  useEffect(() => {
    const initialMap: Record<string, RowState> = {};
    initialData.customers.forEach((c) => {
      initialMap[c.id] = {
        pkg1L: c.savedPkg1L || 0,
        pkg500ml: c.savedPkg500ml || 0,
        pkg250ml: c.savedPkg250ml || 0,
        receivedAmount: c.savedReceivedRupees > 0 ? String(c.savedReceivedRupees) : '',
        remarks: c.savedRemarks || '',
        isModified: false,
      };
    });
    setRowsState(initialMap);
    setSuccessBanner(null);
    setErrorBanner(null);
  }, [initialData.targetDate, initialData.customers]);

  // Unique route list for filter
  const routeOptions = useMemo(() => {
    const set = new Set<string>();
    initialData.customers.forEach((c) => {
      if (c.routeName) set.add(c.routeName);
    });
    return Array.from(set).sort();
  }, [initialData.customers]);

  // Handle cell changes
  const handleCellChange = useCallback((customerId: string, field: keyof RowState, value: any) => {
    setRowsState((prev) => {
      const current = prev[customerId] || {
        pkg1L: 0,
        pkg500ml: 0,
        pkg250ml: 0,
        receivedAmount: '',
        remarks: '',
        isModified: false,
      };

      const updated = {
        ...current,
        [field]: value,
        isModified: true,
      };

      return {
        ...prev,
        [customerId]: updated,
      };
    });
    setSuccessBanner(null);
  }, []);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return initialData.customers.filter((c) => {
      const row = rowsState[c.id];
      if (showModifiedOnly && !row?.isModified && !(row && (row.pkg1L > 0 || row.pkg500ml > 0 || row.pkg250ml > 0 || Number(row.receivedAmount) > 0))) {
        return false;
      }
      if (selectedRoute !== 'ALL' && c.routeName !== selectedRoute) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = c.customerName.toLowerCase().includes(q);
        const matchesCode = c.code ? c.code.toLowerCase().includes(q) : false;
        const matchesFirm = c.firmName ? c.firmName.toLowerCase().includes(q) : false;
        const matchesArea = c.areaName.toLowerCase().includes(q);
        const matchesRoute = c.routeName.toLowerCase().includes(q);
        return matchesName || matchesCode || matchesFirm || matchesArea || matchesRoute;
      }
      return true;
    });
  }, [initialData.customers, rowsState, showModifiedOnly, selectedRoute, searchTerm]);

  // Calculate live modified rows count
  const modifiedCount = useMemo(() => {
    return Object.values(rowsState).filter((r) => r.isModified).length;
  }, [rowsState]);

  // Live Grand Totals calculated from all 333 customers
  const liveTotals = useMemo(() => {
    let total1L = 0;
    let total500ml = 0;
    let total250ml = 0;
    let grandTotalBillPaise = 0;
    let grandTotalReceivedPaise = 0;
    let grandTotalRemainingDuePaise = 0;
    let activeAccounts = 0;

    initialData.customers.forEach((c) => {
      const state = rowsState[c.id] || {
        pkg1L: c.savedPkg1L || 0,
        pkg500ml: c.savedPkg500ml || 0,
        pkg250ml: c.savedPkg250ml || 0,
        receivedAmount: c.savedReceivedRupees > 0 ? String(c.savedReceivedRupees) : '',
        remarks: c.savedRemarks || '',
        isModified: false,
      };

      const billPaise = 
        state.pkg1L * c.rate1LPaise +
        state.pkg500ml * c.rate500mlPaise +
        state.pkg250ml * c.rate250mlPaise;

      const receivedPaise = Math.round((Number(state.receivedAmount) || 0) * 100);
      const remainingDuePaise = c.previousDuePaise + billPaise - receivedPaise;

      total1L += state.pkg1L;
      total500ml += state.pkg500ml;
      total250ml += state.pkg250ml;
      grandTotalBillPaise += billPaise;
      grandTotalReceivedPaise += receivedPaise;
      grandTotalRemainingDuePaise += remainingDuePaise;

      if (billPaise > 0 || receivedPaise > 0) {
        activeAccounts++;
      }
    });

    return {
      total1L,
      total500ml,
      total250ml,
      totalPKGs: total1L + total500ml + total250ml,
      grandTotalBillPaise,
      grandTotalReceivedPaise,
      grandTotalRemainingDuePaise,
      activeAccounts,
    };
  }, [initialData.customers, rowsState]);

  // Keyboard Navigation: Enter moves to next row in same column
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextInput = document.querySelector<HTMLInputElement>(
        `input[data-row="${rowIndex + 1}"][data-col="${colIndex}"]`
      );
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    } else if (e.key === 'ArrowDown') {
      const nextInput = document.querySelector<HTMLInputElement>(
        `input[data-row="${rowIndex + 1}"][data-col="${colIndex}"]`
      );
      if (nextInput) {
        e.preventDefault();
        nextInput.focus();
        nextInput.select();
      }
    } else if (e.key === 'ArrowUp') {
      const prevInput = document.querySelector<HTMLInputElement>(
        `input[data-row="${rowIndex - 1}"][data-col="${colIndex}"]`
      );
      if (prevInput) {
        e.preventDefault();
        prevInput.focus();
        prevInput.select();
      }
    }
  };

  // Save All Modified Entries in Batch
  const handleSaveAll = async () => {
    setErrorBanner(null);
    setSuccessBanner(null);
    setIsSaving(true);

    try {
      const payloadEntries = initialData.customers.map((c) => {
        const state = rowsState[c.id];
        return {
          customerId: c.id,
          pkg1L: Number(state?.pkg1L) || 0,
          pkg500ml: Number(state?.pkg500ml) || 0,
          pkg250ml: Number(state?.pkg250ml) || 0,
          receivedAmount: Number(state?.receivedAmount) || 0,
          remarks: state?.remarks || '',
          existingSaleIds: c.existingSaleIds,
          existingPaymentIds: c.existingPaymentIds,
          isModified: Boolean(state?.isModified),
        };
      });

      const res = await saveAdminEntryBatch({
        date: initialData.targetDate,
        entries: payloadEntries,
      });

      if (res.error) {
        setErrorBanner(res.error);
      } else {
        setSuccessBanner(
          `Successfully saved ${res.savedCount || 0} entries for ${initialData.targetDate}. Main Customers & ledger updated.`
        );
        // Reset modified flags
        setRowsState((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((id) => {
            if (next[id]) next[id].isModified = false;
          });
          return next;
        });
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to save batch entries');
    } finally {
      setIsSaving(false);
    }
  };

  // Discard changes
  const handleDiscardChanges = () => {
    if (!window.confirm('Discard all unsaved changes for this sheet?')) return;
    const initialMap: Record<string, RowState> = {};
    initialData.customers.forEach((c) => {
      initialMap[c.id] = {
        pkg1L: c.savedPkg1L || 0,
        pkg500ml: c.savedPkg500ml || 0,
        pkg250ml: c.savedPkg250ml || 0,
        receivedAmount: c.savedReceivedRupees > 0 ? String(c.savedReceivedRupees) : '',
        remarks: c.savedRemarks || '',
        isModified: false,
      };
    });
    setRowsState(initialMap);
    setSuccessBanner(null);
    setErrorBanner(null);
  };

  return (
    <div className="space-y-4 animate-fade-in select-none">
      {/* 1. Header & Dedicated Admin Entry Calendar (Highest Stacking Context z-50) */}
      <div className="relative z-50 bg-surface-raised border border-border-default shadow-raised rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
              Admin Entry
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-secondary font-medium mt-0.5">
            Register-style daily sales and collections entry sheet for all 333 customer accounts.
          </p>
        </div>

        {/* Separate Independent Calendar for Admin Entry */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col text-right">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-secondary">
              Entry Date
            </span>
            <span className="text-xs font-bold text-primary font-mono">
              {initialData.targetDate}
            </span>
          </div>
          <AdminDatePicker 
            currentDate={initialData.targetDate} 
            basePath="/dashboard/admin/entry" 
          />
        </div>
      </div>

      {/* 2. KPI Summary Bar for the Selected Date */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-surface-raised border border-border-default shadow-raised-sm rounded-xl p-3">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-secondary block">
            Day's Total Sales
          </span>
          <div className="text-lg sm:text-xl font-black text-primary font-sans tabular-nums mt-0.5">
            {formatMoney(liveTotals.grandTotalBillPaise)}
          </div>
        </div>

        <div className="bg-surface-raised border border-border-default shadow-raised-sm rounded-xl p-3">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-secondary block">
            Collections Received
          </span>
          <div className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-400 font-sans tabular-nums mt-0.5">
            {formatMoney(liveTotals.grandTotalReceivedPaise)}
          </div>
        </div>

        <div className="bg-surface-raised border border-border-default shadow-raised-sm rounded-xl p-3">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-secondary block">
            Net Due / Remaining
          </span>
          <div className="text-lg sm:text-xl font-black text-amber-700 dark:text-amber-400 font-sans tabular-nums mt-0.5">
            {formatMoney(liveTotals.grandTotalRemainingDuePaise)}
          </div>
        </div>

        <div className="bg-surface-raised border border-border-default shadow-raised-sm rounded-xl p-3">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-secondary block">
            Total Packages Sold
          </span>
          <div className="text-lg sm:text-xl font-black text-primary font-sans tabular-nums mt-0.5">
            {formatNumber(liveTotals.totalPKGs)} <span className="text-xs font-normal text-secondary">PKGs</span>
          </div>
        </div>

        <div className="bg-surface-raised border border-border-default shadow-raised-sm rounded-xl p-3 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-secondary block">
            Accounts Active / Total
          </span>
          <div className="text-lg sm:text-xl font-black text-primary font-sans tabular-nums mt-0.5">
            {liveTotals.activeAccounts} <span className="text-xs font-normal text-secondary">/ {initialData.customers.length}</span>
          </div>
        </div>
      </div>

      {/* 3. Action Bar, Filter Controls & Save All Button */}
      <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-0">
          {/* Quick Search */}
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-secondary" />
            <input
              type="text"
              placeholder="Search customer, code, route..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface-inset border border-border-default text-xs font-semibold text-primary placeholder:text-muted focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
            />
          </div>

          {/* Route Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-surface-inset border border-border-default text-primary cursor-pointer outline-none focus:border-teal-500"
            >
              <option value="ALL">All Routes ({routeOptions.length})</option>
              {routeOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Show Modified Only Toggle */}
          <label className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:text-primary cursor-pointer px-2 py-1 rounded-lg hover:bg-surface-inset transition-colors">
            <input
              type="checkbox"
              checked={showModifiedOnly}
              onChange={(e) => setShowModifiedOnly(e.target.checked)}
              className="rounded border-border-default text-teal-600 focus:ring-teal-500"
            />
            <span>Show Active Only ({liveTotals.activeAccounts})</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          {modifiedCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDiscardChanges}
              disabled={isSaving}
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            >
              Discard
            </Button>
          )}

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSaveAll}
            disabled={isSaving || modifiedCount === 0}
            isLoading={isSaving}
            leftIcon={<Save className="h-4 w-4" />}
            className="shadow-md hover:shadow-lg font-bold"
          >
            {modifiedCount > 0 ? `Save All Entries (${modifiedCount})` : 'Save All Entries'}
          </Button>
        </div>
      </div>

      {/* Banners */}
      {successBanner && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-2 animate-scale-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successBanner}</span>
        </div>
      )}

      {errorBanner && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs sm:text-sm font-bold flex items-center gap-2 animate-scale-in">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* 4. MAIN REGISTER TABLE */}
      <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-left border-collapse text-xs">
            {/* Sticky Header */}
            <thead className="sticky top-0 z-20 bg-surface-sidebar/95 backdrop-blur-xs border-b border-border-default shadow-xs text-secondary font-extrabold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center border-r border-border-default/50">
                  S. No.
                </th>
                <th className="py-2.5 px-3 min-w-[200px] max-w-[240px] sticky left-0 z-20 bg-surface-sidebar border-r border-border-default/50">
                  Customer Name
                </th>
                <th className="py-2.5 px-3 min-w-[150px] border-r border-border-default/50">
                  Area / Route
                </th>
                <th className="py-2.5 px-3 min-w-[110px] text-right border-r border-border-default/50">
                  Previous Due (₹)
                </th>
                <th className="py-2.5 px-2.5 min-w-[105px] text-center border-r border-border-default/50 bg-blue-500/5">
                  <div>1 Litre (PKGs)</div>
                  <div className="text-[9px] font-bold text-blue-700 dark:text-blue-300 normal-case">
                    avg ₹{initialData.prod1LRatePaise / 100}
                  </div>
                </th>
                <th className="py-2.5 px-2.5 min-w-[105px] text-center border-r border-border-default/50 bg-teal-500/5">
                  <div>500 ml (PKGs)</div>
                  <div className="text-[9px] font-bold text-teal-700 dark:text-teal-300 normal-case">
                    avg ₹{initialData.prod500mlRatePaise / 100}
                  </div>
                </th>
                <th className="py-2.5 px-2.5 min-w-[105px] text-center border-r border-border-default/50 bg-amber-500/5">
                  <div>250 ml (PKGs)</div>
                  <div className="text-[9px] font-bold text-amber-700 dark:text-amber-300 normal-case">
                    avg ₹{initialData.prod250mlRatePaise / 100}
                  </div>
                </th>
                <th className="py-2.5 px-3 min-w-[110px] text-right border-r border-border-default/50 bg-teal-500/10 text-teal-900 dark:text-teal-200">
                  Total Bill (₹)
                </th>
                <th className="py-2.5 px-3 min-w-[125px] text-right border-r border-border-default/50 bg-emerald-500/5">
                  Collection Received (₹)
                </th>
                <th className="py-2.5 px-3 min-w-[120px] text-right border-r border-border-default/50 font-black">
                  Remaining Due (₹)
                </th>
                <th className="py-2.5 px-3 min-w-[150px]">
                  Remarks
                </th>
              </tr>
            </thead>

            {/* Table Body: All Customer Rows */}
            <tbody className="divide-y divide-border-default/50 font-sans">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-secondary text-sm">
                    No customers match the current filter or search criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c, idx) => {
                  const state = rowsState[c.id] || {
                    pkg1L: 0,
                    pkg500ml: 0,
                    pkg250ml: 0,
                    receivedAmount: '',
                    remarks: '',
                    isModified: false,
                  };

                  const billPaise = 
                    state.pkg1L * c.rate1LPaise +
                    state.pkg500ml * c.rate500mlPaise +
                    state.pkg250ml * c.rate250mlPaise;

                  const receivedPaise = Math.round((Number(state.receivedAmount) || 0) * 100);
                  const remainingDuePaise = c.previousDuePaise + billPaise - receivedPaise;
                  const isRowActive = state.pkg1L > 0 || state.pkg500ml > 0 || state.pkg250ml > 0 || receivedPaise > 0;

                  return (
                    <tr 
                      key={c.id}
                      className={`transition-colors ${
                        state.isModified 
                          ? 'bg-amber-500/10 hover:bg-amber-500/15' 
                          : isRowActive 
                          ? 'bg-teal-500/5 hover:bg-teal-500/10' 
                          : 'hover:bg-surface-inset/60'
                      }`}
                    >
                      {/* S. No. */}
                      <td className="py-2 px-3 text-center tabular-nums text-secondary font-mono border-r border-border-default/40">
                        {idx + 1}
                      </td>

                      {/* Customer Name (Sticky) */}
                      <td className="py-2 px-3 sticky left-0 z-10 bg-inherit border-r border-border-default/40 font-bold min-w-[200px] max-w-[240px]">
                        <div className="flex items-center justify-between gap-1">
                          <Link 
                            href={`/dashboard/admin/customers/${c.id}`}
                            target="_blank"
                            className="text-primary hover:text-teal-700 dark:hover:text-teal-400 transition-colors truncate block"
                            title={`Open Customer Workspace: ${c.customerName}`}
                          >
                            {c.customerName}
                          </Link>
                          {c.code && (
                            <span className="text-[10px] font-mono font-bold px-1 py-0.5 rounded bg-surface-inset text-secondary shrink-0">
                              {c.code}
                            </span>
                          )}
                        </div>
                        {c.firmName && (
                          <div className="text-[10px] text-secondary font-normal truncate">
                            {c.firmName}
                          </div>
                        )}
                      </td>

                      {/* Area / Route */}
                      <td className="py-2 px-3 text-secondary border-r border-border-default/40 min-w-[150px]">
                        <div className="font-semibold text-primary truncate max-w-[150px]">
                          {c.areaName}
                        </div>
                        <div className="text-[10px] text-muted truncate max-w-[150px]">
                          {c.routeName}
                        </div>
                      </td>

                      {/* Previous Due (₹) */}
                      <td className={`py-2 px-3 text-right tabular-nums font-bold border-r border-border-default/40 ${
                        c.previousDuePaise > 0 
                          ? 'text-amber-800 dark:text-amber-300' 
                          : c.previousDuePaise < 0 
                          ? 'text-emerald-700 dark:text-emerald-400' 
                          : 'text-secondary'
                      }`}>
                        {formatMoney(c.previousDuePaise)}
                      </td>

                      {/* 1 Litre (PKGs) */}
                      <td className="py-1.5 px-2 text-center border-r border-border-default/40 bg-blue-500/5">
                        <div className="flex flex-col items-center">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            data-row={idx}
                            data-col={1}
                            value={state.pkg1L === 0 ? '' : state.pkg1L}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              handleCellChange(c.id, 'pkg1L', val);
                            }}
                            onKeyDown={(e) => handleKeyDown(e, idx, 1)}
                            placeholder="0"
                            className="w-16 text-center py-1 px-1.5 rounded-lg bg-surface-inset border border-border-default text-xs font-bold text-primary focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none tabular-nums"
                          />
                          <span className="text-[9px] font-bold text-blue-700 dark:text-blue-300 mt-0.5">
                            @ ₹{c.rate1LPaise / 100}
                          </span>
                        </div>
                      </td>

                      {/* 500 ml (PKGs) */}
                      <td className="py-1.5 px-2 text-center border-r border-border-default/40 bg-teal-500/5">
                        <div className="flex flex-col items-center">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            data-row={idx}
                            data-col={2}
                            value={state.pkg500ml === 0 ? '' : state.pkg500ml}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              handleCellChange(c.id, 'pkg500ml', val);
                            }}
                            onKeyDown={(e) => handleKeyDown(e, idx, 2)}
                            placeholder="0"
                            className="w-16 text-center py-1 px-1.5 rounded-lg bg-surface-inset border border-border-default text-xs font-bold text-primary focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none tabular-nums"
                          />
                          <span className="text-[9px] font-bold text-teal-700 dark:text-teal-300 mt-0.5">
                            @ ₹{c.rate500mlPaise / 100}
                          </span>
                        </div>
                      </td>

                      {/* 250 ml (PKGs) */}
                      <td className="py-1.5 px-2 text-center border-r border-border-default/40 bg-amber-500/5">
                        <div className="flex flex-col items-center">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            data-row={idx}
                            data-col={3}
                            value={state.pkg250ml === 0 ? '' : state.pkg250ml}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              handleCellChange(c.id, 'pkg250ml', val);
                            }}
                            onKeyDown={(e) => handleKeyDown(e, idx, 3)}
                            placeholder="0"
                            className="w-16 text-center py-1 px-1.5 rounded-lg bg-surface-inset border border-border-default text-xs font-bold text-primary focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none tabular-nums"
                          />
                          <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 mt-0.5">
                            @ ₹{c.rate250mlPaise / 100}
                          </span>
                        </div>
                      </td>

                      {/* Total Bill (₹) — Calculated Live */}
                      <td className="py-2 px-3 text-right tabular-nums font-black border-r border-border-default/40 bg-teal-500/10 text-teal-900 dark:text-teal-200">
                        {formatMoney(billPaise)}
                      </td>

                      {/* Collection Received (₹) */}
                      <td className="py-1.5 px-2 text-right border-r border-border-default/40 bg-emerald-500/5">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          data-row={idx}
                          data-col={4}
                          value={state.receivedAmount}
                          onChange={(e) => handleCellChange(c.id, 'receivedAmount', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, idx, 4)}
                          placeholder="0.00"
                          className="w-24 text-right py-1 px-2 rounded-lg bg-surface-inset border border-border-default text-xs font-bold text-emerald-800 dark:text-emerald-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none tabular-nums"
                        />
                      </td>

                      {/* Remaining Due (₹) — Calculated Live */}
                      <td className={`py-2 px-3 text-right tabular-nums font-black border-r border-border-default/40 ${
                        remainingDuePaise > 0 
                          ? 'text-amber-800 dark:text-amber-300' 
                          : remainingDuePaise < 0 
                          ? 'text-emerald-700 dark:text-emerald-400' 
                          : 'text-secondary'
                      }`}>
                        {formatMoney(remainingDuePaise)}
                      </td>

                      {/* Remarks */}
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          data-row={idx}
                          data-col={5}
                          value={state.remarks}
                          onChange={(e) => handleCellChange(c.id, 'remarks', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, idx, 5)}
                          placeholder="Remarks..."
                          className="w-full py-1 px-2 rounded-lg bg-surface-inset border border-border-default text-xs text-primary focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Sticky Totals Footer */}
            <tfoot className="sticky bottom-0 z-20 bg-surface-sidebar border-t-2 border-border-strong shadow-raised font-black text-xs text-primary">
              <tr>
                <td className="py-3 px-3 text-center border-r border-border-default">
                  Σ
                </td>
                <td className="py-3 px-3 sticky left-0 z-20 bg-surface-sidebar border-r border-border-default">
                  TOTALS ({liveTotals.activeAccounts} Active / {initialData.customers.length})
                </td>
                <td className="py-3 px-3 text-secondary text-[11px] border-r border-border-default">
                  All Routes
                </td>
                <td className="py-3 px-3 text-right tabular-nums border-r border-border-default text-amber-800 dark:text-amber-300">
                  —
                </td>
                <td className="py-3 px-2 text-center tabular-nums border-r border-border-default text-blue-800 dark:text-blue-300">
                  {formatNumber(liveTotals.total1L)} PKGs
                </td>
                <td className="py-3 px-2 text-center tabular-nums border-r border-border-default text-teal-800 dark:text-teal-300">
                  {formatNumber(liveTotals.total500ml)} PKGs
                </td>
                <td className="py-3 px-2 text-center tabular-nums border-r border-border-default text-amber-800 dark:text-amber-300">
                  {formatNumber(liveTotals.total250ml)} PKGs
                </td>
                <td className="py-3 px-3 text-right tabular-nums border-r border-border-default text-teal-900 dark:text-teal-200 bg-teal-500/10">
                  {formatMoney(liveTotals.grandTotalBillPaise)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums border-r border-border-default text-emerald-800 dark:text-emerald-300 bg-emerald-500/10">
                  {formatMoney(liveTotals.grandTotalReceivedPaise)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums border-r border-border-default text-amber-900 dark:text-amber-200">
                  {formatMoney(liveTotals.grandTotalRemainingDuePaise)}
                </td>
                <td className="py-3 px-3 text-secondary text-[11px]">
                  {modifiedCount > 0 ? `${modifiedCount} unsaved rows` : 'All saved'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
