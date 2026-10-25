import { prisma } from '@/lib/db';
import { getKolkataTimeDetails, getCurrentKolkataTime, getKolkataStartOfDay, getKolkataEndOfDay } from '@/lib/time';
import { formatMoney, formatNumber } from '@/lib/format';
import Link from 'next/link';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import MonthlyFilterBar from './MonthlyFilterBar';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';

export default async function MonthlyReportsPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const resolvedParams = await searchParams;
  const now = getCurrentKolkataTime();
  const currentDetails = getKolkataTimeDetails(now);
  
  const year = parseInt(resolvedParams.year || String(currentDetails.year));
  const selectedMonth = resolvedParams.month;

  let start: Date;
  let end: Date;

  if (selectedMonth) {
    const formattedMonth = selectedMonth.padStart(2, '0');
    const lastDay = new Date(year, parseInt(formattedMonth), 0).getDate();
    start = getKolkataStartOfDay(`${year}-${formattedMonth}-01`);
    end = getKolkataEndOfDay(`${year}-${formattedMonth}-${String(lastDay).padStart(2, '0')}`);
  } else {
    start = getKolkataStartOfDay(`${year}-01-01`);
    end = getKolkataEndOfDay(`${year}-12-31`);
  }

  // Push aggregation directly to Turso DB to prevent downloading thousands of sales & items
  const [products, salesAgg, paymentsAgg, itemsAgg] = await Promise.all([
    prisma.product.findMany({
      orderBy: { bottlesPerCrate: 'asc' }
    }),
    prisma.$queryRaw<Array<{ monthStr: string; numSales: number; salesAmount: number }>>`
      SELECT substr(saleDate, 1, 7) as monthStr, COUNT(id) as numSales, SUM(totalAmount) as salesAmount
      FROM Sale
      WHERE saleDate >= ${start.toISOString()} AND saleDate <= ${end.toISOString()}
      GROUP BY substr(saleDate, 1, 7)
    `,
    prisma.$queryRaw<Array<{ monthStr: string; collectionAmount: number }>>`
      SELECT substr(paymentDate, 1, 7) as monthStr, SUM(amount) as collectionAmount
      FROM Payment
      WHERE paymentDate >= ${start.toISOString()} AND paymentDate <= ${end.toISOString()}
      GROUP BY substr(paymentDate, 1, 7)
    `,
    prisma.$queryRaw<Array<{ monthStr: string; productId: string; totalCrates: number }>>`
      SELECT substr(s.saleDate, 1, 7) as monthStr, si.productId, SUM(si.crates) as totalCrates
      FROM SaleItem si
      JOIN Sale s ON si.saleId = s.id
      WHERE s.saleDate >= ${start.toISOString()} AND s.saleDate <= ${end.toISOString()}
      GROUP BY substr(s.saleDate, 1, 7), si.productId
    `,
  ]);

  const monthsMap = new Map();

  const ensureMonth = (monthStr: string) => {
    if (!monthsMap.has(monthStr)) {
      const productCrates: Record<string, number> = {};
      products.forEach(p => { productCrates[p.id] = 0; });
      monthsMap.set(monthStr, {
        monthStr,
        salesAmount: 0,
        collectionAmount: 0,
        numSales: 0,
        crates: 0,
        productCrates
      });
    }
    return monthsMap.get(monthStr);
  };

  salesAgg.forEach(s => {
    const m = ensureMonth(s.monthStr);
    m.salesAmount += Number(s.salesAmount || 0);
    m.numSales += Number(s.numSales || 0);
  });

  paymentsAgg.forEach(p => {
    const m = ensureMonth(p.monthStr);
    m.collectionAmount += Number(p.collectionAmount || 0);
  });

  itemsAgg.forEach(i => {
    const m = ensureMonth(i.monthStr);
    const c = Number(i.totalCrates || 0);
    m.crates += c;
    m.productCrates[i.productId] = (m.productCrates[i.productId] || 0) + c;
  });

  const reportData = Array.from(monthsMap.values()).sort((a, b) => b.monthStr.localeCompare(a.monthStr));

  return (
    <div className="bg-surface-raised shadow-raised rounded-2xl border border-border/40 p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/admin/reports"
            className="p-2 rounded-xl bg-surface-inset border border-border/40 hover:bg-surface-sunken transition text-secondary hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
              Monthly Sales & Collections
              <TrendingUp className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </h1>
            <p className="text-xs sm:text-sm text-secondary mt-0.5">
              Aggregated financial performance and unit volume by month
            </p>
          </div>
        </div>

        {/* Global Filter Bar */}
        <MonthlyFilterBar year={year} month={selectedMonth} />
      </div>

      {reportData.length === 0 ? (
        <EmptyState
          icon={<TrendingUp className="w-8 h-8 text-teal-500" />}
          title="No Data for Period"
          description={`No transactions found for ${selectedMonth ? `${selectedMonth}/` : ''}${year}.`}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/40 bg-surface-base">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-inset/50 border-b border-border/40 text-[11px] font-bold uppercase tracking-wider text-muted">
              <tr>
                <th className="py-3 px-4">Month</th>
                <th className="py-3 px-4 text-right">Total Invoiced</th>
                <th className="py-3 px-4 text-right">Collections</th>
                <th className="py-3 px-4 text-right">Outstanding Delta</th>
                <th className="py-3 px-4 text-center">Invoices</th>
                <th className="py-3 px-4 text-right font-black text-primary">Total PKGs</th>
                {products.map(p => (
                  <th key={p.id} className="py-3 px-4 text-right text-teal-600 dark:text-teal-400">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 text-xs">
              {reportData.map((row) => {
                const diff = row.salesAmount - row.collectionAmount;
                const [y, m] = row.monthStr.split('-');
                const monthDate = new Date(parseInt(y), parseInt(m) - 1, 1);
                const monthLabel = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

                return (
                  <tr key={row.monthStr} className="hover:bg-surface-inset/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-primary">
                      {monthLabel}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-foreground">
                      {formatMoney(row.salesAmount)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-teal-600 dark:text-teal-400">
                      {formatMoney(row.collectionAmount)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      <span className={diff > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                        {diff > 0 ? `+${formatMoney(diff)}` : formatMoney(diff)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="neutral" className="text-[10px] font-mono">
                        {row.numSales}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-primary">
                      {formatNumber(row.crates)}
                    </td>
                    {products.map(p => (
                      <td key={p.id} className="py-3 px-4 text-right font-medium text-secondary">
                        {formatNumber(row.productCrates[p.id] || 0)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
