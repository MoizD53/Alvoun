import { getCustomers } from '@/lib/actions/customer';
import { getStates } from '@/lib/actions/state';
import { getCities } from '@/lib/actions/city';
import { getRoutes } from '@/lib/actions/route';
import { getSalesmen } from '@/lib/actions/salesman';
import Link from 'next/link';
import { Plus, Filter, Search, Phone, ExternalLink, MoreVertical, ArrowLeft } from 'lucide-react';
import { formatMoney } from '@/lib/format';
import { calculateOutstanding } from '@/lib/outstanding';
import { prisma } from '@/lib/db';

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;
  
  const filters = {
    search: typeof resolvedParams.search === 'string' ? resolvedParams.search : undefined,
    stateId: typeof resolvedParams.stateId === 'string' ? resolvedParams.stateId : undefined,
    cityId: typeof resolvedParams.cityId === 'string' ? resolvedParams.cityId : undefined,
    routeId: typeof resolvedParams.routeId === 'string' ? resolvedParams.routeId : undefined,
    salesmanId: typeof resolvedParams.salesmanId === 'string' ? resolvedParams.salesmanId : undefined,
    status: typeof resolvedParams.status === 'string' ? resolvedParams.status : undefined,
    sort: typeof resolvedParams.sort === 'string' ? resolvedParams.sort : 'asc',
    page: typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page) : 1,
  };

  const customers = await prisma.customer.findMany({
    where: {
      ...(filters.search ? { 
        OR: [
          { customerName: { contains: filters.search } },
          { contact: { contains: filters.search } }
        ]
      } : {}),
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
      salesman: true,
      sales: { include: { items: true } },
      payments: true,
      visits: { orderBy: { createdAt: 'desc' }, take: 1 }
    },
    orderBy: { customerName: filters.sort === 'desc' ? 'desc' : 'asc' },
  });

  const states = await getStates();
  const cities = await getCities(filters.stateId);
  const routes = await getRoutes(filters.cityId);
  const salesmen = await getSalesmen();

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/admin" className="p-2 bg-white dark:bg-slate-950 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Customers</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your customer database and assignments.</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Link 
            href="/dashboard/admin/customers/new" 
            className="flex items-center justify-center gap-2 bg-alvoun-blue text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-alvoun-dark transition-colors flex-1 sm:flex-none shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Customer
          </Link>
        </div>
      </div>

      {/* Reusable Filter Bar */}
      <div className="bg-white dark:bg-slate-950 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        <form className="flex flex-col lg:flex-row gap-3 items-center">
          <div className="relative w-full lg:w-96 flex-shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input 
              type="text" 
              name="search"
              defaultValue={filters.search}
              placeholder="Search customers..." 
              className="text-slate-900 dark:text-slate-100 w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-alvoun-blue/20 focus:border-alvoun-blue transition-colors"
            />
          </div>
          
          <div className="flex w-full lg:w-auto gap-2 overflow-x-auto pb-1 lg:pb-0">
            <select name="routeId" defaultValue={filters.routeId} className="text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-alvoun-blue/20 focus:border-alvoun-blue min-w-[140px]">
              <option value="">All Routes</option>
              {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select name="salesmanId" defaultValue={filters.salesmanId} className="text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-alvoun-blue/20 focus:border-alvoun-blue min-w-[140px]">
              <option value="">All Salesmen</option>
              {salesmen.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select name="status" defaultValue={filters.status} className="text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-alvoun-blue/20 focus:border-alvoun-blue min-w-[120px]">
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <select name="sort" defaultValue={filters.sort} className="text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-alvoun-blue/20 focus:border-alvoun-blue min-w-[120px]">
              <option value="asc">A to Z</option>
              <option value="desc">Z to A</option>
            </select>
            <button type="submit" className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-sm font-medium hover:bg-slate-200 dark:bg-slate-700 transition-colors whitespace-nowrap border border-slate-200 dark:border-slate-800">
              Apply Filters
            </button>
          </div>
        </form>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap hidden lg:table">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Route & Salesman</th>
                <th className="px-6 py-3 text-right">Dues</th>
                <th className="px-6 py-3">Last Visit</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Filter className="h-8 w-8 mb-3 text-slate-300" />
                      <p className="text-base font-medium text-slate-600 dark:text-slate-400">No customers found</p>
                      <p className="text-sm mt-1 text-slate-500 dark:text-slate-400">Try adjusting your filters or add a new customer.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const outstanding = calculateOutstanding(c as any);
                  const isNegative = outstanding > 0;
                  const lastVisit = c.visits[0]?.createdAt ? new Date(c.visits[0].createdAt).toLocaleDateString() : 'Never';
                  
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors group">
                      <td className="px-6 py-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{c.customerName}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{c.contact} • {c.city.name}</div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="font-medium text-slate-700 dark:text-slate-300">{c.route.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{c.salesman?.name}</div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className={`font-bold ${isNegative ? 'text-alvoun-red' : 'text-slate-900 dark:text-slate-100'}`}>
                          {formatMoney(Math.abs(outstanding))}
                        </span>
                        {outstanding !== 0 && (
                          <div className="text-[10px] text-slate-400 font-medium">
                            {isNegative ? 'TO RECEIVE' : 'IN ADVANCE'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-500 dark:text-slate-400 font-medium text-sm">
                        {lastVisit}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.status === 'ACTIVE' ? 'bg-green-50 dark:bg-green-900/20 text-alvoun-green' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a href={`tel:${c.contact}`} className="p-1.5 text-slate-400 hover:text-alvoun-blue bg-white dark:bg-slate-950 hover:bg-alvoun-light border border-slate-200 dark:border-slate-800 rounded transition-colors" title="Call">
                            <Phone className="h-4 w-4" />
                          </a>
                          <Link href={`/dashboard/admin/customers/${c.id}`} className="flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-alvoun-blue hover:border-alvoun-blue rounded text-xs font-medium transition-all shadow-sm">
                            <ExternalLink className="h-3.5 w-3.5" />
                            View
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

        {/* Mobile cards view */}
        <div className="lg:hidden flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {customers.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">No customers found.</div>
          ) : (
            customers.map((c) => {
              const outstanding = calculateOutstanding(c as any);
              const isNegative = outstanding > 0;
              return (
                <div key={c.id} className="p-4 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100">{c.customerName}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{c.contact}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.status === 'ACTIVE' ? 'bg-green-50 dark:bg-green-900/20 text-alvoun-green' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                      {c.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-y-2 text-sm mt-3 pt-3 border-t border-slate-50">
                    <div>
                      <div className="text-xs text-slate-400 font-medium">Route & Salesman</div>
                      <div className="font-medium text-slate-700 dark:text-slate-300">{c.route.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{c.salesman?.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400 font-medium">Dues</div>
                      <div className={`font-bold ${isNegative ? 'text-alvoun-red' : 'text-slate-900 dark:text-slate-100'}`}>
                        {formatMoney(Math.abs(outstanding))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <a href={`tel:${c.contact}`} className="flex-1 flex justify-center items-center gap-2 py-2 border border-slate-200 dark:border-slate-800 rounded-md text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900">
                      <Phone className="h-4 w-4" /> Call
                    </a>
                    <Link href={`/dashboard/admin/customers/${c.id}`} className="flex-1 flex justify-center items-center gap-2 py-2 bg-alvoun-light/30 border border-alvoun-light text-alvoun-blue rounded-md text-sm font-medium hover:bg-alvoun-light/50">
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
