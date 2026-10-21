'use client';

import { useState } from 'react';
import { formatMoney } from '@/lib/format';
import { calculateOutstanding } from '@/lib/outstanding';
import { 
  Phone, CreditCard, Edit, MapPin, 
  ShoppingBag, ArrowLeft,
  CheckCircle2, AlertCircle, Building2,
  Calendar, Clock, User
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import CustomerPricingSection from './CustomerPricingSection';

export default function CustomerWorkspace({ customer }: { customer: any }) {
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const outstanding = calculateOutstanding(customer);
  const isNegative = outstanding > 0; // Positive outstanding means customer owes us

  const tabs = [
    { id: 'OVERVIEW', label: 'Overview' },
    { id: 'PRICING', label: 'Product Rates' },
    { id: 'LEDGER', label: 'Ledger' },
    { id: 'SALES', label: 'Sales' },
    { id: 'PAYMENTS', label: 'Payments' },
    { id: 'VISITS', label: 'Visits' },
  ];

  const totalSales = customer.sales.reduce((sum: number, s: any) => sum + s.totalAmount, 0);
  const totalPayments = customer.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
  
  const lastVisit = customer.visits?.[0]?.createdAt ? new Date(customer.visits[0].createdAt).toLocaleDateString() : 'Never';
  const lastPayment = customer.payments?.[0]?.paymentDate ? new Date(customer.payments[0].paymentDate).toLocaleDateString() : 'None';

  // Build Ledger
  const ledgerEntries = [
    {
      id: 'opening',
      date: customer.createdAt,
      type: 'OPENING BALANCE',
      description: 'Opening Balance',
      amount: customer.openingBalance,
      isCredit: customer.openingBalanceType === 'CREDIT',
    },
    ...customer.sales.map((s: any) => ({
      id: `sale-${s.id}`,
      date: s.saleDate || s.createdAt,
      type: 'SALE',
      description: `Sale #${s.id.slice(-6)}`,
      amount: s.totalAmount,
      isCredit: false,
    })),
    ...customer.payments.map((p: any) => ({
      id: `payment-${p.id}`,
      date: p.paymentDate || p.createdAt,
      type: 'PAYMENT',
      description: `Payment (${p.paymentMethod || 'Cash'})`,
      amount: p.amount,
      isCredit: true,
    }))
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningBalance = ledgerEntries.length > 0 && ledgerEntries[0].isCredit ? ledgerEntries[0].amount : (ledgerEntries.length > 0 ? -ledgerEntries[0].amount : 0);
  const ledgerWithBalance = ledgerEntries.map((entry, index) => {
    if (index > 0) {
      if (entry.isCredit) runningBalance += entry.amount;
      else runningBalance -= entry.amount;
    }
    return { ...entry, balance: runningBalance };
  }).reverse(); // Newest first

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Back Button */}
      <div>
        <Link 
          href="/dashboard/admin/customers" 
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-surface-raised shadow-raised hover:shadow-raised-sm press-active rounded-xl border border-border/40 transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Customers
        </Link>
      </div>

      {/* Header Workspace Card */}
      <div className="bg-surface-raised shadow-raised rounded-2xl border border-border/40 overflow-hidden">
        <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{customer.customerName}</h1>
              <Badge variant={customer.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
                {customer.status}
              </Badge>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
              <a 
                href={`tel:${customer.contact}`} 
                className="flex items-center gap-1.5 hover:text-primary transition-colors"
              >
                <Phone className="h-4 w-4 text-primary" /> {customer.contact}
              </a>
              <span className="hidden sm:inline text-border">•</span>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary" /> {customer.address}, {customer.city?.name || ''}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <a 
              href={`tel:${customer.contact}`} 
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-surface-raised shadow-raised hover:shadow-raised-sm press-active border border-border/40 text-foreground rounded-xl text-sm font-semibold transition-all"
            >
              <Phone className="h-4 w-4 text-primary" /> Call
            </a>
            <Link 
              href={`/dashboard/admin/customers/${customer.id}/edit`} 
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary shadow-raised hover:shadow-raised-sm press-active text-primary-foreground rounded-xl text-sm font-semibold transition-all"
            >
              <Edit className="h-4 w-4" /> Edit Profile
            </Link>
          </div>
        </div>
        
        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-t border-border/40 divide-y md:divide-y-0 md:divide-x divide-border/40 bg-surface-inset/40">
          <div className="p-5 md:p-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Outstanding Dues</div>
            <div className={`text-2xl font-bold tracking-tight ${isNegative ? 'text-destructive' : 'text-primary'}`}>
              {formatMoney(Math.abs(outstanding))}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
              {outstanding > 0 ? 'To Receive (Debit)' : outstanding < 0 ? 'In Advance (Credit)' : 'Settled'}
            </div>
          </div>
          <div className="p-5 md:p-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Sales</div>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatMoney(totalSales)}
            </div>
          </div>
          <div className="p-5 md:p-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Last Payment</div>
            <div className="text-lg font-bold text-foreground mt-0.5">
              {lastPayment}
            </div>
          </div>
          <div className="p-5 md:p-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Last Visit</div>
            <div className="text-lg font-bold text-foreground mt-0.5">
              {lastVisit}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Container */}
      <div className="bg-surface-raised shadow-raised rounded-2xl border border-border/40 overflow-hidden">
        {/* Neumorphic Tab Bar */}
        <div className="p-3 border-b border-border/40 bg-surface-inset/30">
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    isActive 
                      ? 'bg-surface-raised shadow-raised text-primary border border-border/40' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-surface-raised/40'
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Assignment Details</h3>
                <div className="bg-surface-inset shadow-inset rounded-2xl p-5 border border-border/40 space-y-4">
                  <div className="grid grid-cols-3 pb-3 border-b border-border/40">
                    <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Route</dt>
                    <dd className="col-span-2 text-sm font-semibold text-foreground">{customer.route?.name || 'Unassigned'}</dd>
                  </div>
                  <div className="grid grid-cols-3 pb-3 border-b border-border/40">
                    <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Salesman</dt>
                    <dd className="col-span-2 text-sm font-semibold text-foreground">{customer.salesman?.name || 'Unassigned'}</dd>
                  </div>
                  <div className="grid grid-cols-3">
                    <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</dt>
                    <dd className="col-span-2 text-sm font-medium text-foreground">{customer.city?.name || 'Unknown'}, {customer.state?.name || 'Unknown'}</dd>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Activity</h3>
                <div className="bg-surface-inset shadow-inset rounded-2xl p-5 border border-border/40">
                  {customer.sales?.[0] ? (
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-surface-raised shadow-raised border border-border/40 flex items-center justify-center text-primary shrink-0">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground text-sm">Sale Recorded</span>
                          <span className="text-xs text-muted-foreground">{new Date(customer.sales[0].saleDate || customer.sales[0].createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Total Amount: <span className="font-semibold text-primary">{formatMoney(customer.sales[0].totalAmount)}</span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">No recent activity recorded.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* LEDGER TAB */}
          {activeTab === 'LEDGER' && (
            <div className="overflow-x-auto rounded-xl border border-border/40">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-surface-inset shadow-inset text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
                  <tr>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Description</th>
                    <th className="px-6 py-3.5 text-right">Debit (Owed)</th>
                    <th className="px-6 py-3.5 text-right">Credit (Paid)</th>
                    <th className="px-6 py-3.5 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 bg-surface-raised">
                  {ledgerWithBalance.map((entry: any) => (
                    <tr key={entry.id} className="hover:bg-surface-inset/30 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-foreground">{new Date(entry.date).toLocaleDateString()}</td>
                      <td className="px-6 py-3.5 text-foreground">{entry.description}</td>
                      <td className="px-6 py-3.5 text-right font-medium text-muted-foreground">
                        {!entry.isCredit ? formatMoney(entry.amount) : '-'}
                      </td>
                      <td className="px-6 py-3.5 text-right font-medium text-emerald-600 dark:text-emerald-400">
                        {entry.isCredit ? formatMoney(entry.amount) : '-'}
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-foreground">
                        <span className={entry.balance < 0 ? 'text-destructive' : 'text-primary'}>
                          {formatMoney(Math.abs(entry.balance))} {entry.balance < 0 ? 'Dr' : 'Cr'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {ledgerWithBalance.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                        No ledger entries found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* SALES TAB */}
          {activeTab === 'SALES' && (
            <div className="overflow-x-auto rounded-xl border border-border/40">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-surface-inset shadow-inset text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
                  <tr>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Items</th>
                    <th className="px-6 py-3.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 bg-surface-raised">
                  {customer.sales.map((sale: any) => (
                    <tr key={sale.id} className="hover:bg-surface-inset/30 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-foreground">{new Date(sale.saleDate || sale.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-3.5 text-muted-foreground">
                        {sale.items.map((i: any) => `${i.crates}x crates`).join(', ')}
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-foreground">
                        {formatMoney(sale.totalAmount)}
                      </td>
                    </tr>
                  ))}
                  {customer.sales.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground">
                        No sales recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* PAYMENTS TAB */}
          {activeTab === 'PAYMENTS' && (
            <div className="overflow-x-auto rounded-xl border border-border/40">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-surface-inset shadow-inset text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
                  <tr>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Method</th>
                    <th className="px-6 py-3.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 bg-surface-raised">
                  {customer.payments.map((payment: any) => (
                    <tr key={payment.id} className="hover:bg-surface-inset/30 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-foreground">{new Date(payment.paymentDate || payment.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-3.5">
                        <Badge variant="neutral" styleType="outline" size="sm">
                          {payment.paymentMethod || 'Cash'}
                        </Badge>
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(payment.amount)}
                      </td>
                    </tr>
                  ))}
                  {customer.payments.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground">
                        No payments recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* VISITS TAB */}
          {activeTab === 'VISITS' && (
            <div className="overflow-x-auto rounded-xl border border-border/40">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-surface-inset shadow-inset text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
                  <tr>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Time</th>
                    <th className="px-6 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 bg-surface-raised">
                  {customer.visits.map((visit: any) => (
                    <tr key={visit.id} className="hover:bg-surface-inset/30 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-foreground">{new Date(visit.startedAt || visit.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-3.5 text-muted-foreground">{new Date(visit.startedAt || visit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-6 py-3.5">
                        <Badge variant="success" size="sm" className="gap-1.5">
                          <CheckCircle2 className="h-3 w-3" />
                          Visited
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {customer.visits.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground">
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
    </div>
  );
}
