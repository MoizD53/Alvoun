import { getStates } from '@/lib/actions/state';
import { getCities } from '@/lib/actions/city';
import { getRoutes } from '@/lib/actions/route';
import { getSalesmen } from '@/lib/actions/salesman';
import Link from 'next/link';
import { Plus, Phone, ExternalLink, ArrowLeft, Users, Package, TrendingUp, AlertCircle, IndianRupee } from 'lucide-react';
import { formatMoney } from '@/lib/format';
import { prisma } from '@/lib/db';
import CustomerFilterBar from './components/CustomerFilterBar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';

// Categorize product into 1L, 500ml, 250ml or other
function categorizeProduct(name: string): '1L' | '500ml' | '250ml' | 'OTHER' {
  const lower = name.toLowerCase();
  if (lower.includes('1') && (lower.includes('l') || lower.includes('litre') || lower.includes('liter'))) return '1L';
  if (lower.includes('500')) return '500ml';
  if (lower.includes('250')) return '250ml';
  return 'OTHER';
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;
  
  const filters = {
    search: typeof resolvedParams.search === 'string' ? resolvedParams.search.trim() : undefined,
    category: typeof resolvedParams.category === 'string' ? resolvedParams.category : undefined,
    stateId: typeof resolvedParams.stateId === 'string' ? resolvedParams.stateId : undefined,
    cityId: typeof resolvedParams.cityId === 'string' ? resolvedParams.cityId : undefined,
    routeId: typeof resolvedParams.routeId === 'string' ? resolvedParams.routeId : undefined,
    salesmanId: typeof resolvedParams.salesmanId === 'string' ? resolvedParams.salesmanId : undefined,
    status: typeof resolvedParams.status === 'string' ? resolvedParams.status : undefined,
    sort: typeof resolvedParams.sort === 'string' ? resolvedParams.sort : 'asc',
    page: typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page) : 1,
  };

  const [
    rawCustomers,
    salesGroup,
    paymentsGroup,
    productStatsRaw,
    states,
    cities,
    routes,
    salesmen,
  ] = await Promise.all([
    prisma.customer.findMany({
      where: {
        ...(filters.search ? { 
          OR: [
            { customerName: { contains: filters.search } },
            { firmName: { contains: filters.search } },
            { contact: { contains: filters.search } },
            { code: { contains: filters.search } },
            { address: { contains: filters.search } },
            { route: { name: { contains: filters.search } } },
            { area: { name: { contains: filters.search } } },
          ]
        } : {}),
        ...(filters.category && filters.category !== 'ALL' ? { category: filters.category as any } : {}),
        ...(filters.stateId ? { stateId: filters.stateId } : {}),
        ...(filters.cityId ? { cityId: filters.cityId } : {}),
        ...(filters.routeId ? { routeId: filters.routeId } : {}),
        ...(filters.salesmanId ? { salesmanId: filters.salesmanId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      include: {
        state: true,
        city: true,
        route: true,
        area: true,
        salesman: true,
        visits: { select: { createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 }
      },
      orderBy: { customerName: filters.sort === 'desc' ? 'desc' : 'asc' },
    }),
    prisma.sale.groupBy({
      by: ['customerId'],
      _sum: { totalAmount: true }
    }),
    prisma.payment.groupBy({
      by: ['customerId'],
      _sum: { amount: true }
    }),
    prisma.$queryRaw<Array<{ customerId: string; productName: string; totalCrates: number; totalLoose: number; totalAmount: number }>>`
      SELECT 
        s.customerId,
        p.name as productName,
        SUM(si.crates) as totalCrates,
        SUM(si.looseBottles) as totalLoose,
        SUM(si.amount) as totalAmount
      FROM SaleItem si
      JOIN Sale s ON si.saleId = s.id
      JOIN Product p ON si.productId = p.id
      GROUP BY s.customerId, p.name
    `,
    getStates(),
    getCities(filters.stateId),
    getRoutes(filters.cityId),
    getSalesmen(),
  ]);

  const salesMap = new Map<string, number>();
  for (const s of salesGroup) {
    salesMap.set(s.customerId, s._sum.totalAmount || 0);
  }

  const paymentsMap = new Map<string, number>();
  for (const p of paymentsGroup) {
    paymentsMap.set(p.customerId, p._sum.amount || 0);
  }

  const productStatsMap = new Map<string, {
    crates1L: number; loose1L: number; amount1L: number;
    crates500ml: number; loose500ml: number; amount500ml: number;
    crates250ml: number; loose250ml: number; amount250ml: number;
  }>();

  for (const row of productStatsRaw) {
    if (!productStatsMap.has(row.customerId)) {
      productStatsMap.set(row.customerId, {
        crates1L: 0, loose1L: 0, amount1L: 0,
        crates500ml: 0, loose500ml: 0, amount500ml: 0,
        crates250ml: 0, loose250ml: 0, amount250ml: 0,
      });
    }
    const stats = productStatsMap.get(row.customerId)!;
    const cat = categorizeProduct(row.productName);
    if (cat === '1L') {
      stats.crates1L += Number(row.totalCrates || 0);
      stats.loose1L += Number(row.totalLoose || 0);
      stats.amount1L += Number(row.totalAmount || 0);
    } else if (cat === '500ml') {
      stats.crates500ml += Number(row.totalCrates || 0);
      stats.loose500ml += Number(row.totalLoose || 0);
      stats.amount500ml += Number(row.totalAmount || 0);
    } else if (cat === '250ml') {
      stats.crates250ml += Number(row.totalCrates || 0);
      stats.loose250ml += Number(row.totalLoose || 0);
      stats.amount250ml += Number(row.totalAmount || 0);
    }
  }

  // Compute per-customer product-wise sales, collections, and outstanding balance in O(1)
  const customers = rawCustomers.map((c) => {
    const stats = productStatsMap.get(c.id) || {
      crates1L: 0, loose1L: 0, amount1L: 0,
      crates500ml: 0, loose500ml: 0, amount500ml: 0,
      crates250ml: 0, loose250ml: 0, amount250ml: 0,
    };
    const totalSales = salesMap.get(c.id) || 0;
    const totalCollections = paymentsMap.get(c.id) || 0;
    const openingBase = c.openingBalanceType === 'DEBIT' ? c.openingBalance : -c.openingBalance;
    const outstanding = openingBase + totalSales - totalCollections;

    return {
      ...c,
      crates1L: stats.crates1L,
      loose1L: stats.loose1L,
      amount1L: stats.amount1L,
      crates500ml: stats.crates500ml,
      loose500ml: stats.loose500ml,
      amount500ml: stats.amount500ml,
      crates250ml: stats.crates250ml,
      loose250ml: stats.loose250ml,
      amount250ml: stats.amount250ml,
      totalSales,
      totalCollections,
      outstanding,
    };
  });

  // Calculate 5 Overview KPIs across all filtered customers
  const overview1LCrates = customers.reduce((sum, c) => sum + c.crates1L, 0);
  const overview1LLoose = customers.reduce((sum, c) => sum + c.loose1L, 0);
  const overview1LAmount = customers.reduce((sum, c) => sum + c.amount1L, 0);

  const overview500mlCrates = customers.reduce((sum, c) => sum + c.crates500ml, 0);
  const overview500mlLoose = customers.reduce((sum, c) => sum + c.loose500ml, 0);
  const overview500mlAmount = customers.reduce((sum, c) => sum + c.amount500ml, 0);

  const overview250mlCrates = customers.reduce((sum, c) => sum + c.crates250ml, 0);
  const overview250mlLoose = customers.reduce((sum, c) => sum + c.loose250ml, 0);
  const overview250mlAmount = customers.reduce((sum, c) => sum + c.amount250ml, 0);

  const overviewTotalSales = customers.reduce((sum, c) => sum + c.totalSales, 0);
  const overviewTotalOutstandingDue = customers.reduce((sum, c) => {
    return sum + (c.outstanding > 0 ? c.outstanding : 0);
  }, 0);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard/admin" 
            className="p-2 rounded-xl bg-surface-raised border border-border-default shadow-xs text-secondary hover:text-primary hover:border-border-strong transition-colors cursor-pointer press-active"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
              Customer Directory
            </h1>
            <p className="text-xs sm:text-sm text-secondary font-medium mt-0.5">
              Manage accounts, product-wise sales, dues, and contact info.
            </p>
          </div>
        </div>

        <div className="flex gap-2.5 w-full sm:w-auto">
          <Link href="/dashboard/admin/customers/import" className="flex-1 sm:flex-none">
            <Button variant="secondary" size="md" className="w-full">
              Bulk Import
            </Button>
          </Link>
          <Link href="/dashboard/admin/customers/new" className="flex-1 sm:flex-none">
            <Button variant="primary" size="md" leftIcon={<Plus className="h-4 w-4" />} className="w-full">
              Add Customer
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <CustomerFilterBar 
        initialFilters={filters} 
        routes={routes} 
        salesmen={salesmen} 
      />

      {/* 5 KPI Cards: Customer Sales Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: 1L Sold */}
        <div className="p-4 rounded-2xl bg-surface-raised border border-border-default shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">1L Sold</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold border border-teal-500/20">
              12 btls/pkg
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black text-primary tracking-tight">
              {overview1LCrates.toLocaleString('en-IN')} <span className="text-xs font-bold text-secondary">PKGs</span>
            </div>
            {overview1LLoose > 0 && (
              <div className="text-[10px] text-muted font-medium mt-0.5">
                +{overview1LLoose} loose bottles
              </div>
            )}
            <div className="text-xs font-bold text-teal-600 dark:text-teal-400 mt-1">
              ₹{(overview1LAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        {/* Card 2: 500ml Sold */}
        <div className="p-4 rounded-2xl bg-surface-raised border border-border-default shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">500ml Sold</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold border border-blue-500/20">
              24 btls/pkg
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black text-primary tracking-tight">
              {overview500mlCrates.toLocaleString('en-IN')} <span className="text-xs font-bold text-secondary">PKGs</span>
            </div>
            {overview500mlLoose > 0 && (
              <div className="text-[10px] text-muted font-medium mt-0.5">
                +{overview500mlLoose} loose bottles
              </div>
            )}
            <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1">
              ₹{(overview500mlAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        {/* Card 3: 250ml Sold */}
        <div className="p-4 rounded-2xl bg-surface-raised border border-border-default shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">250ml Sold</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold border border-purple-500/20">
              48 btls/pkg
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black text-primary tracking-tight">
              {overview250mlCrates.toLocaleString('en-IN')} <span className="text-xs font-bold text-secondary">PKGs</span>
            </div>
            {overview250mlLoose > 0 && (
              <div className="text-[10px] text-muted font-medium mt-0.5">
                +{overview250mlLoose} loose bottles
              </div>
            )}
            <div className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-1">
              ₹{(overview250mlAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        {/* Card 4: Total Sales */}
        <div className="p-4 rounded-2xl bg-surface-raised border border-border-default shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">Total Sales</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/20">
              Gross
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              ₹{(overviewTotalSales / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="text-[11px] text-secondary font-medium mt-1">
              All 3 products combined
            </div>
          </div>
        </div>

        {/* Card 5: Outstanding Due */}
        <div className="p-4 rounded-2xl bg-surface-raised border border-border-default shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">Outstanding Due</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold border border-rose-500/20">
              Receivable
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
              ₹{(overviewTotalOutstandingDue / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="text-[11px] text-secondary font-medium mt-1">
              Net customer balances
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Shell */}
      <div className="bg-surface-raised rounded-2xl border border-border-default shadow-raised overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left whitespace-nowrap hidden lg:table">
            <thead className="bg-surface-inset text-secondary font-semibold uppercase tracking-wider border-b border-border-default text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Customer / Outlet</th>
                <th className="px-5 py-3.5">Category & Area</th>
                <th className="px-5 py-3.5">Product Sales (1L • 500ml • 250ml)</th>
                <th className="px-5 py-3.5 text-right">Total Sales</th>
                <th className="px-5 py-3.5 text-right">Collected</th>
                <th className="px-5 py-3.5 text-right">Outstanding Due</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <EmptyState 
                      icon={<Users className="h-7 w-7" />}
                      title="No customers found"
                      description="Try adjusting your search criteria or add a new customer."
                      action={
                        <Link href="/dashboard/admin/customers/new">
                          <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                            Add First Customer
                          </Button>
                        </Link>
                      }
                    />
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const isNegative = c.outstanding > 0;
                  
                  return (
                    <tr key={c.id} className="hover:bg-surface-inset/50 transition-colors group">
                      {/* Customer / Outlet */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary text-sm">{c.customerName}</span>
                          {c.code && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-inset text-secondary border border-border-default">
                              {c.code}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted mt-0.5 font-medium">
                          {c.firmName ? `${c.firmName} • ` : ''}{c.contact} • {c.city?.name}
                        </div>
                      </td>

                      {/* Category & Area */}
                      <td className="px-5 py-4">
                        <div>
                          <Badge
                            variant={c.category === 'DISTRIBUTOR' ? 'info' : c.category === 'DEALER' ? 'warning' : 'neutral'}
                            styleType="subtle"
                            size="sm"
                          >
                            {c.category}
                          </Badge>
                          <div className="text-[11px] text-secondary mt-1 font-medium">{c.route?.name || c.address}</div>
                        </div>
                      </td>

                      {/* Product Sales Breakdown */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-teal-600 dark:text-teal-400 w-12">1L:</span>
                            <span className="font-semibold text-primary">{c.crates1L} PKG</span>
                            {c.amount1L > 0 && (
                              <span className="text-muted text-[10px]">(₹{(c.amount1L / 100).toLocaleString('en-IN')})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-blue-600 dark:text-blue-400 w-12">500ml:</span>
                            <span className="font-semibold text-primary">{c.crates500ml} PKG</span>
                            {c.amount500ml > 0 && (
                              <span className="text-muted text-[10px]">(₹{(c.amount500ml / 100).toLocaleString('en-IN')})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-purple-600 dark:text-purple-400 w-12">250ml:</span>
                            <span className="font-semibold text-primary">{c.crates250ml} PKG</span>
                            {c.amount250ml > 0 && (
                              <span className="text-muted text-[10px]">(₹{(c.amount250ml / 100).toLocaleString('en-IN')})</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Total Sales */}
                      <td className="px-5 py-4 text-right">
                        <span className="font-bold tabular-nums text-sm text-primary">
                          ₹{(c.totalSales / 100).toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Collected */}
                      <td className="px-5 py-4 text-right">
                        <span className="font-bold tabular-nums text-sm text-emerald-600 dark:text-emerald-400">
                          ₹{(c.totalCollections / 100).toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Outstanding Due */}
                      <td className="px-5 py-4 text-right">
                        <span className={`font-black tabular-nums text-sm ${isNegative ? 'text-rose-600 dark:text-rose-400' : 'text-primary'}`}>
                          {formatMoney(Math.abs(c.outstanding))}
                        </span>
                        {c.outstanding !== 0 && (
                          <div className="text-[10px] font-bold tracking-wider text-muted mt-0.5">
                            {isNegative ? 'TO RECEIVE (DR)' : 'IN ADVANCE (CR)'}
                          </div>
                        )}
                        <div className="text-[10px] font-bold tabular-nums text-secondary mt-0.5" title="Opening balance brought forward">
                          Opening: {formatMoney(c.openingBalance)} ({c.openingBalanceType === 'CREDIT' ? 'Cr' : 'Dr'})
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 text-center">
                        <Badge 
                          variant={c.status === 'ACTIVE' ? 'success' : 'neutral'}
                          styleType="subtle"
                          size="sm"
                          dot
                        >
                          {c.status}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          <a 
                            href={`tel:${c.contact}`} 
                            className="p-2 rounded-xl bg-surface-raised border border-border-default shadow-xs text-muted hover:text-teal-600 dark:hover:text-teal-400 hover:border-border-strong transition-all press-active"
                            title="Call customer"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                          <Link 
                            href={`/dashboard/admin/customers/${c.id}`} 
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-raised border border-border-default shadow-xs text-primary hover:border-teal-500 hover:text-teal-600 rounded-xl text-xs font-semibold transition-all press-active"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>View</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="lg:hidden flex flex-col divide-y divide-border-subtle">
          {customers.length === 0 ? (
            <div className="p-6">
              <EmptyState 
                title="No customers found"
                description="Try adjusting your search criteria or add a new customer."
              />
            </div>
          ) : (
            customers.map((c) => {
              const isNegative = c.outstanding > 0;
              return (
                <div key={c.id} className="p-4 bg-surface-raised hover:bg-surface-inset/40 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-sm text-primary">{c.customerName}</h3>
                        {c.code && (
                          <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-surface-inset text-secondary border border-border-default">
                            {c.code}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-secondary mt-0.5">
                        {c.firmName ? `${c.firmName} • ` : ''}{c.contact} • {c.city?.name}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge 
                        variant={c.status === 'ACTIVE' ? 'success' : 'neutral'}
                        styleType="subtle"
                        size="sm"
                        dot
                      >
                        {c.status}
                      </Badge>
                      <Badge
                        variant={c.category === 'DISTRIBUTOR' ? 'info' : c.category === 'DEALER' ? 'warning' : 'neutral'}
                        styleType="subtle"
                        size="sm"
                      >
                        {c.category}
                      </Badge>
                    </div>
                  </div>

                  {/* Product-wise Sales Mini Breakdown */}
                  <div className="mt-3 p-2.5 rounded-xl bg-surface-inset shadow-inset border border-border-default grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 block uppercase">1L</span>
                      <p className="font-bold text-primary">{c.crates1L} PKG</p>
                      <span className="text-[10px] text-muted">₹{(c.amount1L / 100).toFixed(0)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block uppercase">500ml</span>
                      <p className="font-bold text-primary">{c.crates500ml} PKG</p>
                      <span className="text-[10px] text-muted">₹{(c.amount500ml / 100).toFixed(0)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 block uppercase">250ml</span>
                      <p className="font-bold text-primary">{c.crates250ml} PKG</p>
                      <span className="text-[10px] text-muted">₹{(c.amount250ml / 100).toFixed(0)}</span>
                    </div>
                  </div>

                  {/* Financials Row */}
                  <div className="grid grid-cols-3 gap-2 text-xs mt-3 pt-3 border-t border-border-subtle text-center">
                    <div>
                      <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">Total Sales</span>
                      <p className="font-bold tabular-nums text-primary mt-0.5">₹{(c.totalSales / 100).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">Collected</span>
                      <p className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">₹{(c.totalCollections / 100).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">Outstanding</span>
                      <p className={`font-black tabular-nums mt-0.5 ${isNegative ? 'text-rose-600 dark:text-rose-400' : 'text-primary'}`}>
                        ₹{formatMoney(Math.abs(c.outstanding))} {isNegative ? 'Dr' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3.5 flex gap-2">
                    <a 
                      href={`tel:${c.contact}`} 
                      className="flex-1 inline-flex justify-center items-center gap-1.5 py-2 rounded-xl bg-surface-raised border border-border-default shadow-xs text-xs font-semibold text-secondary hover:text-primary transition-all press-active"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      <span>Call</span>
                    </a>
                    <Link 
                      href={`/dashboard/admin/customers/${c.id}`} 
                      className="flex-1 inline-flex justify-center items-center gap-1.5 py-2 rounded-xl bg-teal-50 dark:bg-teal-900/30 border border-teal-200/50 text-teal-700 dark:text-teal-300 text-xs font-bold transition-all press-active"
                    >
                      View Profile
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
