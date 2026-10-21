import { getRoutes } from '@/lib/actions/route';
import { getCities } from '@/lib/actions/city';
import { getSalesmen } from '@/lib/actions/salesman';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import RouteListClient from './RouteListClient';
import TerritoryNav from './components/TerritoryNav';
import AddTerritoryForms from './components/AddTerritoryForms';

export default async function RoutesPage() {
  const routes = await getRoutes();
  const cities = await getCities();
  const salesmen = await getSalesmen();

  return (
    <div className="space-y-6 animate-fade-in-up pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard/admin" 
            className="w-10 h-10 flex items-center justify-center bg-surface-raised rounded-2xl shadow-raised-sm border border-border-subtle text-text-primary active:shadow-inset active:scale-95 transition-all"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-text-primary tracking-tight">Routes & Areas</h1>
            <p className="text-xs font-semibold text-text-muted mt-0.5">Manage delivery routes and salesman territory assignments.</p>
          </div>
        </div>
      </div>

      {/* Territory Navigation Pills */}
      <TerritoryNav />
      
      {/* 2-column Grid: Routes Table & Add Form */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Table Column */}
        <div className="lg:col-span-3">
          <RouteListClient routes={routes} cities={cities} salesmen={salesmen} />
        </div>

        {/* Add Territory (Route & Area) Forms Column */}
        <div className="lg:col-span-1">
          <AddTerritoryForms cities={cities} routes={routes} salesmen={salesmen} />
        </div>
      </div>
    </div>
  );
}
