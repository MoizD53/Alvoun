import { prisma } from '@/lib/db';
import { BarChart3, Map, MapPin, Users } from 'lucide-react';
import InteractiveKPIRow, { KPIItem } from './InteractiveKPIRow';

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
      icon: <MapPin className="h-4 w-4" />,
      iconBg: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-alvoun-blue'
    },
    {
      id: 'areas',
      title: 'TOTAL AREAS',
      value: areas.length,
      subtitle: 'Active Areas',
      icon: <Map className="h-4 w-4" />,
      iconBg: 'bg-green-50 dark:bg-green-900/20',
      iconColor: 'text-alvoun-green'
    },
    {
      id: 'salesmen',
      title: 'TOTAL SALESMEN',
      value: salesmen.length,
      subtitle: 'Field Staff',
      icon: <Users className="h-4 w-4" />,
      iconBg: 'bg-orange-50 dark:bg-orange-900/20',
      iconColor: 'text-alvoun-amber'
    },
    {
      id: 'customers',
      title: 'TOTAL CUSTOMERS',
      value: customerCount,
      subtitle: 'Total Base',
      icon: <BarChart3 className="h-4 w-4" />,
      iconBg: 'bg-indigo-50 dark:bg-indigo-900/20',
      iconColor: 'text-indigo-500'
    }
  ];

  return (
    <div className="space-y-6 mt-8">
      <InteractiveKPIRow kpis={secondaryKpis} dateStr={dateStr} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ChartCard title="Route-wise Customers" data={routeData} max={maxRoute} />
        <ChartCard title="Top Area-wise Customers" data={areaData} max={maxArea} />
        <ChartCard title="Salesman-wise Customers" data={salesmanData} max={maxSalesman} />
      </div>
    </div>
  );
}

function ChartCard({ title, data, max }: { title: string, data: {name: string, count: number}[], max: number }) {
  return (
    <div className="bg-white dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <h3 className="font-bold mb-4 text-slate-800 dark:text-slate-200">{title}</h3>
      <div className="space-y-3">
        {data.length === 0 ? (
          <div className="text-sm text-slate-500">No data</div>
        ) : (
          data.map((item, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs mb-1">
                <span className="truncate pr-2 text-slate-700 dark:text-slate-300">{item.name}</span>
                <span className="font-medium">{item.count}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-1.5">
                <div 
                  className="bg-alvoun-blue h-1.5 rounded-full" 
                  style={{ width: `${(item.count / max) * 100}%` }}
                ></div>
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
    <div className="space-y-6 mt-8 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
