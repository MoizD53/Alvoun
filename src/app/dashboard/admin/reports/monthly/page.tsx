import { prisma } from '@/lib/db';
import { getKolkataTimeDetails, getCurrentKolkataTime, getKolkataStartOfDay, getKolkataEndOfDay } from '@/lib/time';
import { formatMoney, formatNumber } from '@/lib/format';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import MonthlyFilterBar from './MonthlyFilterBar';

export default async function MonthlyReportsPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const resolvedParams = await searchParams;
  const now = getCurrentKolkataTime();
  const currentDetails = getKolkataTimeDetails(now);
  
  const year = parseInt(resolvedParams.year || String(currentDetails.year));
  const selectedMonth = resolvedParams.month; // undefined or e.g. "10"

  // Get boundaries for the query: if month selected, filter down to that month, else entire year
  let start: Date;
  let end: Date;

  if (selectedMonth) {
    const formattedMonth = selectedMonth.padStart(2, '0');
    // Calculate last day of that month
    const lastDay = new Date(year, parseInt(formattedMonth), 0).getDate();
    start = getKolkataStartOfDay(`${year}-${formattedMonth}-01`);
    end = getKolkataEndOfDay(`${year}-${formattedMonth}-${String(lastDay).padStart(2, '0')}`);
  } else {
    start = getKolkataStartOfDay(`${year}-01-01`);
    end = getKolkataEndOfDay(`${year}-12-31`);
  }

  const [products, sales, payments] = await Promise.all([
    prisma.product.findMany({
      orderBy: { bottlesPerCrate: 'asc' } // 1L (12), 500ml (24), 250ml (48)
    }),
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
      const productCrates: Record<string, number> = {};
      products.forEach(p => { productCrates[p.id] = 0; });
      monthsMap.set(dateStr, {
        monthStr: dateStr,
        salesAmount: 0,
        collectionAmount: 0,
        numSales: 0,
        crates: 0,
        productCrates
      });
    }
    return monthsMap.get(dateStr);
  };

  sales.forEach(s => {
    const m = ensureMonth(s.saleDate);
    m.salesAmount += s.totalAmount;
    m.numSales++;
    s.items.forEach(i => {
      m.crates += i.crates;
      m.productCrates[i.productId] = (m.productCrates[i.productId] || 0) + i.crates;
    });
  });

  payments.forEach(p => {
    const m = ensureMonth(p.paymentDate);
    m.collectionAmount += p.amount;
  });

  const reportData = Array.from(monthsMap.values()).sort((a, b) => b.monthStr.localeCompare(a.monthStr));

  return (
    <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/admin" className="p-2 bg-white dark:bg-slate-950 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Monthly Sales Report</h2>
        </div>
        <div>
          <MonthlyFilterBar year={year} month={selectedMonth} />
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
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
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
                    <td className="px-4 py-3 text-right font-medium">{formatNumber(row.numSales)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{formatNumber(row.crates)}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap justify-end gap-x-2 gap-y-0.5 mt-0.5">
                        {products.map(p => {
                          const count = row.productCrates[p.id] || 0;
                          return (
                            <span key={p.id} className="whitespace-nowrap">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">{p.name}:</span> {count}
                            </span>
                          );
                        })}
                      </div>
                    </td>
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
