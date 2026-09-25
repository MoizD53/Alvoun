import { getRoutes, createRoute } from '@/lib/actions/route';
import { getCities } from '@/lib/actions/city';
import { getSalesmen } from '@/lib/actions/salesman';
import { MapPin, Plus, ArrowLeft } from 'lucide-react';

import Link from 'next/link';
import RouteListClient from './RouteListClient';

export default async function RoutesPage() {
  const routes = await getRoutes();
  const cities = await getCities();
  const salesmen = await getSalesmen();

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/admin" className="p-2 bg-white dark:bg-slate-950 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Routes & Areas</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage delivery routes and salesman assignments.</p>
          </div>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
        <Link href="/dashboard/admin/routes" className="px-4 py-2 text-sm font-medium border-b-2 border-alvoun-blue text-alvoun-blue">
          Routes & Areas
        </Link>
        <Link href="/dashboard/admin/cities" className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          Cities
        </Link>
        <Link href="/dashboard/admin/states" className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          States
        </Link>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Table Column */}
        <div className="lg:col-span-3">
          <RouteListClient routes={routes} cities={cities} salesmen={salesmen} />
        </div>

        {/* Form Column */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-950 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 sticky top-24">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4 text-alvoun-blue" />
              Add New Route
            </h2>
            <form action={async (data) => { 'use server'; await createRoute(data); }} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">City</label>
                <select 
                  name="cityId" 
                  required 
                  className="w-full rounded-md border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 focus:border-alvoun-blue focus:outline-none focus:ring-2 focus:ring-alvoun-blue/20 transition-colors"
                >
                  <option value="">Select City</option>
                  {cities.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.state.name})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Route Name</label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  placeholder="e.g. Downtown Sector A"
                  className="w-full rounded-md border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 focus:border-alvoun-blue focus:outline-none focus:ring-2 focus:ring-alvoun-blue/20 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Default Salesman (Optional)</label>
                <select 
                  name="defaultSalesmanId" 
                  className="w-full rounded-md border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 focus:border-alvoun-blue focus:outline-none focus:ring-2 focus:ring-alvoun-blue/20 transition-colors"
                >
                  <option value="">None</option>
                  {salesmen.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <button 
                type="submit" 
                className="w-full bg-alvoun-blue text-white rounded-md px-4 py-2.5 text-sm font-medium hover:bg-alvoun-dark transition-colors shadow-sm mt-2"
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
