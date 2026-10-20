import { getRoutes, createRoute } from '@/lib/actions/route';
import { getCities } from '@/lib/actions/city';
import { getSalesmen } from '@/lib/actions/salesman';
import { Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import RouteListClient from './RouteListClient';
import TerritoryNav from './components/TerritoryNav';

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

        {/* Add Route Form Column */}
        <div className="lg:col-span-1">
          <div className="bg-surface-raised p-6 rounded-3xl shadow-raised border border-border-subtle sticky top-24">
            <h2 className="text-base font-black text-text-primary mb-4 flex items-center gap-2 tracking-tight">
              <Plus className="h-4 w-4 text-brand-teal" />
              Add New Route
            </h2>
            <form action={async (data) => { 'use server'; await createRoute(data); }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">City</label>
                <select 
                  name="cityId" 
                  required 
                  className="w-full rounded-2xl border border-border-subtle px-3.5 py-2.5 text-sm font-semibold bg-surface-sunken shadow-inset text-text-primary focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20 transition-all"
                >
                  <option value="">Select City</option>
                  {cities.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.state.name})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Route Name</label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  placeholder="e.g. Downtown Sector A"
                  className="w-full rounded-2xl border border-border-subtle px-3.5 py-2.5 text-sm font-semibold bg-surface-sunken shadow-inset text-text-primary placeholder:text-text-muted focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Default Salesman (Optional)</label>
                <select 
                  name="salesmanId" 
                  className="w-full rounded-2xl border border-border-subtle px-3.5 py-2.5 text-sm font-semibold bg-surface-sunken shadow-inset text-text-primary focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20 transition-all"
                >
                  <option value="">None</option>
                  {salesmen.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <button 
                type="submit" 
                className="w-full min-h-[44px] bg-brand-teal hover:bg-brand-teal-dark text-white rounded-2xl px-4 py-3 text-sm font-black shadow-raised active:scale-[0.98] transition-all tracking-wide mt-2"
              >
                Create Route
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
