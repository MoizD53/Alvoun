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

  const [products, saleAggregates] = await Promise.all([
    prisma.product.findMany({ 
      orderBy: { bottlesPerCrate: 'asc' },
      include: {
        rates: {
          orderBy: { minQuantity: 'desc' }
        }
      }
    }),
    prisma.$queryRaw<Array<{ productId: string; cratesSold: number; totalAmount: number }>>`
      SELECT 
        si.productId,
        SUM(si.crates) as cratesSold,
        SUM(si.amount) as totalAmount
      FROM SaleItem si
      JOIN Sale s ON si.saleId = s.id
      WHERE s.saleDate >= ${start.toISOString()} AND s.saleDate <= ${end.toISOString()}
      GROUP BY si.productId
    `
  ]);

  const aggMap = new Map(saleAggregates.map(a => [a.productId, a]));

  const productMap = new Map();
  products.forEach(p => {
    const agg = aggMap.get(p.id);
    const cratesSold = Number(agg?.cratesSold || 0);
    const salesAmount = Number(agg?.totalAmount || 0);
    productMap.set(p.id, {
      name: p.name,
      bottlesPerCrate: p.bottlesPerCrate,
      cratesSold,
      bottlesSold: cratesSold * p.bottlesPerCrate,
      salesAmount
    });
  });

  const reportData = Array.from(productMap.values());

  return (
    <div className="space-y-6">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-4 rounded-xl border border-border-subtle shadow-subtle">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-brand-teal" />
            Product Sales & Performance
          </h1>
          <p className="text-sm text-text-muted">Daily performance breakdown by SKU and packaging</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <AdminDatePicker currentDate={dateStr} />
          <a
            href={`/api/admin/export?type=products&date=${dateStr}`}
            download
            className="flex items-center gap-2 px-3 py-2 bg-surface hover:bg-surface-sunken border border-border-subtle text-foreground text-sm font-semibold rounded-lg transition-colors shadow-subtle shrink-0"
          >
            <Download className="w-4 h-4 text-brand-teal" />
            Export
          </a>
        </div>
      </div>

      {/* Grid of Product Cards */}
      {reportData.length === 0 ? (
        <EmptyState
          icon={<BarChart2 className="w-8 h-8 text-brand-teal" />}
          title="No Product Data"
          description={`No product sales records found for ${dateStr}.`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportData.map((prod, idx) => (
            <div key={idx} className="bg-surface rounded-xl border border-border-subtle shadow-subtle p-5 flex flex-col justify-between hover:border-brand-teal/40 transition-colors">
              <div>
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg text-foreground">{prod.name}</h3>
                  <span className="text-xs px-2.5 py-1 bg-surface-sunken text-text-secondary rounded-full font-medium border border-border-subtle">
                    {prod.bottlesPerCrate} Bottles / PKG
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="bg-surface-sunken/60 p-3 rounded-lg border border-border-subtle/50">
                    <span className="text-xs text-text-muted font-medium block">Total PKG Sold</span>
                    <span className="text-xl font-extrabold text-foreground mt-0.5 block">{formatNumber(prod.cratesSold)}</span>
                  </div>
                  <div className="bg-surface-sunken/60 p-3 rounded-lg border border-border-subtle/50">
                    <span className="text-xs text-text-muted font-medium block">Total Bottles</span>
                    <span className="text-xl font-extrabold text-brand-teal mt-0.5 block">{formatNumber(prod.bottlesSold)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-border-subtle/60 flex justify-between items-center">
                <span className="text-xs text-text-muted font-medium">Revenue Contribution</span>
                <span className="text-base font-bold text-foreground">{formatMoney(prod.salesAmount)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Pricing Matrix Component */}
      <ProductManager initialProducts={products} />
    </div>
  );
}
