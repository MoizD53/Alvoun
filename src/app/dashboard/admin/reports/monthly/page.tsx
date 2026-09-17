import { prisma } from '@/lib/db';
import { getKolkataTimeDetails, getCurrentKolkataTime, getKolkataStartOfDay, getKolkataEndOfDay } from '@/lib/time';
import { formatMoney, formatNumber } from '@/lib/format';
import Link from 'next/link';

export default async function MonthlyReportsPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const resolvedParams = await searchParams;
  const now = getCurrentKolkataTime();
  const currentDetails = getKolkataTimeDetails(now);
  
  const year = parseInt(resolvedParams.year || String(currentDetails.year));

  // Get boundaries for the entire year
  const start = getKolkataStartOfDay(`${year}-01-01`);
  const end = getKolkataEndOfDay(`${year}-12-31`);

  const [sales, payments] = await Promise.all([
    prisma.sale.findMany({
      where: { saleDate: { gte: start, lte: end } },
      include: { items: true }
    }),
    prisma.payment.findMany({
      where: { paymentDate: { gte: start, lte: end } }
    })
  ]);

  const monthsMap = new Map();

  const ensureMonth = (date: Date) => {
    // YYYY-MM
    const dateStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).substring(0, 7); 
    if (!monthsMap.has(dateStr)) {
      monthsMap.set(dateStr, {
        monthStr: dateStr,
        salesAmount: 0,
        collectionAmount: 0,
        numSales: 0,
        crates: 0
      });
    }
    return monthsMap.get(dateStr);
  };

  sales.forEach(s => {
    const m = ensureMonth(s.saleDate);
    m.salesAmount += s.totalAmount;
    m.numSales++;
    s.items.forEach(i => m.crates += i.crates);
  });

  payments.forEach(p => {
    const m = ensureMonth(p.paymentDate);
    m.collectionAmount += p.amount;
  });

  const reportData = Array.from(monthsMap.values()).sort((a, b) => b.monthStr.localeCompare(a.monthStr));

  return (
    <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Monthly Sales Report</h2>
        <div className="flex items-center gap-3">
          <form className="flex items-center gap-2">
            <input type="number" name="year" defaultValue={year} className="w-24 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm bg-slate-50 dark:bg-slate-900" />
            <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium">Filter</button>
          </form>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-medium border-y border-slate-100 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3">Month</th>
              <th className="px-4 py-3 text-right">Total Sales</th>
              <th className="px-4 py-3 text-right">Total Collection</th>
              <th className="px-4 py-3 text-right">No. Sales</th>
              <th className="px-4 py-3 text-right">Crates Sold</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {reportData.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No data for this year.</td>
              </tr>
            ) : (
              reportData.map((row) => {
                const [y, m] = row.monthStr.split('-');
                const monthName = new Date(2000, parseInt(m)-1, 1).toLocaleString('default', { month: 'long' });
                return (
                  <tr key={row.monthStr} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{monthName} {y}</td>
                    <td className="px-4 py-3 text-right font-bold text-alvoun-blue">{formatMoney(row.salesAmount)}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">{formatMoney(row.collectionAmount)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(row.numSales)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(row.crates)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
