import { prisma } from '@/lib/db';
import { formatMoney } from '@/lib/format';
import { calculateOutstanding } from '@/lib/outstanding';
import Link from 'next/link';
import { ArrowLeft, Download, CreditCard, ChevronRight } from 'lucide-react';
import OutstandingFilterBar from './OutstandingFilterBar';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';

export default async function OutstandingReportPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const resolvedParams = await searchParams;
  const salesmanId = resolvedParams.salesmanId;
  const routeId = resolvedParams.routeId;
  const outstandingOnly = resolvedParams.outstandingOnly !== 'false';
  const fromDate = resolvedParams.from || '';
  const toDate = resolvedParams.to || '';

  const where: any = { status: 'ACTIVE' };
  if (salesmanId) where.salesmanId = salesmanId;
  if (routeId) where.routeId = routeId;

  const salesDateFilter: any = {};
  const paymentsDateFilter: any = {};
  if (fromDate) {
    salesDateFilter.gte = new Date(`${fromDate}T00:00:00+05:30`);
    paymentsDateFilter.gte = new Date(`${fromDate}T00:00:00+05:30`);
  }
  if (toDate) {
    salesDateFilter.lte = new Date(`${toDate}T23:59:59+05:30`);
    paymentsDateFilter.lte = new Date(`${toDate}T23:59:59+05:30`);
  }

  const customers = await prisma.customer.findMany({
    where,
    include: {
      salesman: true,
      route: true,
      city: true,
      state: true,
      sales: { 
        select: { totalAmount: true, saleDate: true },
        orderBy: { saleDate: 'desc' }
      },
      payments: { 
        select: { amount: true, paymentDate: true },
        orderBy: { paymentDate: 'desc' }
      }
    }
  });

  const filterStartDate = fromDate ? new Date(`${fromDate}T00:00:00+05:30`) : null;
  const filterEndDate = toDate ? new Date(`${toDate}T23:59:59+05:30`) : null;

  let reportData = customers.map(c => {
    const totalLifetimeSales = c.sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalLifetimePayments = c.payments.reduce((sum, p) => sum + p.amount, 0);
    const base = c.openingBalanceType === 'DEBIT' ? c.openingBalance : -c.openingBalance;
    const outstanding = base + totalLifetimeSales - totalLifetimePayments;

    const periodSalesList = (filterStartDate || filterEndDate)
      ? c.sales.filter(s => {
          const d = new Date(s.saleDate);
          if (filterStartDate && d < filterStartDate) return false;
          if (filterEndDate && d > filterEndDate) return false;
          return true;
        })
      : c.sales;

    const periodPaymentsList = (filterStartDate || filterEndDate)
      ? c.payments.filter(p => {
          const d = new Date(p.paymentDate);
          if (filterStartDate && d < filterStartDate) return false;
          if (filterEndDate && d > filterEndDate) return false;
          return true;
        })
      : c.payments;

    const totalSales = periodSalesList.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalPayments = periodPaymentsList.reduce((sum, p) => sum + p.amount, 0);
    const periodDues = totalSales - totalPayments;

    const lastSaleDate = c.sales[0]?.saleDate ? new Date(c.sales[0].saleDate) : null;
    const lastPaymentDate = c.payments[0]?.paymentDate ? new Date(c.payments[0].paymentDate) : null;
    
    let lastDate: Date | null = null;
    if (lastSaleDate && lastPaymentDate) {
      lastDate = lastSaleDate > lastPaymentDate ? lastSaleDate : lastPaymentDate;
    } else {
      lastDate = lastSaleDate || lastPaymentDate;
    }

    return { 
      ...c, 
      outstanding, 
      totalSales, 
      totalPayments, 
      periodDues,
      lastDate: lastDate ? lastDate.toLocaleDateString('en-IN') : '-'
    };
  });

  if (outstandingOnly) {
    reportData = reportData.filter(c => fromDate || toDate ? c.periodDues > 0 || c.outstanding > 0 : c.outstanding > 0);
  }

  reportData.sort((a, b) => b.outstanding - a.outstanding);

  const salesmen = await prisma.salesman.findMany({ where: { isActive: true } });
  const routes = await prisma.route.findMany({ where: { isActive: true } });

  const totalMarketOutstanding = reportData.reduce((sum, c) => sum + c.outstanding, 0);
  const totalPeriodDues = reportData.reduce((sum, c) => sum + c.periodDues, 0);

  return (
    <div className="space-y-6">
      {/* Header and Filter Card */}
      <div className="bg-surface-raised shadow-raised p-5 sm:p-6 rounded-2xl border border-border/40 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard/admin" 
              className="p-2.5 bg-surface-raised shadow-raised hover:shadow-raised-sm press-active rounded-xl text-muted-foreground hover:text-foreground transition-all border border-border/40"
              aria-label="Back to Admin Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Market Outstanding & Dues</h1>
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground mt-0.5">
                <span>
                  Total Market Dues: <span className="font-bold text-destructive text-base ml-1">{formatMoney(totalMarketOutstanding)}</span>
                </span>
                {(fromDate || toDate) && (
                  <span>
                    • Period Net Dues: <span className="font-bold text-amber-600 dark:text-amber-400 ml-1">{formatMoney(totalPeriodDues)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <a 
              href={`/api/admin/export?type=outstanding&salesmanId=${salesmanId||''}&routeId=${routeId||''}&outstandingOnly=${outstandingOnly}`} 
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-surface-raised shadow-raised hover:shadow-raised-sm press-active border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap"
            >
              <Download className="h-4 w-4" /> Export CSV
            </a>
          </div>
        </div>

        {/* Filters */}
        <div className="pt-2 border-t border-border/40 flex justify-end">
          <OutstandingFilterBar 
            fromDate={fromDate}
            toDate={toDate}
            salesmanId={salesmanId}
            routeId={routeId}
            outstandingOnly={outstandingOnly}
            salesmen={salesmen}
            routes={routes}
          />
        </div>
      </div>

      {/* Outstanding Table Card */}
      <div className="bg-surface-raised shadow-raised rounded-2xl border border-border/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left whitespace-nowrap">
            <thead className="bg-surface-inset shadow-inset text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
              <tr>
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5">Route / Salesman</th>
                <th className="px-5 py-3.5 text-right">Total Sales</th>
                <th className="px-5 py-3.5 text-right">Total Payments</th>
                <th className="px-5 py-3.5 text-center">Last Active Date</th>
                <th className="px-5 py-3.5 text-right">Total Dues</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-surface-raised">
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    <EmptyState
                      icon={<CreditCard className="w-8 h-8 text-primary" />}
                      title="No Outstanding Dues"
                      description="No active customer accounts match the selected filters or outstanding criteria."
                    />
                  </td>
                </tr>
              ) : (
                reportData.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-inset/30 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="font-bold text-foreground text-sm tracking-tight">{c.customerName}</div>
                      <div className="text-xs text-muted-foreground">{c.city.name}, {c.state.name}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-foreground">{c.route.name}</div>
                      <div className="text-xs text-muted-foreground">{c.salesman?.name || 'Unassigned'}</div>
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-foreground">{formatMoney(c.totalSales)}</td>
                    <td className="px-5 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(c.totalPayments)}</td>
                    <td className="px-5 py-4 text-center text-xs text-muted-foreground">{c.lastDate}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="font-bold text-destructive text-sm">{formatMoney(c.outstanding)}</div>
                      {(fromDate || toDate) && (
                        <div className="text-[11px] text-muted-foreground">
                          Period: {formatMoney(c.periodDues)}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link 
                        href={`/dashboard/admin/customers/${c.id}`} 
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        Profile <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
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
