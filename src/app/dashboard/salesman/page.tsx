import { auth } from '@/auth';
import { getDashboardStats } from '@/lib/actions/salesman/dashboard';
import { getMyCustomers } from '@/lib/actions/salesman/customer';
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

  const customers = await getMyCustomers();

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
          <span className="text-sm text-slate-400 ml-1">• Started 07:00 AM</span>
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
          <div className="space-y-4">
            {routes[0].customers.map(c => (
              <div key={c.id} className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight mb-1">{c.customerName}</h3>
                    <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 gap-1 mb-2">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[200px]">{routes[0].routeName}</span>
                    </div>
                    {c.outstanding > 0 && (
                       <div className="text-alvoun-red font-bold text-base">
                         {formatMoney(c.outstanding)} <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dues</span>
                       </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <a href={c.contact ? `tel:${c.contact}` : '#'} className="flex items-center justify-center gap-2 py-3.5 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm active:bg-slate-100 transition-colors">
                    <Phone className="h-4 w-4" />
                    {c.contact ? 'CALL' : 'NO PHONE'}
                  </a>
                  <Link href={`/dashboard/salesman/customers/${c.id}/visit`} className="flex items-center justify-center gap-2 py-3.5 bg-alvoun-blue text-white rounded-xl font-bold text-sm shadow-lg shadow-alvoun-blue/20 hover:bg-alvoun-dark active:bg-alvoun-dark transition-colors">
                    START VISIT
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {routes.map(r => (
              <Link key={r.routeName} href={`/dashboard/salesman/customers?routeId=${r.customers[0].routeId}`} className="block bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 active:bg-slate-50 transition-colors">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-alvoun-blue" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{r.routeName}</h3>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </div>
                <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-3">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{r.customers.length} Customers</span>
                  <span className="text-sm font-bold text-alvoun-blue">View Customers →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
