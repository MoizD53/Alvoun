import { prisma } from '@/lib/db';
import { getKolkataMonthBoundaries, getKolkataTimeDetails, getCurrentKolkataTime } from '@/lib/time';
import { formatMoney, formatNumber } from '@/lib/format';
import Link from 'next/link';

export default async function DailyReportsPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const resolvedParams = await searchParams;
  const now = getCurrentKolkataTime();
  const currentDetails = getKolkataTimeDetails(now);
  
  const year = parseInt(resolvedParams.year || String(currentDetails.year));
  const month = parseInt(resolvedParams.month || String(currentDetails.month));

  const { start, end } = getKolkataMonthBoundaries(year, month);

  const [sales, payments, visits] = await Promise.all([
    prisma.sale.findMany({
      where: { saleDate: { gte: start, lte: end } },
      include: { items: true }
    }),
    prisma.payment.findMany({
      where: { paymentDate: { gte: start, lte: end } }
    }),
    prisma.visit.findMany({
      where: { createdAt: { gte: start, lte: end } }
    })
  ]);

  const daysMap = new Map();

  // Helper to get local date string YYYY-MM-DD reliably from UTC ISO stored locally
  const getDateStr = (d: Date) => d.toISOString().split('T')[0];

  const ensureDay = (date: Date) => {
    const dateStr = getDateStr(date);
    if (!daysMap.has(dateStr)) {
      daysMap.set(dateStr, {
        dateStr,
        salesAmount: 0,
        collectionAmount: 0,
        numSales: 0,
        visits: 0,
        crates: 0
      });
    }
    return daysMap.get(dateStr);
  };

  sales.forEach((s: any) => {
    const d = ensureDay(s.saleDate);
    d.salesAmount += s.totalAmount;
    d.numSales++;
    s.items.forEach((i: any) => d.crates += i.crates);
  });

  payments.forEach((p: any) => {
    const d = ensureDay(p.paymentDate);
    d.collectionAmount += p.amount;
  });

  visits.forEach((v: any) => {
    const d = ensureDay(v.createdAt);
    d.visits++;
  });

  const reportData = Array.from(daysMap.values()).sort((a, b) => b.dateStr.localeCompare(a.dateStr));

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Daily Sales Report</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Review business performance day-by-day.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <form className="flex items-center gap-2 bg-white dark:bg-slate-950 p-1 rounded-md border border-slate-200 dark:border-slate-800 shadow-sm">
            <input 
              type="number" 
              name="year" 
              defaultValue={year} 
              className="w-20 px-2 py-1.5 text-sm bg-transparent border-none focus:ring-0 focus:outline-none" 
            />
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700"></div>
            <select 
              name="month" 
              defaultValue={month} 
              className="px-2 py-1.5 text-sm bg-transparent border-none focus:ring-0 focus:outline-none font-medium text-slate-700 dark:text-slate-300"
            >
              {Array.from({length: 12}).map((_, i) => (
                <option key={i+1} value={i+1}>{new Date(2000, i, 1).toLocaleString('default', { month: 'short' })}</option>
              ))}
            </select>
            <button type="submit" className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:bg-slate-700 rounded text-sm font-medium transition-colors">
              Filter
            </button>
          </form>
          <a href={`/api/admin/export?type=daily&year=${year}&month=${month}`} className="px-4 py-2 bg-alvoun-green/10 text-alvoun-green border border-alvoun-green/20 hover:bg-alvoun-green/20 rounded-md text-sm font-medium transition-colors whitespace-nowrap">
            Export CSV
          </a>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3 text-center">Visits</th>
                <th className="px-6 py-3 text-center">Invoices</th>
                <th className="px-6 py-3 text-center">Crates Sold</th>
                <th className="px-6 py-3 text-right">Sales Amount</th>
                <th className="px-6 py-3 text-right">Collection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    No data for this month.
                  </td>
                </tr>
              ) : (
                reportData.map((d) => (
                  <tr key={d.dateStr} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                    <td className="px-6 py-3 font-bold text-slate-900 dark:text-slate-100">{d.dateStr}</td>
                    <td className="px-6 py-3 text-center text-slate-600 dark:text-slate-400">{formatNumber(d.visits)}</td>
                    <td className="px-6 py-3 text-center text-slate-600 dark:text-slate-400">{formatNumber(d.numSales)}</td>
                    <td className="px-6 py-3 text-center font-medium text-slate-700 dark:text-slate-300">{formatNumber(d.crates)}</td>
                    <td className="px-6 py-3 text-right font-bold text-alvoun-blue">{formatMoney(d.salesAmount)}</td>
                    <td className="px-6 py-3 text-right font-bold text-alvoun-green">{formatMoney(d.collectionAmount)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {reportData.length > 0 && (
              <tfoot className="bg-slate-50 dark:bg-slate-900 font-bold border-t border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                <tr>
                  <td className="px-6 py-4">Total</td>
                  <td className="px-6 py-4 text-center">{formatNumber(reportData.reduce((acc, d) => acc + d.visits, 0))}</td>
                  <td className="px-6 py-4 text-center">{formatNumber(reportData.reduce((acc, d) => acc + d.numSales, 0))}</td>
                  <td className="px-6 py-4 text-center">{formatNumber(reportData.reduce((acc, d) => acc + d.crates, 0))}</td>
                  <td className="px-6 py-4 text-right text-alvoun-blue">{formatMoney(reportData.reduce((acc, d) => acc + d.salesAmount, 0))}</td>
                  <td className="px-6 py-4 text-right text-alvoun-green">{formatMoney(reportData.reduce((acc, d) => acc + d.collectionAmount, 0))}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
