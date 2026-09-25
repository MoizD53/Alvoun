import { getMyCustomers } from '@/lib/actions/salesman/customer';
import Link from 'next/link';
import { Search, MapPin, ChevronRight, Phone } from 'lucide-react';
import { formatMoney } from '@/lib/format';

export default async function SalesmanCustomersPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const resolvedParams = await searchParams;
  const search = resolvedParams.search;
  const routeId = resolvedParams.routeId;
  const customers = await getMyCustomers(routeId, search);

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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-4">
          {routeId && routes.length === 1 ? routes[0].routeName : 'My Customers'}
        </h1>
        
        <form className="relative">
          {routeId && <input type="hidden" name="routeId" value={routeId} />}
          <input 
            type="text" 
            name="search" 
            defaultValue={search}
            placeholder="Search name or phone..." 
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
            {search ? "Try adjusting your search terms." : "You have no customers in this area."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {routes.map((route) => (
            <div key={route.routeName} className="space-y-4">
              {!routeId && (
                <div className="flex items-center gap-2 px-1">
                  <MapPin className="h-4 w-4 text-alvoun-blue" />
                  <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wider">{route.routeName}</h2>
                </div>
              )}
              
              <div className="space-y-4">
                {route.customers.map((c: any) => (
                  <div key={c.id} className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight mb-1">
                          {c.customerName}
                        </h3>
                        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 gap-3 mb-2">
                          <span className="flex items-center gap-1">
                             <Phone className="h-3.5 w-3.5" /> {c.contact || 'No phone'}
                          </span>
                        </div>
                        {c.outstanding > 0 && (
                           <div className="text-alvoun-red font-bold text-base mt-1">
                             {formatMoney(c.outstanding)} <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dues</span>
                           </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      {c.contact ? (
                        <a href={`tel:${c.contact}`} className="flex items-center justify-center gap-2 py-3.5 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm active:bg-slate-100 transition-colors">
                          <Phone className="h-4 w-4" />
                          CALL
                        </a>
                      ) : (
                        <Link href={`/dashboard/salesman/customers/${c.id}`} className="flex items-center justify-center gap-2 py-3.5 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm active:bg-slate-100 transition-colors">
                          + ADD PHONE
                        </Link>
                      )}
                      
                      <Link href={`/dashboard/salesman/customers/${c.id}/visit`} className="flex items-center justify-center gap-2 py-3.5 bg-alvoun-blue text-white rounded-xl font-bold text-sm shadow-lg shadow-alvoun-blue/20 hover:bg-alvoun-dark active:bg-alvoun-dark transition-colors">
                        START VISIT
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
