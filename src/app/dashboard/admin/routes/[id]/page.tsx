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
    <div className="space-y-6 animate-fade-in-up pb-24">
      {/* Route Header Banner */}
      <div className="bg-surface-raised p-6 rounded-3xl shadow-raised border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard/admin/routes" 
            className="w-10 h-10 flex items-center justify-center bg-surface-raised rounded-2xl shadow-raised-sm border border-border-subtle text-text-primary active:shadow-inset active:scale-95 transition-all"
            aria-label="Back to routes"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-text-primary uppercase tracking-tight">{route.name}</h1>
              {route.isActive ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 shadow-raised-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-surface-sunken text-text-muted border border-border-subtle shadow-inset-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                  Inactive
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs font-semibold text-text-muted">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-brand-teal" /> 
                {route.city.name}, {route.city.state.name}
              </span>
              <span>•</span>
              <span>Salesman: <strong className="text-text-primary">{route.salesman?.name || 'Unassigned'}</strong></span>
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
