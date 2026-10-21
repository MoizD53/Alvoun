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

  const [products, sales, payments] = await Promise.all([
    prisma.product.findMany({
      orderBy: { bottlesPerCrate: 'asc' }
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
    <div className="bg-surface-raised shadow-raised rounded-2xl border border-border/40 p-5 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard/admin" 
            className="p-2.5 bg-surface-raised shadow-raised hover:shadow-raised-sm press-active rounded-xl text-muted-foreground hover:text-foreground transition-all border border-border/40"
            aria-label="Back to Admin Dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">Monthly Sales Performance</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Aggregated revenue, payment collections, and volume by month</p>
          </div>
        </div>

        <div>
          <MonthlyFilterBar year={year} month={selectedMonth} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/40">
        <table className="w-full text-xs sm:text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-inset shadow-inset text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
            <tr>
              <th className="px-5 py-3.5">Month</th>
              <th className="px-5 py-3.5 text-right">Total Sales</th>
              <th className="px-5 py-3.5 text-right">Total Collection</th>
              <th className="px-5 py-3.5 text-right">Invoices</th>
              <th className="px-5 py-3.5 text-right">PKGs Dispatched</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 bg-surface-raised">
            {reportData.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center">
                  <EmptyState
                    icon={<TrendingUp className="w-8 h-8 text-primary" />}
                    title="No Monthly Data"
                    description={`No sales or collections logged for year ${year}.`}
                  />
                </td>
              </tr>
            ) : (
              reportData.map((row) => {
                const [y, m] = row.monthStr.split('-');
                const monthName = new Date(2000, parseInt(m)-1, 1).toLocaleString('default', { month: 'long' });
                return (
                  <tr key={row.monthStr} className="hover:bg-surface-inset/30 transition-colors">
                    <td className="px-5 py-4 font-bold text-foreground">{monthName} {y}</td>
                    <td className="px-5 py-4 text-right font-bold text-primary">{formatMoney(row.salesAmount)}</td>
                    <td className="px-5 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(row.collectionAmount)}</td>
                    <td className="px-5 py-4 text-right font-medium text-foreground">{formatNumber(row.numSales)}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="font-bold text-foreground">{formatNumber(row.crates)}</div>
                      <div className="flex flex-wrap justify-end gap-1.5 mt-1">
                        {products.map(p => {
                          const count = row.productCrates[p.id] || 0;
                          return (
                            <Badge key={p.id} variant="neutral" styleType="outline" size="sm" className="bg-surface-inset text-[10px]">
                              {p.name}: {count}
                            </Badge>
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
