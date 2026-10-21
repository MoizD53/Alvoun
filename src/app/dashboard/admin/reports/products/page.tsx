import { prisma } from '@/lib/db';
import { getKolkataStartOfDay, getKolkataEndOfDay, getCurrentKolkataTime, getKolkataDateString } from '@/lib/time';
import { formatMoney, formatNumber } from '@/lib/format';
import ProductManager from './components/ProductManager';
import AdminDatePicker from '../../components/AdminDatePicker';
import { Download, BarChart2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

export default async function ProductReportPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const resolvedParams = await searchParams;
  const now = getCurrentKolkataTime();
  const dateStr = resolvedParams.date || getKolkataDateString(now);
  
  const start = getKolkataStartOfDay(dateStr);
  const end = getKolkataEndOfDay(dateStr);

  const [products, saleItems] = await Promise.all([
    prisma.product.findMany({ 
      orderBy: { bottlesPerCrate: 'asc' },
      include: {
        rates: {
          orderBy: { minQuantity: 'desc' }
        }
      }
    }),
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
    <div className="space-y-8 animate-fade-in-up pb-16">
      {/* Product Management Section */}
      <ProductManager initialProducts={products} />

      {/* Product Sales Report Section */}
      <div className="bg-surface-raised shadow-raised rounded-2xl border border-border/40 p-5 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-inset shadow-inset border border-border/40 flex items-center justify-center text-primary shrink-0">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">Daily Product Sales Report</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Crate and bottle volume metrics dispatched for selected date</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <AdminDatePicker currentDate={dateStr} basePath="/dashboard/admin/reports/products" />
            <a 
              href={`/api/admin/export?type=products&date=${dateStr}`} 
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface-raised shadow-raised hover:shadow-raised-sm press-active border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap"
            >
              <Download className="h-4 w-4" /> Export Excel
            </a>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border/40">
          <table className="w-full text-xs sm:text-sm text-left whitespace-nowrap">
            <thead className="bg-surface-inset shadow-inset text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
              <tr>
                <th className="px-5 py-3.5">Product</th>
                <th className="px-5 py-3.5 text-right">PKG Sold</th>
                <th className="px-5 py-3.5 text-right">Bottles Sold</th>
                <th className="px-5 py-3.5 text-right">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-surface-raised">
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center">
                    <EmptyState
                      icon={<BarChart2 className="w-8 h-8 text-primary" />}
                      title="No Product Activity"
                      description={`No bottles or crates sold on ${dateStr}.`}
                    />
                  </td>
                </tr>
              ) : (
                reportData.map((row) => (
                  <tr key={row.name} className="hover:bg-surface-inset/30 transition-colors">
                    <td className="px-5 py-4 font-bold text-foreground">{row.name}</td>
                    <td className="px-5 py-4 text-right font-medium text-foreground">{formatNumber(row.cratesSold)}</td>
                    <td className="px-5 py-4 text-right font-medium text-muted-foreground">{formatNumber(row.bottlesSold)}</td>
                    <td className="px-5 py-4 text-right font-bold text-primary">{formatMoney(row.salesAmount)}</td>
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
