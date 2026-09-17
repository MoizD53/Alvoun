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

  const ensureDay = (date: Date) => {
    // Convert UTC Date back to string in Kolkata timezone for grouping
    const dateStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
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

  sales.forEach(s => {
    const d = ensureDay(s.saleDate);
    d.salesAmount += s.totalAmount;
    d.numSales++;
    s.items.forEach(i => d.crates += i.crates);
  });

  payments.forEach(p => {
    const d = ensureDay(p.paymentDate);
    d.collectionAmount += p.amount;
  });

  visits.forEach(v => {
    const d = ensureDay(v.createdAt);
    d.visits++;
  });

  const reportData = Array.from(daysMap.values()).sort((a, b) => b.dateStr.localeCompare(a.dateStr));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold text-slate-900">Daily Sales Report</h2>
        <div className="flex items-center gap-3">
          <form className="flex items-center gap-2">
            <input type="number" name="year" defaultValue={year} className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50" />
            <select name="month" defaultValue={month} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50">
              {Array.from({length: 12}).map((_, i) => (
                <option key={i+1} value={i+1}>{new Date(2000, i, 1).toLocaleString('default', { month: 'short' })}</option>
              ))}
            </select>
            <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium">Filter</button>
          </form>
          <a href={`/api/admin/export?type=daily&year=${year}&month=${month}`} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium flex items-center gap-2">
            Export Excel
          </a>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-medium border-y border-slate-100">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Sales Amount</th>
              <th className="px-4 py-3 text-right">Collection</th>
              <th className="px-4 py-3 text-right">No. Sales</th>
              <th className="px-4 py-3 text-right">Visits</th>
              <th className="px-4 py-3 text-right">Crates Sold</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {reportData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No data for this period.</td>
              </tr>
            ) : (
              reportData.map((row) => (
                <tr key={row.dateStr} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.dateStr}</td>
                  <td className="px-4 py-3 text-right font-bold text-alvoun-blue">{formatMoney(row.salesAmount)}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">{formatMoney(row.collectionAmount)}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(row.numSales)}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(row.visits)}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(row.crates)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
