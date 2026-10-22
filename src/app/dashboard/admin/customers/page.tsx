import { getStates } from '@/lib/actions/state';
import { getCities } from '@/lib/actions/city';
import { getRoutes } from '@/lib/actions/route';
import { getSalesmen } from '@/lib/actions/salesman';
import Link from 'next/link';
import { Plus, Phone, ExternalLink, ArrowLeft, Users } from 'lucide-react';
import { formatMoney } from '@/lib/format';
import { calculateOutstanding } from '@/lib/outstanding';
import { prisma } from '@/lib/db';
import CustomerFilterBar from './components/CustomerFilterBar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';

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

  const [customers, states, cities, routes, salesmen] = await Promise.all([
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
      sales: { select: { totalAmount: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      payments: { select: { amount: true } },
      visits: { select: { createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 }
    },
    orderBy: { customerName: filters.sort === 'desc' ? 'desc' : 'asc' },
    }),
    getStates(),
    getCities(filters.stateId),
    getRoutes(filters.cityId),
    getSalesmen(),
  ]);

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
              Manage accounts, dues, and contact info.
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

      {/* Main Table Shell */}
      <div className="bg-surface-raised rounded-2xl border border-border-default shadow-raised overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left whitespace-nowrap hidden lg:table">
            <thead className="bg-surface-inset text-secondary font-semibold uppercase tracking-wider border-b border-border-default">
              <tr>
                <th className="px-6 py-3.5">Customer / Firm</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Location</th>
                <th className="px-6 py-3.5 text-right">Dues</th>
                <th className="px-6 py-3.5">Last Visit</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
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
                  const outstanding = calculateOutstanding(c as any);
                  const isNegative = outstanding > 0;
                  const lastVisit = c.visits[0]?.createdAt 
                    ? new Date(c.visits[0].createdAt).toLocaleDateString('en-IN') 
                    : 'Never';
                  
                  return (
                    <tr key={c.id} className="hover:bg-surface-inset/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary text-sm">{c.customerName}</span>
                          {c.code && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-inset text-secondary border border-border-default">
                              {c.code}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted mt-0.5 font-medium">
                          {c.firmName ? `${c.firmName} • ` : ''}{c.contact} • {c.city.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={c.category === 'DISTRIBUTOR' ? 'info' : c.category === 'DEALER' ? 'warning' : 'neutral'}
                          styleType="subtle"
                          size="sm"
                        >
                          {c.category}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-primary">{c.city?.name || c.route?.name || "—"}</div>
                        <div className="text-[11px] text-secondary mt-0.5">{c.route?.name || c.address}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-mono font-bold text-sm ${isNegative ? 'text-danger' : 'text-primary'}`}>
                          {formatMoney(Math.abs(outstanding))}
                        </span>
                        {outstanding !== 0 && (
                          <div className="text-[10px] font-semibold tracking-wider text-muted mt-0.5">
                            {isNegative ? 'TO RECEIVE' : 'IN ADVANCE'}
                          </div>
                        )}
                        <div className="text-[10px] font-mono text-secondary mt-0.5" title="Opening balance brought forward">
                          Opening: {formatMoney(c.openingBalance)} ({c.openingBalanceType === 'CREDIT' ? 'Cr' : 'Dr'})
                        </div>
                      </td>
                      <td className="px-6 py-4 text-secondary font-medium">
                        {lastVisit}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge 
                          variant={c.status === 'ACTIVE' ? 'success' : 'neutral'}
                          styleType="subtle"
                          size="sm"
                          dot
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
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
              const outstanding = calculateOutstanding(c as any);
              const isNegative = outstanding > 0;
              return (
                <div key={c.id} className="p-4 bg-surface-raised hover:bg-surface-inset/40 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-sm text-primary">{c.customerName}</h3>
                        {c.code && (
                          <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-surface-inset text-secondary">
                            {c.code}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-secondary mt-0.5">
                        {c.firmName ? `${c.firmName} • ` : ''}{c.contact} • {c.city.name}
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

                  <div className="grid grid-cols-2 gap-y-2 text-xs mt-3 pt-3 border-t border-border-subtle">
                    <div>
                      <div className="text-[10px] text-muted font-bold uppercase tracking-wider">Location</div>
                      <div className="font-semibold text-primary mt-0.5">{c.route?.name || c.city.name}</div>
                      <div className="text-secondary">{c.address}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-muted font-bold uppercase tracking-wider">Outstanding</div>
                      <div className={`font-mono font-bold text-sm mt-0.5 ${isNegative ? 'text-danger' : 'text-primary'}`}>
                        {formatMoney(Math.abs(outstanding))}
                      </div>
                      <div className="text-[9px] font-mono text-secondary mt-0.5">
                        Opening: {formatMoney(c.openingBalance)}
                      </div>
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
