'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatMoney } from '@/lib/format';
import { calculateOutstanding } from '@/lib/outstanding';
import { adjustCustomerOpeningBalance } from '@/lib/actions/customer';
import { 
  Phone, CreditCard, Edit, MapPin, 
  ShoppingBag, ArrowLeft,
  CheckCircle2, AlertCircle, Building2,
  Calendar, Clock, User, ShieldCheck,
  Scale, Receipt, History, X, Save
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import CustomerPricingSection from './CustomerPricingSection';

export default function CustomerWorkspace({ 
  customer,
  userRole
}: { 
  customer: any;
  userRole?: string;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const outstanding = calculateOutstanding(customer);
  const isNegative = outstanding > 0; // Positive outstanding means customer owes us

  // Executive authorization for opening balance adjustment
  const isExecutive = ['FOUNDER_CEO', 'OWNER', 'ADMIN', 'DIRECTOR'].includes(userRole || '');

  // Adjustment Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState((customer.openingBalance / 100).toFixed(2));
  const [adjustType, setAdjustType] = useState<'DEBIT' | 'CREDIT'>(customer.openingBalanceType || 'DEBIT');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjustSuccess, setAdjustSuccess] = useState<string | null>(null);

  const tabs = [
    { id: 'OVERVIEW', label: 'Overview' },
    { id: 'LEDGER', label: 'Customer Ledger' },
    { id: 'PRICING', label: 'Product Rates' },
    { id: 'SALES', label: 'Sales History' },
    { id: 'PAYMENTS', label: 'Payments' },
    { id: 'VISITS', label: 'Visits' },
  ];

  const totalSales = customer.sales.reduce((sum: number, s: any) => sum + s.totalAmount, 0);
  const totalPayments = customer.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
  
  const lastVisit = customer.visits?.[0]?.createdAt ? new Date(customer.visits[0].createdAt).toLocaleDateString('en-IN') : 'Never';
  const lastPayment = customer.payments?.[0]?.paymentDate ? new Date(customer.payments[0].paymentDate).toLocaleDateString('en-IN') : 'None';

  // Build Chronological Ledger
  const ledgerEntries = [
    {
      id: 'opening',
      date: customer.createdAt,
      type: 'OPENING BALANCE',
      description: 'Opening Balance (Brought Forward Debt from Physical Registers / Old System)',
      amount: customer.openingBalance,
      isCredit: customer.openingBalanceType === 'CREDIT',
    },
    ...customer.sales.map((s: any) => ({
      id: `sale-${s.id}`,
      date: s.saleDate || s.createdAt,
      type: 'SALE',
      description: `Sale #${s.id.slice(-6)} (New Invoice)`,
      amount: s.totalAmount,
      isCredit: false,
    })),
    ...customer.payments.map((p: any) => ({
      id: `payment-${p.id}`,
      date: p.paymentDate || p.createdAt,
      type: 'PAYMENT',
      description: `Payment (${p.paymentMethod || 'Cash'}) applied to balance`,
      amount: p.amount,
      isCredit: true,
    }))
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Authoritative running balance calculation
  let runningDr = customer.openingBalanceType === 'DEBIT' 
    ? customer.openingBalance 
    : -customer.openingBalance;

  const ledgerWithBalance = ledgerEntries.map((entry, index) => {
    if (index > 0) {
      if (entry.isCredit) runningDr -= entry.amount;
      else runningDr += entry.amount;
    }
    return { ...entry, runningBalance: runningDr };
  }).reverse(); // Most recent first for display

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustError(null);
    setAdjustSuccess(null);

    const num = parseFloat(adjustAmount);
    if (isNaN(num) || num < 0) {
      setAdjustError('Please enter a valid amount (₹0 or positive).');
      return;
    }

    if (!adjustReason || adjustReason.trim().length < 3) {
      setAdjustError('A clear audit reason (minimum 3 characters) is required.');
      return;
    }

    setAdjustLoading(true);
    const res = await adjustCustomerOpeningBalance({
      customerId: customer.id,
      newBalanceRupees: num,
      openingBalanceType: adjustType,
      reason: adjustReason.trim(),
    });
    setAdjustLoading(false);

    if (res.error) {
      setAdjustError(res.error);
    } else {
      setAdjustSuccess(res.message || 'Opening balance updated successfully.');
      setTimeout(() => {
        setIsAdjustModalOpen(false);
        router.refresh();
      }, 900);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Back Button */}
      <div>
        <Link 
          href="/dashboard/admin/customers" 
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-secondary hover:text-primary bg-surface-raised shadow-raised hover:shadow-hover press-active rounded-xl border border-border-default transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Customers
        </Link>
      </div>

      {/* Header Workspace Card */}
      <div className="bg-surface-raised shadow-raised rounded-2xl border border-border-default overflow-hidden">
        <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-primary tracking-tight font-sans">
                {customer.customerName}
              </h1>
              {customer.code && (
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-surface-inset border border-border-default text-secondary">
                  {customer.code}
                </span>
              )}
              <Badge variant={customer.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm" dot>
                {customer.status}
              </Badge>
              <Badge variant="teal" size="sm" styleType="subtle">
                {customer.category}
              </Badge>
            </div>
            {customer.firmName && (
              <div className="text-sm font-bold text-teal-700 dark:text-teal-400 mb-1">
                Firm: {customer.firmName}
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-secondary">
              <a 
                href={`tel:${customer.contact}`} 
                className="flex items-center gap-1.5 hover:text-teal-600 transition-colors font-medium"
              >
                <Phone className="h-4 w-4 text-teal-600" /> {customer.contact}
              </a>
              <span className="hidden sm:inline text-border-default">•</span>
              <div className="flex items-center gap-1.5 font-medium">
                <MapPin className="h-4 w-4 text-teal-600" /> {customer.address}, {customer.city?.name || ''}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
            <a 
              href={`tel:${customer.contact}`} 
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-surface-raised shadow-raised hover:shadow-hover border border-border-default text-primary rounded-xl text-sm font-bold transition-all"
            >
              <Phone className="h-4 w-4 text-teal-600" /> Call
            </a>
            <Link 
              href={`/dashboard/admin/customers/${customer.id}/edit`} 
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-surface-inset shadow-inset hover:bg-surface-raised border border-border-default text-primary rounded-xl text-sm font-bold transition-all"
            >
              <Edit className="h-4 w-4 text-secondary" /> Edit Profile
            </Link>
            {isExecutive && (
              <button
                type="button"
                onClick={() => {
                  setAdjustAmount((customer.openingBalance / 100).toFixed(2));
                  setAdjustType(customer.openingBalanceType || 'DEBIT');
                  setAdjustReason('');
                  setAdjustError(null);
                  setAdjustSuccess(null);
                  setIsAdjustModalOpen(true);
                }}
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-teal-800 dark:bg-teal-700 hover:bg-teal-900 text-white shadow-raised hover:shadow-hover rounded-xl text-sm font-bold transition-all cursor-pointer"
                title="Adjust Opening Balance carried forward from previous registers"
              >
                <Scale className="h-4 w-4" /> Adjust Opening Balance
              </button>
            )}
          </div>
        </div>
        
        {/* Authoritative Financial Reconciliation KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-t border-border-default divide-y md:divide-y-0 md:divide-x divide-border-default bg-surface-inset/40 select-none">
          {/* 1. Current Outstanding */}
          <div className="p-4 sm:p-5">
            <div className="text-[11px] font-bold text-secondary uppercase tracking-wider mb-1">
              Current Outstanding
            </div>
            <div className={`text-xl sm:text-2xl font-black tracking-tight font-sans ${isNegative ? 'text-danger' : 'text-primary'}`}>
              {formatMoney(Math.abs(outstanding))}
            </div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted mt-1">
              {outstanding > 0 ? 'To Receive (Debit)' : outstanding < 0 ? 'In Advance (Credit)' : 'Settled (₹0)'}
            </div>
          </div>

          {/* 2. Opening Balance (Brought Forward) */}
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">
                Opening Balance
              </span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-surface-raised border border-border-default text-secondary">
                {customer.openingBalanceType}
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black tracking-tight font-sans text-primary">
              {formatMoney(customer.openingBalance)}
            </div>
            <div className="text-[10px] font-bold text-muted mt-1">
              Brought Forward Debt
            </div>
          </div>

          {/* 3. New Sales (Since Go-Live) */}
          <div className="p-4 sm:p-5">
            <div className="text-[11px] font-bold text-secondary uppercase tracking-wider mb-1">
              New Sales
            </div>
            <div className="text-xl sm:text-2xl font-black tracking-tight font-sans text-primary">
              {formatMoney(totalSales)}
            </div>
            <div className="text-[10px] font-bold text-muted mt-1">
              Since Software Go-Live
            </div>
          </div>

          {/* 4. Payments Received */}
          <div className="p-4 sm:p-5">
            <div className="text-[11px] font-bold text-secondary uppercase tracking-wider mb-1">
              Payments Received
            </div>
            <div className="text-xl sm:text-2xl font-black tracking-tight font-sans text-emerald-700 dark:text-emerald-400">
              {formatMoney(totalPayments)}
            </div>
            <div className="text-[10px] font-bold text-muted mt-1">
              Applied to Balance
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Container */}
      <div className="bg-surface-raised shadow-raised rounded-2xl border border-border-default overflow-hidden">
        {/* Neumorphic Tab Bar */}
        <div className="p-3 border-b border-border-default bg-surface-inset/30">
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-surface-raised shadow-raised text-primary border border-border-default' 
                      : 'text-secondary hover:text-primary hover:bg-surface-raised/40 border border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {/* OVERVIEW TAB */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              {/* Fresh Accounting Reconciliation Card */}
              <div className="bg-surface-inset shadow-inset rounded-2xl p-5 sm:p-6 border border-border-default">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-default">
                  <div>
                    <h3 className="text-base font-black text-primary tracking-tight font-sans flex items-center gap-2">
                      <Scale className="h-5 w-5 text-teal-600" />
                      Opening Balance & Ledger Reconciliation
                    </h3>
                    <p className="text-xs text-secondary font-medium mt-0.5">
                      Fresh accounting started on software go-live. Historical debt is brought forward without altering previous registers.
                    </p>
                  </div>
                  {isExecutive && (
                    <button
                      type="button"
                      onClick={() => setIsAdjustModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-raised border border-border-default shadow-xs text-xs font-bold text-primary hover:text-teal-700 transition-all cursor-pointer"
                    >
                      <Edit className="h-3.5 w-3.5" /> Adjust Balance
                    </button>
                  )}
                </div>

                {/* Mathematical Ledger Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4 text-center sm:text-left">
                  <div className="p-3.5 rounded-xl bg-surface-raised border border-border-default shadow-xs">
                    <span className="text-[10px] font-bold text-secondary uppercase tracking-wider block">Opening Balance</span>
                    <span className="text-lg font-black text-primary font-mono tabular-nums block mt-1">
                      {formatMoney(customer.openingBalance)}
                    </span>
                    <span className="text-[11px] font-semibold text-muted">
                      {customer.openingBalanceType === 'DEBIT' ? 'Debt Brought Forward' : 'Credit Balance'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-raised border border-border-default shadow-xs">
                    <span className="text-[10px] font-bold text-secondary uppercase tracking-wider block">+ New Sales</span>
                    <span className="text-lg font-black text-primary font-mono tabular-nums block mt-1">
                      +{formatMoney(totalSales)}
                    </span>
                    <span className="text-[11px] font-semibold text-muted">
                      {customer.sales.length} Invoices Recorded
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-raised border border-border-default shadow-xs">
                    <span className="text-[10px] font-bold text-secondary uppercase tracking-wider block">- Payments Received</span>
                    <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono tabular-nums block mt-1">
                      -{formatMoney(totalPayments)}
                    </span>
                    <span className="text-[11px] font-semibold text-muted">
                      {customer.payments.length} Payments Collected
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-raised border border-border-strong shadow-xs">
                    <span className="text-[10px] font-bold text-secondary uppercase tracking-wider block">= Net Outstanding</span>
                    <span className={`text-lg font-black font-mono tabular-nums block mt-1 ${isNegative ? 'text-danger' : 'text-primary'}`}>
                      {formatMoney(Math.abs(outstanding))}
                    </span>
                    <span className="text-[11px] font-extrabold text-teal-700 dark:text-teal-400">
                      {outstanding > 0 ? 'Due to Collect (Dr)' : outstanding < 0 ? 'Credit Advance (Cr)' : 'Settled (₹0)'}
                    </span>
                  </div>
                </div>

                {/* Audit Trail for Opening Balance */}
                {customer.auditLogs && customer.auditLogs.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-border-default">
                    <h4 className="text-xs font-bold text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <History className="h-3.5 w-3.5 text-teal-600" />
                      Opening Balance Audit Trail
                    </h4>
                    <div className="space-y-2">
                      {customer.auditLogs.map((log: any) => (
                        <div key={log.id} className="p-2.5 rounded-xl bg-surface-raised border border-border-default text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-primary">{log.actorName}</span>
                            <span className="text-secondary ml-1.5 font-medium">({log.actorRole})</span>
                            <p className="text-secondary mt-0.5">{log.details}</p>
                          </div>
                          <span className="text-[11px] font-mono text-muted shrink-0">
                            {new Date(log.createdAt).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Assignment & Routing Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">Assignment & Logistics</h3>
                  <div className="bg-surface-inset shadow-inset rounded-2xl p-5 border border-border-default space-y-4">
                    <div className="grid grid-cols-3 pb-3 border-b border-border-default">
                      <dt className="text-xs font-bold text-secondary uppercase tracking-wider">Route</dt>
                      <dd className="col-span-2 text-sm font-bold text-primary">{customer.route?.name || 'Unassigned'}</dd>
                    </div>
                    <div className="grid grid-cols-3 pb-3 border-b border-border-default">
                      <dt className="text-xs font-bold text-secondary uppercase tracking-wider">Salesman</dt>
                      <dd className="col-span-2 text-sm font-bold text-primary">{customer.salesman?.name || 'Unassigned'}</dd>
                    </div>
                    <div className="grid grid-cols-3">
                      <dt className="text-xs font-bold text-secondary uppercase tracking-wider">Territory</dt>
                      <dd className="col-span-2 text-sm font-semibold text-primary">{customer.city?.name || 'Unknown'}, {customer.state?.name || 'Unknown'}</dd>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">Activity Timeline</h3>
                  <div className="bg-surface-inset shadow-inset rounded-2xl p-5 border border-border-default space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-secondary">Account Created</span>
                      <span className="text-xs font-semibold text-primary">{new Date(customer.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-secondary">Last Field Visit</span>
                      <span className="text-xs font-semibold text-primary">{lastVisit}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-secondary">Last Payment Collected</span>
                      <span className="text-xs font-semibold text-primary">{lastPayment}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LEDGER TAB */}
          {activeTab === 'LEDGER' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-primary">Full Customer Ledger</h3>
                  <p className="text-xs text-secondary">Chronological audit ledger showing Opening Balance, Sales Invoices, and Payments received.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-secondary">Current Balance:</span>
                  <span className={`text-sm font-black font-mono ${isNegative ? 'text-danger' : 'text-primary'}`}>
                    {formatMoney(Math.abs(outstanding))} {outstanding > 0 ? 'Dr' : outstanding < 0 ? 'Cr' : 'Settled'}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border-default">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-surface-inset shadow-inset text-xs font-bold uppercase tracking-wider text-secondary border-b border-border-default">
                    <tr>
                      <th className="px-6 py-3.5">Date</th>
                      <th className="px-6 py-3.5">Type</th>
                      <th className="px-6 py-3.5">Description</th>
                      <th className="px-6 py-3.5 text-right">Debit (Owed)</th>
                      <th className="px-6 py-3.5 text-right">Credit (Paid)</th>
                      <th className="px-6 py-3.5 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default bg-surface-raised">
                    {ledgerWithBalance.map((entry: any) => (
                      <tr key={entry.id} className="hover:bg-surface-inset/40 transition-colors">
                        <td className="px-6 py-3.5 font-medium text-primary">
                          {new Date(entry.date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            entry.type === 'OPENING BALANCE'
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300'
                              : entry.type === 'SALE'
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-300'
                              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300'
                          }`}>
                            {entry.type}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-primary font-medium">{entry.description}</td>
                        <td className="px-6 py-3.5 text-right font-mono font-bold text-secondary">
                          {!entry.isCredit && entry.amount > 0 ? formatMoney(entry.amount) : '-'}
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {entry.isCredit && entry.amount > 0 ? formatMoney(entry.amount) : '-'}
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold text-primary font-mono">
                          <span className={entry.runningBalance > 0 ? 'text-danger' : entry.runningBalance < 0 ? 'text-emerald-600' : 'text-primary'}>
                            {formatMoney(Math.abs(entry.runningBalance))} {entry.runningBalance > 0 ? 'Dr' : entry.runningBalance < 0 ? 'Cr' : 'Settled'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {ledgerWithBalance.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-secondary">
                          No ledger entries found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PRICING TAB */}
          {activeTab === 'PRICING' && (
            <CustomerPricingSection customerId={customer.id} customerName={customer.customerName} />
          )}

          {/* SALES TAB */}
          {activeTab === 'SALES' && (
            <div className="overflow-x-auto rounded-xl border border-border-default">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-surface-inset shadow-inset text-xs font-bold uppercase tracking-wider text-secondary border-b border-border-default">
                  <tr>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Invoice #</th>
                    <th className="px-6 py-3.5">Items Delivered</th>
                    <th className="px-6 py-3.5 text-right">Sale Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default bg-surface-raised">
                  {customer.sales.map((sale: any) => (
                    <tr key={sale.id} className="hover:bg-surface-inset/40 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-primary">{new Date(sale.saleDate || sale.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className="px-6 py-3.5 font-mono text-secondary">#{sale.id.slice(-8)}</td>
                      <td className="px-6 py-3.5 text-secondary">
                        {sale.items.map((i: any) => `${i.crates}x crates`).join(', ')}
                      </td>
                      <td className="px-6 py-3.5 text-right font-black font-mono text-primary">
                        {formatMoney(sale.totalAmount)}
                      </td>
                    </tr>
                  ))}
                  {customer.sales.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-secondary">
                        No sales recorded yet since go-live.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* PAYMENTS TAB */}
          {activeTab === 'PAYMENTS' && (
            <div className="overflow-x-auto rounded-xl border border-border-default">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-surface-inset shadow-inset text-xs font-bold uppercase tracking-wider text-secondary border-b border-border-default">
                  <tr>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Method</th>
                    <th className="px-6 py-3.5">Reference</th>
                    <th className="px-6 py-3.5 text-right">Amount Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default bg-surface-raised">
                  {customer.payments.map((payment: any) => (
                    <tr key={payment.id} className="hover:bg-surface-inset/40 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-primary">{new Date(payment.paymentDate || payment.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className="px-6 py-3.5">
                        <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-surface-inset border border-border-default">
                          {payment.paymentMethod || 'CASH'}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-secondary font-mono text-xs">
                        {payment.referenceNo || 'Direct Receipt'}
                      </td>
                      <td className="px-6 py-3.5 text-right font-black font-mono text-emerald-700 dark:text-emerald-400">
                        {formatMoney(payment.amount)}
                      </td>
                    </tr>
                  ))}
                  {customer.payments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-secondary">
                        No payment vouchers recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* VISITS TAB */}
          {activeTab === 'VISITS' && (
            <div className="overflow-x-auto rounded-xl border border-border-default">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-surface-inset shadow-inset text-xs font-bold uppercase tracking-wider text-secondary border-b border-border-default">
                  <tr>
                    <th className="px-6 py-3.5">Date & Time</th>
                    <th className="px-6 py-3.5">Outcome</th>
                    <th className="px-6 py-3.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default bg-surface-raised">
                  {customer.visits.map((visit: any) => (
                    <tr key={visit.id} className="hover:bg-surface-inset/40 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-primary">{new Date(visit.createdAt).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-3.5 font-bold text-primary">{visit.outcome}</td>
                      <td className="px-6 py-3.5 text-secondary">{visit.notes || 'Routine visit'}</td>
                    </tr>
                  ))}
                  {customer.visits.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-secondary">
                        No visits recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Adjust Opening Balance Modal */}
      {isAdjustModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => !adjustLoading && setIsAdjustModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-lg bg-surface-base border border-border-default rounded-3xl shadow-2xl p-6 overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border-default">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-700 dark:text-teal-400">
                  <Scale className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-primary font-sans">
                    Adjust Opening Balance
                  </h3>
                  <p className="text-xs text-secondary font-medium">
                    {customer.customerName} {customer.code ? `(${customer.code})` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                disabled={adjustLoading}
                className="p-1.5 rounded-xl text-secondary hover:text-primary hover:bg-surface-inset transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAdjustSubmit} className="mt-4 space-y-4">
              {adjustError && (
                <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs font-bold">
                  {adjustError}
                </div>
              )}

              {adjustSuccess && (
                <div className="p-3 rounded-xl bg-success/10 border border-success/30 text-success text-xs font-bold">
                  {adjustSuccess}
                </div>
              )}

              {/* Previous vs New comparison */}
              <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-default space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-secondary">Current Opening Balance:</span>
                  <span className="font-mono font-bold text-primary">
                    {formatMoney(customer.openingBalance)} ({customer.openingBalanceType})
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-secondary">Current Net Outstanding:</span>
                  <span className="font-mono font-bold text-teal-700 dark:text-teal-400">
                    {formatMoney(Math.abs(outstanding))} ({outstanding > 0 ? 'Dr' : outstanding < 0 ? 'Cr' : 'Settled'})
                  </span>
                </div>
              </div>

              {/* Amount & Type Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">
                    New Opening Balance (₹) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-inset border border-border-default text-sm font-mono font-bold text-primary focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                  />
                  <span className="text-[10px] text-muted font-medium mt-0.5 block">
                    Stored accurately as integer paise.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">
                    Balance Type <span className="text-danger">*</span>
                  </label>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-inset border border-border-default text-sm font-bold text-primary focus:outline-none focus:ring-2 focus:ring-teal-500/40 cursor-pointer"
                  >
                    <option value="DEBIT">DEBIT (Customer owes us debt)</option>
                    <option value="CREDIT">CREDIT (Advance credit)</option>
                  </select>
                </div>
              </div>

              {/* Mandatory Reason */}
              <div>
                <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">
                  Audit Reason <span className="text-danger">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Physical register ledger book verification #14 carried forward"
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-inset border border-border-default text-xs font-medium text-primary focus:outline-none focus:ring-2 focus:ring-teal-500/40 resize-none"
                />
              </div>

              {/* Safety Notice */}
              <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
                <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Financial Safety:</strong> Modifying the brought-forward debt amount updates the starting ledger baseline. All historical sales invoices, items, and payment transactions remain strictly unchanged.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  disabled={adjustLoading}
                  className="px-4 py-2 rounded-xl border border-border-default bg-surface-raised hover:bg-surface-inset text-secondary text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-800 dark:bg-teal-700 hover:bg-teal-900 text-white text-xs font-bold shadow-raised transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {adjustLoading ? 'Updating...' : 'Save & Log Audit Trail'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
