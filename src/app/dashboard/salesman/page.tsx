import { auth } from '@/auth';
import { getDashboardStats } from '@/lib/actions/salesman/dashboard';
import { getMyCustomers } from '@/lib/actions/salesman/customer';
import { getProductsWithRates } from '@/lib/actions/salesman/sale';
import SalesmanCustomerList from './customers/components/SalesmanCustomerList';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { formatMoney, formatNumber } from '@/lib/format';
import { MapPin, Clock, Moon, Navigation, ChevronRight, Activity, TrendingUp, IndianRupee } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default async function SalesmanDashboard() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'SALESMAN') redirect('/dashboard');
  
  let stats;
  try {
    stats = await getDashboardStats();
  } catch (error: any) {
    if (error.message === 'NOT_STARTED') {
      return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
          <div className="w-20 h-20 bg-surface-raised shadow-raised rounded-2xl border border-border/40 flex items-center justify-center mb-6 text-primary">
            <Clock className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Work Not Started</h1>
          <p className="text-muted-foreground mb-8 text-sm max-w-sm">Work sessions are active between 7:00 AM – 7:00 PM</p>
        </div>
      );
    } else if (error.message === 'SESSION_ENDED') {
      return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
          <div className="w-20 h-20 bg-surface-raised shadow-raised rounded-2xl border border-border/40 flex items-center justify-center mb-6 text-primary">
            <Moon className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Session Ended</h1>
          <p className="text-muted-foreground mb-8 text-sm max-w-sm">Your work day has concluded. See you tomorrow!</p>
        </div>
      );
    } else {
      throw error;
    }
  }

  // Generate dynamic greeting
  const hour = new Date().getUTCHours() + 5.5; // IST approx
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const [customers, products] = await Promise.all([
    getMyCustomers(),
    getProductsWithRates()
  ]);

  // Group by route/area
  const routesMap = new Map<string, { routeName: string; customers: typeof customers }>();
  customers.forEach(c => {
    const key = c.routeId || 'general';
    const name = c.route?.name || c.city?.name || 'General Coverage';
    if (!routesMap.has(key)) {
      routesMap.set(key, { routeName: name, customers: [] });
    }
    routesMap.get(key)!.customers.push(c);
  });
  const routes = Array.from(routesMap.values());

  return (
    <div className="space-y-6 pb-20 animate-fade-in-up">
      {/* Top Greeting Header */}
      <div className="bg-surface-raised shadow-raised p-5 rounded-2xl border border-border/40 flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
            {greeting}, <span className="text-primary">{session?.user?.name}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Field Sales Operations</p>
        </div>
        <Badge variant="success" size="sm" dot pulse className="gap-1.5 px-3 py-1">
          Working
        </Badge>
      </div>

      {/* 3-Column Today Summary KPI Card */}
      <div className="bg-surface-raised shadow-raised p-4 rounded-2xl border border-border/40 grid grid-cols-3 divide-x divide-border/40">
        <div className="flex flex-col pr-3">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Sales</span>
          <span className="text-base sm:text-lg font-bold text-primary tracking-tight">{formatMoney(stats?.salesAmount || 0)}</span>
        </div>
        <div className="flex flex-col px-3">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Collection</span>
          <span className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">{formatMoney(stats?.collectionAmount || 0)}</span>
        </div>
        <div className="flex flex-col pl-3">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Visits</span>
          <span className="text-base sm:text-lg font-bold text-foreground tracking-tight">
            {stats?.visitsCount || 0}
            <span className="text-xs text-muted-foreground font-normal">/{stats?.customersCount || 0}</span>
          </span>
        </div>
      </div>

      {/* Territory & Route Navigation */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Navigation className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {routes.length === 1 ? 'Your Assigned Route' : 'Assigned Territory Routes'}
          </h2>
        </div>

        {routes.length === 0 && (
          <div className="text-center py-10 bg-surface-raised rounded-2xl border border-border/40 shadow-raised p-6">
            <p className="text-muted-foreground text-sm font-medium">No territory or routes assigned yet.</p>
          </div>
        )}

        {routes.length === 1 ? (
          <SalesmanCustomerList 
            initialCustomers={routes[0].customers as any}
            products={products as any}
            routeId={routes[0].customers[0]?.routeId || undefined}
            routeName={routes[0].routeName}
          />
        ) : (
          <div className="space-y-3">
            {routes.map(r => {
              const visitedCount = r.customers.filter(c => c.isVisitedToday).length;
              return (
                <Link 
                  key={r.routeName} 
                  href={`/dashboard/salesman/customers?routeId=${r.customers[0]?.routeId}`} 
                  className="block bg-surface-raised shadow-raised hover:shadow-raised-sm press-active rounded-2xl border border-border/40 p-5 transition-all"
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-surface-inset shadow-inset border border-border/40 flex items-center justify-center text-primary">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <h3 className="text-base font-bold text-foreground">{r.routeName}</h3>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex justify-between items-center border-t border-border/40 pt-3 text-xs">
                    <span className="text-muted-foreground font-medium">
                      {r.customers.length} Retailers
                      {visitedCount > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-1.5">
                          ({visitedCount} visited today)
                        </span>
                      )}
                    </span>
                    <span className="font-semibold text-primary">View List →</span>
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
