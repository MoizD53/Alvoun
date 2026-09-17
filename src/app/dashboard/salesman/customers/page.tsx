import { getMyCustomers } from '@/lib/actions/salesman/customer';
import Link from 'next/link';

export default async function SalesmanCustomersPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const resolvedParams = await searchParams;
  const search = resolvedParams.search;
  const customers = await getMyCustomers(undefined, search);

  // Group by route
  const routesMap = new Map<string, { routeName: string, customers: typeof customers }>();
  
  customers.forEach(c => {
    if (!routesMap.has(c.routeId)) {
      routesMap.set(c.routeId, { routeName: c.route.name, customers: [] });
    }
    routesMap.get(c.routeId)!.customers.push(c);
  });

  const routes = Array.from(routesMap.values());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-slate-900">Today's Route</h1>
      </div>

      <form className="relative">
        <input 
          type="text" 
          name="search" 
          defaultValue={search}
          placeholder="Search customer..." 
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-alvoun-blue focus:border-transparent"
        />
        <svg className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </form>

      {routes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <p className="text-slate-500 font-medium">No active customers found.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {routes.map(r => (
            <div key={r.routeName} className="space-y-3">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider ml-1">{r.routeName}</h2>
              
              <div className="grid grid-cols-1 gap-3">
                {r.customers.map(c => (
                  <Link href={`/dashboard/salesman/customers/${c.id}`} key={c.id}>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 active:scale-[0.98] transition-transform">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-slate-900 text-base leading-tight">{c.customerName}</h3>
                        <span className="w-2 h-2 rounded-full bg-green-500 mt-1"></span>
                      </div>
                      <div className="text-sm text-slate-500 mb-3">
                        {c.address}, {c.city.name}
                      </div>
                      <div className="pt-3 border-t border-slate-50 flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-400 uppercase">Outstanding</span>
                        <span className={`font-bold ${c.outstanding > 0 ? 'text-red-500' : (c.outstanding < 0 ? 'text-green-500' : 'text-slate-900')}`}>
                          ₹{(Math.abs(c.outstanding) / 100).toFixed(2)} {c.outstanding > 0 ? 'Dr' : (c.outstanding < 0 ? 'Cr' : '')}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
