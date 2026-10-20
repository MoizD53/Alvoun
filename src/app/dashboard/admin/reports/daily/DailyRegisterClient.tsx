'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatMoney, formatNumber } from '@/lib/format';
import { ChevronDown, ChevronRight, Download, Calendar, DollarSign, Package, Users, CheckCircle2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';

export default function DailyRegisterClient({ 
  days, 
  products, 
  fromDate, 
  toDate,
  summary 
}: { 
  days: any[]; 
  products: any[]; 
  fromDate: string; 
  toDate: string;
  summary: any;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleDateChange = (key: 'from' | 'to', value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/dashboard/admin/reports/daily?${params.toString()}`);
  };

  const exportCsv = () => {
    let csv = `ALVOUN Daily Sales Register\nDate Range: ${fromDate} to ${toDate}\nGenerated: ${new Date().toLocaleString()}\n\n`;
    
    const headers = [
      'Date', 'Customer', 'Area', 
      ...products.map(p => `${p.name} Crates`), 
      'Total Crates', 'Sale Amount', 'Received', 'Due'
    ];
    csv += headers.join(',') + '\n';
    
    days.forEach(day => {
      day.customers.forEach((c: any) => {
        const row = [
          day.dateStr,
          `"${c.customerName}"`,
          `"${c.areaName}"`,
          ...products.map(p => c.productQuantities[p.id] || 0),
          c.totalCrates,
          c.saleAmount / 100,
          c.receivedAmount / 100,
          c.dueAmount / 100
        ];
        csv += row.join(',') + '\n';
      });

      const totalRow = [
        day.dateStr,
        '"DAY TOTAL"',
        '""',
        ...products.map(p => day.dayTotals.productQuantities[p.id] || 0),
        day.dayTotals.totalCrates,
        day.dayTotals.saleAmount / 100,
        day.dayTotals.receivedAmount / 100,
        day.dayTotals.dueAmount / 100
      ];
      csv += totalRow.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `alvoun_sales_register_${fromDate}_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Action Bar */}
      <div className="bg-surface-raised shadow-raised p-4 sm:p-5 rounded-2xl border border-border/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Daily Sales Register</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Operational day-by-day transaction logs and crate distribution</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          {/* Neumorphic Inset Date Capsule */}
          <div className="inline-flex items-center bg-surface-inset shadow-inset px-3 py-1.5 rounded-xl border border-border/40 gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">From</span>
              <input 
                type="date" 
                name="from" 
                defaultValue={fromDate} 
                onChange={(e) => handleDateChange('from', e.target.value)}
                className="w-[125px] text-xs font-semibold bg-transparent border-none focus:outline-none text-foreground cursor-pointer" 
              />
            </div>
            <div className="w-px h-5 bg-border/40" />
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">To</span>
              <input 
                type="date" 
                name="to" 
                defaultValue={toDate} 
                onChange={(e) => handleDateChange('to', e.target.value)}
                className="w-[125px] text-xs font-semibold bg-transparent border-none focus:outline-none text-foreground cursor-pointer" 
              />
            </div>
          </div>

          <button 
            onClick={exportCsv} 
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-surface-raised shadow-raised hover:shadow-raised-sm press-active border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-surface-raised shadow-raised p-4 rounded-2xl border border-border/40">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Total Sales</p>
          <p className="text-xl font-bold tracking-tight text-primary">{formatMoney(summary.salesAmount)}</p>
        </div>
        <div className="bg-surface-raised shadow-raised p-4 rounded-2xl border border-border/40">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Collection</p>
          <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{formatMoney(summary.collectionAmount)}</p>
        </div>
        <div className="bg-surface-raised shadow-raised p-4 rounded-2xl border border-border/40">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Due from Sales</p>
          <p className="text-xl font-bold tracking-tight text-destructive">{formatMoney(summary.dueAmount)}</p>
        </div>
        <div className="bg-surface-raised shadow-raised p-4 rounded-2xl border border-border/40">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Total Crates</p>
          <p className="text-xl font-bold tracking-tight text-foreground">{formatNumber(summary.totalCrates)}</p>
        </div>
        <div className="bg-surface-raised shadow-raised p-4 rounded-2xl border border-border/40">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Visits</p>
          <p className="text-xl font-bold tracking-tight text-foreground">{formatNumber(summary.visits)}</p>
        </div>
        <div className="bg-surface-raised shadow-raised p-4 rounded-2xl border border-border/40">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Unique Accounts</p>
          <p className="text-xl font-bold tracking-tight text-foreground">{formatNumber(summary.uniqueCustomers)}</p>
        </div>
      </div>

      {/* Main Register Days */}
      {days.length === 0 ? (
        <div className="bg-surface-raised shadow-raised rounded-2xl border border-border/40 p-8">
          <EmptyState
            icon={<Calendar className="w-8 h-8 text-primary" />}
            title="No Sales Recorded"
            description={`No transactions or visits found between ${fromDate} and ${toDate}.`}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {days.map(day => (
            <DaySection key={day.dateStr} day={day} products={products} />
          ))}
        </div>
      )}
    </div>
  );
}

function DaySection({ day, products }: { day: any; products: any[] }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-surface-raised shadow-raised rounded-2xl border border-border/40 overflow-hidden">
      <div 
        className="flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-surface-inset/30 transition-colors select-none"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-surface-inset shadow-inset border border-border/40 flex items-center justify-center text-primary">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground tracking-tight">
              {new Date(day.dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
            </h3>
            <span className="text-xs text-muted-foreground">{day.customers.length} {day.customers.length === 1 ? 'customer visited' : 'customers visited'}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-base font-bold text-primary">
            {formatMoney(day.dayTotals.saleAmount)}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatNumber(day.dayTotals.totalCrates)} crates sold
          </div>
        </div>
      </div>

      {open && (
        <div className="overflow-x-auto border-t border-border/40">
          <table className="w-full text-xs sm:text-sm text-left whitespace-nowrap">
            <thead className="bg-surface-inset shadow-inset text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
              <tr>
                <th className="px-4 py-3.5">Customer</th>
                <th className="px-4 py-3.5">Area</th>
                {products.map(p => (
                  <th key={p.id} className="px-4 py-3.5 text-center">{p.name}</th>
                ))}
                <th className="px-4 py-3.5 text-center">Total Crates</th>
                <th className="px-4 py-3.5 text-right">Sale Amount</th>
                <th className="px-4 py-3.5 text-right">Received</th>
                <th className="px-4 py-3.5 text-right">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-surface-raised">
              {day.customers.map((c: any) => (
                <CustomerRow key={c.customerId} customer={c} products={products} />
              ))}
            </tbody>
            <tfoot className="bg-surface-inset shadow-inset font-bold border-t border-border/40 text-foreground">
              <tr>
                <td colSpan={2} className="px-4 py-3.5 text-xs tracking-wider uppercase text-muted-foreground">Day Total</td>
                {products.map(p => (
                  <td key={p.id} className="px-4 py-3.5 text-center font-bold text-foreground">{formatNumber(day.dayTotals.productQuantities[p.id] || 0)}</td>
                ))}
                <td className="px-4 py-3.5 text-center font-bold text-foreground">{formatNumber(day.dayTotals.totalCrates)}</td>
                <td className="px-4 py-3.5 text-right text-primary font-bold">{formatMoney(day.dayTotals.saleAmount)}</td>
                <td className="px-4 py-3.5 text-right text-emerald-600 dark:text-emerald-400 font-bold">{formatMoney(day.dayTotals.receivedAmount)}</td>
                <td className="px-4 py-3.5 text-right text-destructive font-bold">{formatMoney(day.dayTotals.dueAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function CustomerRow({ customer, products }: { customer: any; products: any[] }) {
  const [expanded, setExpanded] = useState(false);
  const hasTransactions = customer.transactions && customer.transactions.length > 0;

  return (
    <>
      <tr 
        className={`hover:bg-surface-inset/30 transition-colors ${hasTransactions ? 'cursor-pointer' : ''}`}
        onClick={() => hasTransactions && setExpanded(!expanded)}
      >
        <td className="px-4 py-3 font-semibold text-foreground flex items-center gap-2">
          {hasTransactions && (
            <span className="text-muted-foreground">
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </span>
          )}
          {customer.customerName}
        </td>
        <td className="px-4 py-3 text-muted-foreground">{customer.areaName}</td>
        {products.map(p => (
          <td key={p.id} className="px-4 py-3 text-center text-muted-foreground">{formatNumber(customer.productQuantities[p.id] || 0)}</td>
        ))}
        <td className="px-4 py-3 text-center font-bold text-foreground">{formatNumber(customer.totalCrates)}</td>
        <td className="px-4 py-3 text-right font-semibold text-foreground">{formatMoney(customer.saleAmount)}</td>
        <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatMoney(customer.receivedAmount)}</td>
        <td className="px-4 py-3 text-right font-bold text-destructive">{formatMoney(customer.dueAmount)}</td>
      </tr>
      
      {expanded && hasTransactions && (
        <tr className="bg-surface-inset/40">
          <td colSpan={6 + products.length} className="px-6 py-3 pb-4">
            <div className="space-y-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Transactions Log</h4>
              <div className="space-y-1.5">
                {customer.transactions.map((tx: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 text-xs bg-surface-raised shadow-raised-sm rounded-xl p-2.5 border border-border/40">
                    <span className="font-mono text-muted-foreground w-14">{tx.time}</span>
                    <Badge variant={tx.type === 'SALE' ? 'teal' : 'success'} size="sm">
                      {tx.type}
                    </Badge>
                    <span className="flex-1 text-foreground font-medium">
                      {tx.type === 'SALE' 
                        ? `Invoice #${tx.id.slice(-6)} — ${formatMoney(tx.amount)}` 
                        : `Payment Collected — ${formatMoney(tx.amount)}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
