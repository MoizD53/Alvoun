import { getMyCustomers } from '@/lib/actions/salesman/customer';
import Link from 'next/link';
import { Search, MapPin, ChevronRight, Phone } from 'lucide-react';

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
    <div className="space-y-6 pb-20 animate-fade-in-up">
      <div className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 pt-2 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-4">My Customers</h1>
        
        <form className="relative">
          <input 
            type="text" 
            name="search" 
            defaultValue={search}
            placeholder="Search name, phone, or location..." 
            className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-alvoun-blue/50 focus:border-alvoun-blue transition-all placeholder-slate-400 font-medium"
          />
          <Search className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
        </form>
      </div>

      {routes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <MapPin className="h-8 w-8 text-slate-300" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">No customers found</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {search ? "Try adjusting your search terms." : "You have no customers assigned to you."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {routes.map((route) => (
            <div key={route.routeName} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <MapPin className="h-4 w-4 text-alvoun-blue" />
                <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wider">{route.routeName}</h2>
                <span className="ml-auto bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold px-2 py-0.5 rounded-full">
                  {route.customers.length}
                </span>
              </div>
              
              <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                {route.customers.map((c: any) => (
                  <Link 
                    key={c.id} 
                    href={`/dashboard/salesman/customers/${c.id}`}
                    className="flex items-center justify-between p-4 active:bg-slate-50 dark:bg-slate-900 transition-colors group"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate mb-1">
                        {c.customerName}
                      </h3>
                      <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 gap-3">
                        <span className="flex items-center gap-1">
                           <Phone className="h-3 w-3" /> {c.contact}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-900 text-slate-400 group-hover:bg-alvoun-light group-hover:text-alvoun-blue transition-colors shrink-0">
                      <ChevronRight className="h-5 w-5" />
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
