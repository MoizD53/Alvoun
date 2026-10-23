'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatMoney, formatNumber } from '@/lib/format';
import { 
  ChevronDown, 
  ChevronRight, 
  Download, 
  Calendar, 
  MapPin, 
  Navigation, 
  Layers, 
  Table, 
  ChevronLeft,
  Store,
  ReceiptText
} from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import AdminDatePicker from '../../components/AdminDatePicker';

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
  const [viewMode, setViewMode] = useState<'hierarchy' | 'flat'>('hierarchy');

  const currentDate = searchParams.get('date') || fromDate;

  // Strict Product Column Ordering: 1st 1L -> 2nd 500ml -> 3rd 250ml
  const sortedProducts = useMemo(() => {
    const getProductOrder = (name: string) => {
      const n = (name || '').toLowerCase();
      if (n.includes('1l') || n.includes('1 l') || n.includes('1000') || n.includes('1 litre') || n.includes('1ltr') || n.includes('1 liter')) return 1;
      if (n.includes('500')) return 2;
      if (n.includes('250')) return 3;
      return 4;
    };
    return [...products].sort((a, b) => getProductOrder(a.name) - getProductOrder(b.name));
  }, [products]);

  const handleDateChange = (dateVal: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('date', dateVal);
    params.delete('from');
    params.delete('to');
    router.push(`/dashboard/admin/reports/daily?${params.toString()}`);
  };

  const handleDayStep = (deltaDays: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + deltaDays);
    const newDateStr = d.toISOString().split('T')[0];
    handleDateChange(newDateStr);
  };

  const exportCsv = () => {
    let csv = `ALVOUN Daily Sales Register\nReporting Date: ${currentDate}\nGenerated: ${new Date().toLocaleString()}\n\n`;
    
    const headers = [
      'Date', 'Route', 'Area', 'Customer',
      ...sortedProducts.map(p => `${p.name} PKGs`),
      'Total PKGs', 'Sale Amount', 'Received', 'Due'
    ];
    csv += headers.join(',') + '\n';
    
    days.forEach(day => {
      day.routes.forEach((route: any) => {
        route.areas.forEach((area: any) => {
          area.customers.forEach((c: any) => {
            const row = [
              day.dateStr,
              `"${route.routeName}"`,
              `"${area.areaName}"`,
              `"${c.customerName}"`,
              ...sortedProducts.map(p => c.productQuantities[p.id] || 0),
              c.totalCrates,
              c.saleAmount / 100,
              c.receivedAmount / 100,
              c.dueAmount / 100
            ];
            csv += row.join(',') + '\n';
          });
        });
      });

      const totalRow = [
        day.dateStr,
        '"DAY TOTAL"',
        '""',
        '""',
        ...sortedProducts.map(p => day.dayTotals.productQuantities[p.id] || 0),
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
    link.setAttribute('download', `alvoun_sales_register_${currentDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Action Bar — Single Universal Calendar */}
      <div className="bg-surface-raised shadow-raised p-4 sm:p-5 rounded-2xl border border-border/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">Daily Sales Register</h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Operational sales organized by Route → Area → Customer
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Beige Admin Date Picker */}
          <AdminDatePicker 
            currentDate={currentDate} 
            basePath="/dashboard/admin/reports/daily" 
          />

          {/* View Mode Toggle: Hierarchical vs Flat Table */}
          <div className="inline-flex p-1 bg-surface-inset shadow-inset rounded-xl border border-border/40 gap-1 text-xs">
            <button
              onClick={() => setViewMode('hierarchy')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === 'hierarchy'
                  ? 'bg-primary text-primary-foreground shadow-raised-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Route Hierarchy</span>
            </button>
            <button
              onClick={() => setViewMode('flat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === 'flat'
                  ? 'bg-primary text-primary-foreground shadow-raised-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Flat Table</span>
            </button>
          </div>

          <button 
            onClick={exportCsv} 
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-surface-raised shadow-raised hover:shadow-raised-sm border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-surface-raised shadow-raised p-4 rounded-2xl border border-border/40">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Total Sales</p>
          <p className="text-xl font-bold tracking-tight text-primary tabular-nums">{formatMoney(summary.salesAmount)}</p>
        </div>
        <div className="bg-surface-raised shadow-raised p-4 rounded-2xl border border-border/40">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Collection</p>
          <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">{formatMoney(summary.collectionAmount)}</p>
        </div>
        <div className="bg-surface-raised shadow-raised p-4 rounded-2xl border border-border/40">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Due from Sales</p>
          <p className="text-xl font-bold tracking-tight text-destructive tabular-nums">{formatMoney(summary.dueAmount)}</p>
        </div>
        <div className="bg-surface-raised shadow-raised p-4 rounded-2xl border border-border/40">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Total PKGs</p>
          <p className="text-xl font-bold tracking-tight text-foreground tabular-nums">{formatNumber(summary.totalCrates)}</p>
        </div>
        <div className="bg-surface-raised shadow-raised p-4 rounded-2xl border border-border/40">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Visits</p>
          <p className="text-xl font-bold tracking-tight text-foreground tabular-nums">{formatNumber(summary.visits)}</p>
        </div>
        <div className="bg-surface-raised shadow-raised p-4 rounded-2xl border border-border/40">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Unique Accounts</p>
          <p className="text-xl font-bold tracking-tight text-foreground tabular-nums">{formatNumber(summary.uniqueCustomers)}</p>
        </div>
      </div>

      {/* Main Register Days */}
      {days.length === 0 ? (
        <div className="bg-surface-raised shadow-raised rounded-2xl border border-border/40 p-8">
          <EmptyState
            icon={<Calendar className="w-8 h-8 text-primary" />}
            title="No Sales Recorded"
            description={`No transactions or visits found on ${currentDate}. Select another date or check sales records.`}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {days.map(day => (
            <DayView 
              key={day.dateStr} 
              day={day} 
              products={sortedProducts} 
              viewMode={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DayView({ day, products, viewMode }: { day: any; products: any[]; viewMode: 'hierarchy' | 'flat' }) {
  const [dayExpanded, setDayExpanded] = useState(true);

  return (
    <div className="bg-surface-raised shadow-raised rounded-2xl border border-border/40 overflow-hidden">
      {/* Day Header */}
      <div 
        className="flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-surface-inset/30 transition-colors select-none"
        onClick={() => setDayExpanded(!dayExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-surface-inset shadow-inset border border-border/40 flex items-center justify-center text-primary">
            {dayExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground tracking-tight">
              {new Date(day.dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span>{day.routes?.length || 0} Routes</span>
              <span>•</span>
              <span>{day.customers.length} Customers Visited</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-base font-bold text-primary tabular-nums">
            {formatMoney(day.dayTotals.saleAmount)}
          </div>
          <div className="text-xs text-muted-foreground tabular-nums">
            {formatNumber(day.dayTotals.totalCrates)} PKGs sold
          </div>
        </div>
      </div>

      {dayExpanded && (
        <div className="border-t border-border/40">
          {viewMode === 'hierarchy' ? (
            /* Hierarchical View: Route -> Area -> Customer */
            <div className="p-4 sm:p-5 space-y-4 bg-background/50">
              {day.routes.map((route: any) => (
                <RouteCard key={route.routeId} route={route} products={products} />
              ))}
            </div>
          ) : (
            /* Flat Table View */
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left whitespace-nowrap">
                <thead className="bg-surface-inset shadow-inset text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
                  <tr>
                    <th className="px-4 py-3.5">Customer</th>
                    <th className="px-4 py-3.5">Route & Area</th>
                    {products.map(p => (
                      <th key={p.id} className="px-4 py-3.5 text-center">{p.name}</th>
                    ))}
                    <th className="px-4 py-3.5 text-center">Total PKGs</th>
                    <th className="px-4 py-3.5 text-right">Sale Amount</th>
                    <th className="px-4 py-3.5 text-right">Received</th>
                    <th className="px-4 py-3.5 text-right">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 bg-surface-raised">
                  {day.customers.map((c: any) => (
                    <CustomerTableRow key={c.customerId} customer={c} products={products} />
                  ))}
                </tbody>
                <tfoot className="bg-surface-inset shadow-inset font-bold border-t border-border/40 text-foreground">
                  <tr>
                    <td colSpan={2} className="px-4 py-3.5 text-xs tracking-wider uppercase text-muted-foreground">Day Total</td>
                    {products.map(p => (
                      <td key={p.id} className="px-4 py-3.5 text-center font-bold text-foreground tabular-nums">
                        {formatNumber(day.dayTotals.productQuantities[p.id] || 0)}
                      </td>
                    ))}
                    <td className="px-4 py-3.5 text-center font-bold text-foreground tabular-nums">
                      {formatNumber(day.dayTotals.totalCrates)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-primary font-bold tabular-nums">
                      {formatMoney(day.dayTotals.saleAmount)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                      {formatMoney(day.dayTotals.receivedAmount)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-destructive font-bold tabular-nums">
                      {formatMoney(day.dayTotals.dueAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ========================================================
   ROUTE LEVEL COMPONENT (Tier 1 Hierarchy)
   ======================================================== */
function RouteCard({ route, products }: { route: any; products: any[] }) {
  const [routeExpanded, setRouteExpanded] = useState(true);

  return (
    <div className="bg-surface-raised shadow-raised rounded-xl border border-border/50 overflow-hidden">
      {/* Route Bar */}
      <div 
        className="flex items-center justify-between p-3.5 sm:p-4 bg-surface-inset/20 hover:bg-surface-inset/40 cursor-pointer transition-colors"
        onClick={() => setRouteExpanded(!routeExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-surface-raised shadow-raised-sm flex items-center justify-center text-primary">
            {routeExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </div>
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm text-foreground">{route.routeName}</span>
            <Badge variant="neutral" size="sm">
              {route.areas.length} {route.areas.length === 1 ? 'Area' : 'Areas'}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="hidden sm:block text-right">
            <span className="text-muted-foreground">PKGs: </span>
            <span className="font-bold text-foreground tabular-nums">{formatNumber(route.totalCrates)}</span>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground hidden sm:inline">Sales: </span>
            <span className="font-bold text-primary tabular-nums">{formatMoney(route.totalSales)}</span>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground hidden sm:inline">Recv: </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatMoney(route.totalReceived)}</span>
          </div>
          {route.totalDue > 0 && (
            <div className="text-right">
              <span className="text-muted-foreground hidden sm:inline">Due: </span>
              <span className="font-bold text-destructive tabular-nums">{formatMoney(route.totalDue)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Areas under Route */}
      {routeExpanded && (
        <div className="p-3 sm:p-4 space-y-3 bg-surface-raised/40 border-t border-border/40">
          {route.areas.map((area: any) => (
            <AreaCard key={area.areaId} area={area} products={products} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ========================================================
   AREA LEVEL COMPONENT (Tier 2 Hierarchy)
   ======================================================== */
function AreaCard({ area, products }: { area: any; products: any[] }) {
  const [areaExpanded, setAreaExpanded] = useState(true);

  return (
    <div className="bg-surface-raised shadow-raised-sm rounded-lg border border-border/40 overflow-hidden">
      {/* Area Bar */}
      <div 
        className="flex items-center justify-between px-3 py-2.5 bg-surface-inset/30 hover:bg-surface-inset/50 cursor-pointer transition-colors"
        onClick={() => setAreaExpanded(!areaExpanded)}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded bg-surface-raised flex items-center justify-center text-muted-foreground">
            {areaExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </div>
          <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-semibold text-xs sm:text-sm text-foreground">{area.areaName}</span>
          <span className="text-[11px] text-muted-foreground">({area.customers.length} accounts)</span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">
            <strong className="text-foreground tabular-nums">{formatNumber(area.totalCrates)}</strong> PKGs
          </span>
          <span className="font-semibold text-primary tabular-nums">{formatMoney(area.totalSales)}</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatMoney(area.totalReceived)}</span>
          {area.totalDue > 0 && (
            <span className="font-semibold text-destructive tabular-nums">{formatMoney(area.totalDue)}</span>
          )}
        </div>
      </div>

      {/* Customers under Area */}
      {areaExpanded && (
        <div className="overflow-x-auto border-t border-border/30">
          <table className="w-full text-xs text-left whitespace-nowrap">
            <thead className="bg-surface-inset/40 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/30">
              <tr>
                <th className="px-3.5 py-2 font-semibold">Customer</th>
                {products.map(p => (
                  <th key={p.id} className="px-2.5 py-2 text-center font-semibold">{p.name}</th>
                ))}
                <th className="px-2.5 py-2 text-center font-semibold">Total PKGs</th>
                <th className="px-3 py-2 text-right font-semibold">Sale</th>
                <th className="px-3 py-2 text-right font-semibold">Received</th>
                <th className="px-3 py-2 text-right font-semibold">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {area.customers.map((c: any) => (
                <CustomerItemRow key={c.customerId} customer={c} products={products} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ========================================================
   CUSTOMER ROW IN HIERARCHY
   ======================================================== */
function CustomerItemRow({ customer, products }: { customer: any; products: any[] }) {
  const [expanded, setExpanded] = useState(false);
  const hasTransactions = customer.transactions && customer.transactions.length > 0;

  return (
    <>
      <tr 
        className={`hover:bg-surface-inset/30 transition-colors ${hasTransactions ? 'cursor-pointer' : ''}`}
        onClick={() => hasTransactions && setExpanded(!expanded)}
      >
        <td className="px-3.5 py-2.5 font-medium text-foreground flex items-center gap-2">
          {hasTransactions && (
            <span className="text-muted-foreground">
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </span>
          )}
          <Store className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span>{customer.customerName}</span>
          {customer.customerCode && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-inset text-muted-foreground font-mono">
              {customer.customerCode}
            </span>
          )}
        </td>
        {products.map(p => (
          <td key={p.id} className="px-2.5 py-2.5 text-center text-muted-foreground tabular-nums">
            {formatNumber(customer.productQuantities[p.id] || 0)}
          </td>
        ))}
        <td className="px-2.5 py-2.5 text-center font-bold text-foreground tabular-nums">
          {formatNumber(customer.totalCrates)}
        </td>
        <td className="px-3 py-2.5 text-right font-bold text-foreground tabular-nums">
          {formatMoney(customer.saleAmount)}
        </td>
        <td className="px-3 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
          {formatMoney(customer.receivedAmount)}
        </td>
        <td className="px-3 py-2.5 text-right font-black text-destructive tabular-nums">
          {customer.dueAmount > 0 ? formatMoney(customer.dueAmount) : '—'}
        </td>
      </tr>

      {expanded && hasTransactions && (
        <tr className="bg-surface-inset/30">
          <td colSpan={5 + products.length} className="px-5 py-2.5">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Transaction History
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {customer.transactions.map((tx: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-xs bg-surface-raised rounded-lg p-2 border border-border/30">
                    <span className="font-mono text-[11px] text-muted-foreground">{tx.time}</span>
                    <Badge variant={tx.type === 'SALE' ? 'teal' : 'success'} size="sm">
                      {tx.type}
                    </Badge>
                    <span className="flex-1 font-semibold text-foreground tabular-nums">
                      {tx.type === 'SALE' 
                        ? `Invoice #${tx.id.slice(-6)} • ${formatMoney(tx.amount)}` 
                        : `Collection • ${formatMoney(tx.amount)}`}
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

/* ========================================================
   CUSTOMER ROW IN FLAT TABLE
   ======================================================== */
function CustomerTableRow({ customer, products }: { customer: any; products: any[] }) {
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
        <td className="px-4 py-3 text-muted-foreground text-xs">
          <span className="font-medium text-foreground">{customer.routeName}</span>
          <span className="mx-1">•</span>
          <span>{customer.areaName}</span>
        </td>
        {products.map(p => (
          <td key={p.id} className="px-4 py-3 text-center text-muted-foreground tabular-nums">
            {formatNumber(customer.productQuantities[p.id] || 0)}
          </td>
        ))}
        <td className="px-4 py-3 text-center font-bold text-foreground tabular-nums">
          {formatNumber(customer.totalCrates)}
        </td>
        <td className="px-4 py-3 text-right font-bold text-foreground tabular-nums">
          {formatMoney(customer.saleAmount)}
        </td>
        <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
          {formatMoney(customer.receivedAmount)}
        </td>
        <td className="px-4 py-3 text-right font-black text-destructive tabular-nums">
          {formatMoney(customer.dueAmount)}
        </td>
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
                    <span className="flex-1 text-foreground font-medium tabular-nums">
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
