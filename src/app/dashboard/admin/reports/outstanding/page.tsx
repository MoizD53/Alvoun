import { prisma } from '@/lib/db';
import { formatMoney } from '@/lib/format';
import { calculateOutstanding } from '@/lib/outstanding';
import Link from 'next/link';
import OutstandingFilterBar from './OutstandingFilterBar';

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
        where: Object.keys(salesDateFilter).length > 0 ? { saleDate: salesDateFilter } : undefined,
        select: { totalAmount: true, saleDate: true },
        orderBy: { saleDate: 'desc' }
      },
      payments: { 
        where: Object.keys(paymentsDateFilter).length > 0 ? { paymentDate: paymentsDateFilter } : undefined,
        select: { amount: true, paymentDate: true },
        orderBy: { paymentDate: 'desc' }
      }
    }
  });

  let reportData = customers.map(c => {
    const outstanding = calculateOutstanding(c as any);
    const totalSales = c.sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalPayments = c.payments.reduce((sum, p) => sum + p.amount, 0);
    const periodDues = totalSales - totalPayments;

    // Get last active transaction date in this period or overall
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
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Dues Report</h1>
          <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mt-1">
            <span>
              Total Market Dues: <span className="font-bold text-alvoun-red ml-1">{formatMoney(totalMarketOutstanding)}</span>
            </span>
            {(fromDate || toDate) && (
              <span>
                • Period Net Dues: <span className="font-bold text-amber-600 ml-1">{formatMoney(totalPeriodDues)}</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <OutstandingFilterBar 
            fromDate={fromDate}
            toDate={toDate}
            salesmanId={salesmanId}
            routeId={routeId}
            outstandingOnly={outstandingOnly}
            salesmen={salesmen}
            routes={routes}
          />
          <a href={`/api/admin/export?type=outstanding&salesmanId=${salesmanId||''}&routeId=${routeId||''}&outstandingOnly=${outstandingOnly}`} className="px-4 py-2 bg-alvoun-green/10 text-alvoun-green border border-alvoun-green/20 hover:bg-alvoun-green/20 rounded-xl text-sm font-bold transition-colors whitespace-nowrap">
            Export CSV
          </a>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Route / Salesman</th>
                <th className="px-6 py-3 text-right">Total Sales</th>
                <th className="px-6 py-3 text-right">Total Payments</th>
                <th className="px-6 py-3 text-center">Last Active Date</th>
                <th className="px-6 py-3 text-right">Total Dues</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    No customers with dues found for this criteria.
                  </td>
                </tr>
              ) : (
                reportData.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors group">
                    <td className="px-6 py-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{c.customerName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{c.city.name}, {c.state.name}</div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="font-medium text-slate-700 dark:text-slate-300">{c.route.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{c.salesman?.name}</div>
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-slate-700 dark:text-slate-300">{formatMoney(c.totalSales)}</td>
                    <td className="px-6 py-3 text-right font-medium text-alvoun-green">{formatMoney(c.totalPayments)}</td>
                    <td className="px-6 py-3 text-center text-xs text-slate-500 dark:text-slate-400">{c.lastDate}</td>
                    <td className="px-6 py-3 text-right font-bold text-alvoun-red">
                      <div>{formatMoney(c.outstanding)}</div>
                      {(fromDate || toDate) && (
                        <div className="text-[11px] font-normal text-slate-400">
                          Period: {formatMoney(c.periodDues)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link href={`/dashboard/admin/customers/${c.id}`} className="text-alvoun-blue hover:text-alvoun-dark font-medium text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        View Profile
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
