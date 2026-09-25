import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin } from 'lucide-react';
import RouteManageClient from './RouteManageClient';
import { getSalesmen } from '@/lib/actions/salesman';

export default async function RouteManagePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const routeId = resolvedParams.id;

  const route = await prisma.route.findUnique({
    where: { id: routeId },
    include: {
      city: { include: { state: true } },
      salesman: true,
      areas: {
        include: {
          _count: { select: { customers: true } },
          assignments: { include: { salesman: true } }
        },
        orderBy: { name: 'asc' }
      },
      customers: {
        include: { area: true, salesman: true },
        orderBy: { customerName: 'asc' }
      }
    }
  });

  if (!route) {
    notFound();
  }

  const salesmen = await getSalesmen();

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/admin/routes" className="p-2 bg-white dark:bg-slate-950 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">{route.name}</h1>
              {route.isActive ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-green-50 dark:bg-green-900/20 text-alvoun-green">
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500">
                  Inactive
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 font-medium">
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {route.city.name}, {route.city.state.name}</span>
              <span>•</span>
              <span>Salesman: <strong className="text-slate-700 dark:text-slate-300">{route.salesman?.name || 'Unassigned'}</strong></span>
              <span>•</span>
              <span>{route.customers.length} Customers</span>
            </div>
          </div>
        </div>
      </div>

      <RouteManageClient route={route} salesmen={salesmen} />
    </div>
  );
}
