import { auth } from '@/auth';
import { getDashboardStats } from '@/lib/actions/salesman/dashboard';
import { getMyCustomers } from '@/lib/actions/salesman/customer';
import { getProductsWithRates } from '@/lib/actions/salesman/sale';
import SalesmanCustomerList from './customers/components/SalesmanCustomerList';
import Link from 'next/link';
import { formatMoney, formatNumber } from '@/lib/format';
import { MapPin, Clock, Moon, Navigation, ChevronRight, Phone } from 'lucide-react';

export default async function SalesmanDashboard() {
  const session = await auth();
  
  let stats;
  try {
    stats = await getDashboardStats();
  } catch (error: any) {
    if (error.message === 'NOT_STARTED') {
      return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
            <Clock className="h-10 w-10 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Work Not Started</h1>
          <p className="text-slate-500 mb-8">Work sessions are active between 7:00 AM - 7:00 PM</p>
        </div>
      );
    } else if (error.message === 'SESSION_ENDED') {
      return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
            <Moon className="h-10 w-10 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Session Ended</h1>
          <p className="text-slate-500 mb-8">Your work day has concluded. See you tomorrow!</p>
        </div>
      );
    } else {
      throw error;
    }
  }

  // Generate dynamic greeting
  const hour = new Date().getUTCHours() + 5.5; // Rough IST approx
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const [customers, products] = await Promise.all([
    getMyCustomers(),
    getProductsWithRates()
  ]);

  // Group by route/area
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
      {/* Top Header Section */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{greeting}, {session?.user?.name}</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-alvoun-green opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-alvoun-green"></span>
          </span>
          <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Working</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sales</span>
          <span className="text-lg font-black text-slate-900 dark:text-slate-100">{formatMoney(stats?.salesAmount || 0)}</span>
        </div>
        <div className="flex flex-col border-l border-slate-100 dark:border-slate-800 pl-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Collection</span>
          <span className="text-lg font-black text-slate-900 dark:text-slate-100">{formatMoney(stats?.collectionAmount || 0)}</span>
        </div>
        <div className="flex flex-col border-l border-slate-100 dark:border-slate-800 pl-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Visits</span>
          <span className="text-lg font-black text-slate-900 dark:text-slate-100">{stats?.visitsCount || 0}<span className="text-sm text-slate-400 font-medium">/{stats?.customersCount || 0}</span></span>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
          <Navigation className="h-5 w-5 text-alvoun-blue" />
          {routes.length === 1 ? 'Your Customers' : 'Your Areas'}
        </h2>

        {routes.length === 0 && (
          <div className="text-center py-10 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-slate-500 font-medium">No areas assigned.</p>
          </div>
        )}

        {routes.length === 1 ? (
          <SalesmanCustomerList 
            initialCustomers={routes[0].customers as any}
            products={products as any}
            routeId={routes[0].customers[0]?.routeId}
            routeName={routes[0].routeName}
          />
        ) : (
          <div className="space-y-3">
            {routes.map(r => {
              const visitedCount = r.customers.filter(c => c.isVisitedToday).length;
              return (
                <Link key={r.routeName} href={`/dashboard/salesman/customers?routeId=${r.customers[0]?.routeId}`} className="block bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 active:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-alvoun-blue" />
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{r.routeName}</h3>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-3">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {r.customers.length} Customers {visitedCount > 0 && <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-1">({visitedCount} visited)</span>}
                    </span>
                    <span className="text-sm font-bold text-alvoun-blue">View Customers →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
