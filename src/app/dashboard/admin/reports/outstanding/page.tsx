import { prisma } from '@/lib/db';
import { formatMoney } from '@/lib/format';
import { calculateOutstanding } from '@/lib/outstanding';
import Link from 'next/link';

export default async function OutstandingReportPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const resolvedParams = await searchParams;
  const salesmanId = resolvedParams.salesmanId;
  const routeId = resolvedParams.routeId;
  const outstandingOnly = resolvedParams.outstandingOnly !== 'false';

  const where: any = { status: 'ACTIVE' };
  if (salesmanId) where.salesmanId = salesmanId;
  if (routeId) where.routeId = routeId;

  const customers = await prisma.customer.findMany({
    where,
    include: {
      salesman: true,
      route: true,
      city: true,
      state: true,
      sales: { select: { totalAmount: true } },
      payments: { select: { amount: true } }
    }
  });

  let reportData = customers.map(c => {
    // Note: This relies on the sum calculation version of calculateOutstanding. 
    // In actual production we might fetch all sales/payments if the calculation is more complex, 
    // but totalAmount/amount is enough for the simple sum method.
    const outstanding = calculateOutstanding(c as any);
    const totalSales = c.sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalPayments = c.payments.reduce((sum, p) => sum + p.amount, 0);
    return { ...c, outstanding, totalSales, totalPayments };
  });

  if (outstandingOnly) {
    reportData = reportData.filter(c => c.outstanding > 0);
  }

  reportData.sort((a, b) => b.outstanding - a.outstanding);

  const salesmen = await prisma.salesman.findMany({ where: { isActive: true } });
  const routes = await prisma.route.findMany({ where: { isActive: true } });

  const totalMarketOutstanding = reportData.reduce((sum, c) => sum + c.outstanding, 0);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Outstanding Report</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Total Market Outstanding: <span className="font-bold text-alvoun-red ml-1">{formatMoney(totalMarketOutstanding)}</span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <form className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-950 p-1 rounded-md border border-slate-200 dark:border-slate-800 shadow-sm">
            <select name="salesmanId" defaultValue={salesmanId || ''} className="px-2 py-1.5 text-sm bg-transparent border-none focus:ring-0 focus:outline-none">
              <option value="">All Salesmen</option>
              {salesmen.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700"></div>
            <select name="routeId" defaultValue={routeId || ''} className="px-2 py-1.5 text-sm bg-transparent border-none focus:ring-0 focus:outline-none">
              <option value="">All Routes</option>
              {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700"></div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 px-2 cursor-pointer">
              <input type="checkbox" name="outstandingOnly" value="true" defaultChecked={outstandingOnly} className="rounded border-slate-300 dark:border-slate-700 text-alvoun-blue focus:ring-alvoun-blue" />
              Owing Only
            </label>
            <button type="submit" className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:bg-slate-700 rounded text-sm font-medium transition-colors">
              Filter
            </button>
          </form>
          <a href={`/api/admin/export?type=outstanding&salesmanId=${salesmanId||''}&routeId=${routeId||''}&outstandingOnly=${outstandingOnly}`} className="px-4 py-2 bg-alvoun-green/10 text-alvoun-green border border-alvoun-green/20 hover:bg-alvoun-green/20 rounded-md text-sm font-medium transition-colors whitespace-nowrap">
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
                <th className="px-6 py-3 text-right">Outstanding</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    No outstanding customers found for this criteria.
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
                      <div className="text-xs text-slate-500 dark:text-slate-400">{c.salesman.name}</div>
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-slate-700 dark:text-slate-300">{formatMoney(c.totalSales)}</td>
                    <td className="px-6 py-3 text-right font-medium text-alvoun-green">{formatMoney(c.totalPayments)}</td>
                    <td className="px-6 py-3 text-right font-bold text-alvoun-red">{formatMoney(c.outstanding)}</td>
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
