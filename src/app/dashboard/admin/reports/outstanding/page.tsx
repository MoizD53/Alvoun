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
    const outstanding = calculateOutstanding(c);
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold text-slate-900">Customer Outstanding Report</h2>
        <div className="flex items-center gap-3">
          <form className="flex flex-wrap items-center gap-2">
            <select name="salesmanId" defaultValue={salesmanId || ''} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50">
              <option value="">All Salesmen</option>
              {salesmen.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select name="routeId" defaultValue={routeId || ''} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50">
              <option value="">All Routes</option>
              {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" name="outstandingOnly" value="true" defaultChecked={outstandingOnly} className="rounded text-alvoun-blue focus:ring-alvoun-blue" />
              Outstanding Only
            </label>
            <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium">Filter</button>
          </form>
          <a href={`/api/admin/export?type=outstanding&salesmanId=${salesmanId||''}&routeId=${routeId||''}&outstandingOnly=${outstandingOnly}`} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 whitespace-nowrap">
            Export Excel
          </a>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-medium border-y border-slate-100 whitespace-nowrap">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">City / Route</th>
              <th className="px-4 py-3">Salesman</th>
              <th className="px-4 py-3 text-right">Opening Bal.</th>
              <th className="px-4 py-3 text-right">Total Sales</th>
              <th className="px-4 py-3 text-right">Total Pmt.</th>
              <th className="px-4 py-3 text-right text-red-600">Outstanding</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {reportData.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">No customers found.</td>
              </tr>
            ) : (
              reportData.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-900">{row.customerName}</td>
                  <td className="px-4 py-3">{row.contact}</td>
                  <td className="px-4 py-3">
                    <div>{row.city.name}</div>
                    <div className="text-xs text-slate-500">{row.route.name}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.salesman.name}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{formatMoney(row.openingBalance)} {row.openingBalanceType === 'DEBIT' ? 'Dr' : 'Cr'}</td>
                  <td className="px-4 py-3 text-right font-medium text-alvoun-blue">{formatMoney(row.totalSales)}</td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">{formatMoney(row.totalPayments)}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">{formatMoney(row.outstanding)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
