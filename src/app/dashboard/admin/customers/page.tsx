import { getCustomers } from '@/lib/actions/customer';
import { getStates } from '@/lib/actions/state';
import { getCities } from '@/lib/actions/city';
import { getRoutes } from '@/lib/actions/route';
import { getSalesmen } from '@/lib/actions/salesman';
import Link from 'next/link';
import { Plus, Upload } from 'lucide-react';

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
    page: typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page) : 1,
  };

  const customers = await getCustomers(filters);
  const states = await getStates();
  const cities = await getCities(filters.stateId);
  const routes = await getRoutes(filters.cityId);
  const salesmen = await getSalesmen();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <Link 
            href="/dashboard/admin/customers/import" 
            className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-200 transition-colors flex-1 sm:flex-none"
          >
            <Upload className="h-4 w-4" />
            Import
          </Link>
          <Link 
            href="/dashboard/admin/customers/new" 
            className="flex items-center justify-center gap-2 bg-alvoun-blue text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-alvoun-dark transition-colors flex-1 sm:flex-none"
          >
            <Plus className="h-4 w-4" />
            Add Customer
          </Link>
        </div>
      </div>

      <form className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="lg:col-span-2">
          <input 
            type="text" 
            name="search"
            defaultValue={filters.search}
            placeholder="Search name or contact..." 
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-alvoun-blue focus:outline-none focus:ring-1 focus:ring-alvoun-blue"
          />
        </div>
        <div>
          <select name="stateId" defaultValue={filters.stateId} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white">
            <option value="">All States</option>
            {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <select name="cityId" defaultValue={filters.cityId} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white">
            <option value="">All Cities</option>
            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <select name="routeId" defaultValue={filters.routeId} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white">
            <option value="">All Routes</option>
            {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div>
          <select name="status" defaultValue={filters.status} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white">
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>
        <div>
          <button type="submit" className="w-full bg-alvoun-blue text-white rounded-md px-3 py-2 text-sm hover:bg-alvoun-dark transition-colors font-medium">Filter</button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm text-left whitespace-nowrap hidden lg:table">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Customer Name</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Route / Salesman</th>
              <th className="px-4 py-3 text-right">Balance</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900">{c.customerName}</td>
                <td className="px-4 py-3 text-slate-600">{c.contact}</td>
                <td className="px-4 py-3 text-slate-600">{c.city.name}, {c.state.name}</td>
                <td className="px-4 py-3 text-slate-600">
                  <div className="font-medium">{c.route.name}</div>
                  <div className="text-xs text-slate-400">{c.salesman.name}</div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-medium ${c.openingBalanceType === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{(c.openingBalance / 100).toFixed(2)} {c.openingBalanceType.substring(0,2)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/dashboard/admin/customers/${c.id}`} className="text-alvoun-blue hover:underline font-medium">Edit</Link>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">No customers found.</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Mobile cards view */}
        <div className="lg:hidden flex flex-col gap-4 p-4">
          {customers.map((c) => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-slate-900">{c.customerName}</h3>
                  <p className="text-sm text-slate-500">{c.contact}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                  {c.status}
                </span>
              </div>
              <div className="text-sm text-slate-600 mb-2">
                {c.address}, {c.city.name}, {c.state.name}
              </div>
              <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-100">
                <div className="text-xs text-slate-500">
                  <div className="font-medium text-slate-700">{c.route.name}</div>
                  <div>{c.salesman.name}</div>
                </div>
                <div className="text-right">
                  <div className={`font-medium ${c.openingBalanceType === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{(c.openingBalance / 100).toFixed(2)} {c.openingBalanceType.substring(0,2)}
                  </div>
                  <Link href={`/dashboard/admin/customers/${c.id}`} className="text-alvoun-blue text-sm hover:underline mt-1 inline-block font-medium">Edit</Link>
                </div>
              </div>
            </div>
          ))}
          {customers.length === 0 && (
            <div className="text-center py-8 text-slate-500">No customers found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
