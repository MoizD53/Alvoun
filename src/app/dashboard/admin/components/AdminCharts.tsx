import { prisma } from '@/lib/db';
import { BarChart3, Map, MapPin, Users } from 'lucide-react';
import InteractiveKPIRow, { KPIItem } from './InteractiveKPIRow';
import { Skeleton } from '@/components/ui/skeleton';

export default async function AdminCharts({ dateStr }: { dateStr?: string }) {
  const [routes, areas, salesmen, customerCount] = await Promise.all([
    prisma.route.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        _count: { select: { customers: true } }
      }
    }),
    prisma.area.findMany({
      select: {
        id: true,
        name: true,
        _count: { select: { customers: true } }
      }
    }),
    prisma.salesman.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        _count: { select: { customers: true } }
      }
    }),
    prisma.customer.count({ where: { status: 'ACTIVE' } })
  ]);

  // Process data for charts
  const routeData = routes.map(r => ({ name: r.name, count: r._count.customers })).sort((a, b) => b.count - a.count);
  const areaData = areas.map(a => ({ name: a.name, count: a._count.customers })).sort((a, b) => b.count - a.count).slice(0, 10);
  const salesmanData = salesmen.map(s => ({ name: s.name, count: s._count.customers })).sort((a, b) => b.count - a.count);

  const maxRoute = Math.max(...routeData.map(d => d.count), 1);
  const maxArea = Math.max(...areaData.map(d => d.count), 1);
  const maxSalesman = Math.max(...salesmanData.map(d => d.count), 1);

  const secondaryKpis: KPIItem[] = [
    {
      id: 'routes',
      title: 'TOTAL ROUTES',
      value: routes.length,
      subtitle: 'Active Routes',
      icon: <MapPin className="h-5 w-5" strokeWidth={2} />,
      iconBg: 'bg-teal-50 dark:bg-teal-900/30',
      iconColor: 'text-teal-600 dark:text-teal-400'
    },
    {
      id: 'areas',
      title: 'TOTAL AREAS',
      value: areas.length,
      subtitle: 'Active Areas',
      icon: <Map className="h-5 w-5" strokeWidth={2} />,
      iconBg: 'bg-teal-50 dark:bg-teal-900/30',
      iconColor: 'text-teal-600 dark:text-teal-400'
    },
    {
      id: 'salesmen',
      title: 'TOTAL SALESMEN',
      value: salesmen.length,
      subtitle: 'Field Staff',
      icon: <Users className="h-5 w-5" strokeWidth={2} />,
      iconBg: 'bg-teal-50 dark:bg-teal-900/30',
      iconColor: 'text-teal-600 dark:text-teal-400'
    },
    {
      id: 'customers',
      title: 'TOTAL CUSTOMERS',
      value: customerCount,
      subtitle: 'Total Customer Base',
      icon: <BarChart3 className="h-5 w-5" strokeWidth={2} />,
      iconBg: 'bg-teal-50 dark:bg-teal-900/30',
      iconColor: 'text-teal-600 dark:text-teal-400'
    }
  ];

  return (
    <div className="space-y-6 mt-6">
      <InteractiveKPIRow kpis={secondaryKpis} dateStr={dateStr} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ChartCard title="Route-wise Customers" data={routeData} max={maxRoute} />
        <ChartCard title="Top Area-wise Customers" data={areaData} max={maxArea} />
        <ChartCard title="Salesman-wise Customers" data={salesmanData} max={maxSalesman} />
      </div>
    </div>
  );
}

function ChartCard({ title, data, max }: { title: string, data: { name: string, count: number }[], max: number }) {
  return (
    <div className="bg-surface-raised p-6 rounded-2xl border border-border-default shadow-raised transition-all">
      <h3 className="font-bold text-sm tracking-tight text-primary mb-4">{title}</h3>
      <div className="space-y-3.5">
        {data.length === 0 ? (
          <div className="text-xs text-muted py-4 text-center">No data available</div>
        ) : (
          data.map((item, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="truncate pr-2 text-secondary font-medium">{item.name}</span>
                <span className="font-mono text-primary font-bold shrink-0">{item.count}</span>
              </div>
              <div className="w-full bg-surface-inset border border-border-default/60 shadow-inset rounded-full h-2 overflow-hidden p-0.5">
                <div 
                  className="bg-teal-500 h-full rounded-full transition-all duration-300 shadow-xs" 
                  style={{ width: `${Math.max(2, (item.count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function AdminChartsSkeleton() {
  return (
    <div className="space-y-6 mt-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-64 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
