'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  UserPlus, 
  Wallet, 
  FileText, 
  MapPin, 
  CreditCard,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import RecordPaymentModal from './RecordPaymentModal';

export default function QuickActionsRail() {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  return (
    <div className="space-y-3.5 select-none">
      {/* 1. PLANT OPERATIONAL HUB CARD (Real operational data, no fabricated weather) */}
      <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-800 dark:text-teal-400 shrink-0">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-primary tracking-tight">Dahod Hub</span>
            </div>
            <span className="text-[10px] text-muted font-medium block">
              Bottling Plant & Distribution
            </span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Active</span>
        </span>
      </div>

      {/* 2. BRAND SLOGAN CARD */}
      <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-4 text-center">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-400 mb-1 flex items-center justify-center gap-1">
          <Sparkles className="h-3 w-3" />
          <span>ALVOUN OPERATIONS</span>
        </div>
        <p className="text-xs font-bold text-primary italic leading-snug">
          &ldquo;Better Water, Better Tomorrow&rdquo;
        </p>
      </div>

      {/* 3. QUICK ACTIONS RAIL */}
      <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-3.5">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border-subtle/80">
          <div className="h-6 w-6 rounded-md bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-800 dark:text-teal-400 shrink-0">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-xs font-bold text-primary tracking-tight">
            Quick Actions
          </h3>
        </div>

        <div className="space-y-2">
          {/* Action 1: Add Customer */}
          <Link
            href="/dashboard/admin/customers/new"
            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#1A5F63] hover:bg-[#144C4F] text-white shadow-raised transition-all duration-150 cursor-pointer group active:scale-[0.98]"
            title="Register a new retail customer"
          >
            <div className="h-7 w-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0 text-white shadow-xs">
              <UserPlus className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate leading-tight">
                Add Customer
              </div>
              <div className="text-[10px] text-teal-100 truncate mt-0.5">
                Register partner in territory
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-white/70 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>

          {/* Action 2: Record Payment */}
          <button
            type="button"
            onClick={() => setIsPaymentModalOpen(true)}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-surface-raised hover:bg-surface-inset/60 border border-border-default/80 shadow-xs hover:shadow-hover transition-all duration-150 cursor-pointer group active:scale-[0.98] text-left"
            title="Record cash, UPI, or cheque payment collection"
          >
            <div className="h-7 w-7 rounded-lg bg-surface-inset border border-border-default shadow-inset flex items-center justify-center shrink-0 text-emerald-700 dark:text-emerald-400 group-hover:scale-105 transition-all">
              <Wallet className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-primary truncate leading-tight">
                Record Payment
              </div>
              <div className="text-[10px] text-secondary truncate mt-0.5">
                Cash / UPI / cheque voucher
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>

          {/* Action 3: Daily Sales Register */}
          <Link
            href="/dashboard/admin/reports/daily"
            className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-raised hover:bg-surface-inset/60 border border-border-default/80 shadow-xs hover:shadow-hover transition-all duration-150 cursor-pointer group active:scale-[0.98]"
            title="Open daily billing and transaction logs"
          >
            <div className="h-7 w-7 rounded-lg bg-surface-inset border border-border-default shadow-inset flex items-center justify-center shrink-0 text-teal-800 dark:text-teal-400 group-hover:scale-105 transition-all">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-primary truncate leading-tight">
                Daily Sales Register
              </div>
              <div className="text-[10px] text-secondary truncate mt-0.5">
                Billing & delivery register
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>

          {/* Action 4: Outstanding Dues */}
          <Link
            href="/dashboard/admin/reports/outstanding"
            className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-raised hover:bg-surface-inset/60 border border-border-default/80 shadow-xs hover:shadow-hover transition-all duration-150 cursor-pointer group active:scale-[0.98]"
            title="Open customer outstanding balances and ledgers"
          >
            <div className="h-7 w-7 rounded-lg bg-surface-inset border border-border-default shadow-inset flex items-center justify-center shrink-0 text-amber-700 dark:text-amber-400 group-hover:scale-105 transition-all">
              <CreditCard className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-primary truncate leading-tight">
                Outstanding Dues
              </div>
              <div className="text-[10px] text-secondary truncate mt-0.5">
                Market credit & debt ledgers
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>

          {/* Action 5: Routes & Sectors */}
          <Link
            href="/dashboard/admin/routes"
            className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-raised hover:bg-surface-inset/60 border border-border-default/80 shadow-xs hover:shadow-hover transition-all duration-150 cursor-pointer group active:scale-[0.98]"
            title="Open routes, areas, and territory master"
          >
            <div className="h-7 w-7 rounded-lg bg-surface-inset border border-border-default shadow-inset flex items-center justify-center shrink-0 text-teal-800 dark:text-teal-400 group-hover:scale-105 transition-all">
              <MapPin className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-primary truncate leading-tight">
                Routes & Sectors
              </div>
              <div className="text-[10px] text-secondary truncate mt-0.5">
                Territory & beat assignments
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>

          {/* Action 6: Production Batches */}
          <Link
            href="/dashboard/admin/production"
            className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-raised hover:bg-surface-inset/60 border border-border-default/80 shadow-xs hover:shadow-hover transition-all duration-150 cursor-pointer group active:scale-[0.98]"
            title="Log batch runs for 1L, 500ml, 250ml & 2L lines"
          >
            <div className="h-7 w-7 rounded-lg bg-surface-inset border border-border-default shadow-inset flex items-center justify-center shrink-0 text-teal-800 dark:text-teal-400 group-hover:scale-105 transition-all">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-primary truncate leading-tight">
                Bottling Production
              </div>
              <div className="text-[10px] text-secondary truncate mt-0.5">
                1L, 500ml, 250ml & 2L yields
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>

          {/* Action 7: Stock & Raw Materials */}
          <Link
            href="/dashboard/admin/stock"
            className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-raised hover:bg-surface-inset/60 border border-border-default/80 shadow-xs hover:shadow-hover transition-all duration-150 cursor-pointer group active:scale-[0.98]"
            title="Check inventory of finished crates, preforms, caps & stickers"
          >
            <div className="h-7 w-7 rounded-lg bg-surface-inset border border-border-default shadow-inset flex items-center justify-center shrink-0 text-teal-800 dark:text-teal-400 group-hover:scale-105 transition-all">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-primary truncate leading-tight">
                Stock & Raw Materials
              </div>
              <div className="text-[10px] text-secondary truncate mt-0.5">
                Opening, consumed & closing
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>

          {/* Action 8: Company Expenses */}
          <Link
            href="/dashboard/admin/expenses"
            className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-raised hover:bg-surface-inset/60 border border-border-default/80 shadow-xs hover:shadow-hover transition-all duration-150 cursor-pointer group active:scale-[0.98]"
            title="Log fuel, salary, electricity & factory expenses"
          >
            <div className="h-7 w-7 rounded-lg bg-surface-inset border border-border-default shadow-inset flex items-center justify-center shrink-0 text-rose-700 dark:text-rose-400 group-hover:scale-105 transition-all">
              <CreditCard className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-primary truncate leading-tight">
                Company Expenses
              </div>
              <div className="text-[10px] text-secondary truncate mt-0.5">
                Fuel, maintenance & labour
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
        </div>
      </div>

      {/* Record Payment Dialog */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
      />
    </div>
  );
}
