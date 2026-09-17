import { prisma } from '@/lib/db';
import { getKolkataStartOfDay, getKolkataEndOfDay, getCurrentKolkataTime } from '@/lib/time';
import { formatMoney, formatNumber } from '@/lib/format';
import Link from 'next/link';

export default async function ProductReportPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const resolvedParams = await searchParams;
  const now = getCurrentKolkataTime();
  const dateStr = resolvedParams.date || now.toISOString().split('T')[0];
  
  const start = getKolkataStartOfDay(dateStr);
  const end = getKolkataEndOfDay(dateStr);

  const [products, saleItems] = await Promise.all([
    prisma.product.findMany({ orderBy: { bottlesPerCrate: 'asc' } }),
    prisma.saleItem.findMany({
      where: {
        sale: {
          saleDate: { gte: start, lte: end }
        }
      }
    })
  ]);

  const productMap = new Map();
  products.forEach(p => {
    productMap.set(p.id, {
      name: p.name,
      bottlesPerCrate: p.bottlesPerCrate,
      cratesSold: 0,
      bottlesSold: 0,
      salesAmount: 0
    });
  });

  saleItems.forEach(item => {
    if (productMap.has(item.productId)) {
      const p = productMap.get(item.productId);
      p.cratesSold += item.crates;
      p.bottlesSold += (item.crates * p.bottlesPerCrate);
      p.salesAmount += item.amount;
    }
  });

  const reportData = Array.from(productMap.values());

  return (
    <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Product Sales Report</h2>
        <div className="flex items-center gap-3">
          <form className="flex items-center gap-2">
            <input type="date" name="date" defaultValue={dateStr} className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm bg-slate-50 dark:bg-slate-900" />
            <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium">Filter</button>
          </form>
          <a href={`/api/admin/export?type=products&date=${dateStr}`} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 whitespace-nowrap">
            Export Excel
          </a>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-medium border-y border-slate-100 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3 text-right">Crates Sold</th>
              <th className="px-4 py-3 text-right">Bottles Sold</th>
              <th className="px-4 py-3 text-right">Sales Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {reportData.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No products configured.</td>
              </tr>
            ) : (
              reportData.map((row) => (
                <tr key={row.name} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">{row.name}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(row.cratesSold)}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(row.bottlesSold)}</td>
                  <td className="px-4 py-3 text-right font-bold text-alvoun-blue">{formatMoney(row.salesAmount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
