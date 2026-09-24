import { getRoutes, createRoute } from '@/lib/actions/route';
import { getCities } from '@/lib/actions/city';
import { getSalesmen } from '@/lib/actions/salesman';
import { MapPin, Plus, ArrowLeft } from 'lucide-react';

import Link from 'next/link';

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
          <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3">Route Name</th>
                    <th className="px-6 py-3">Location</th>
                    <th className="px-6 py-3">Assigned Salesman</th>
                    <th className="px-6 py-3 text-center">Customers</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {routes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                        <div className="flex flex-col items-center justify-center">
                          <MapPin className="h-8 w-8 mb-3 text-slate-300" />
                          <p className="text-base font-medium text-slate-600 dark:text-slate-400">No routes found</p>
                          <p className="text-sm mt-1 text-slate-400">Create your first route using the form.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    routes.map((route) => (
                      <tr key={route.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors group">
                        <td className="px-6 py-3 font-bold text-slate-900 dark:text-slate-100">{route.name}</td>
                        <td className="px-6 py-3">
                          <span className="font-medium text-slate-700 dark:text-slate-300">{route.city.name}</span>
                          <span className="text-slate-400 text-xs ml-1">({route.city.state.name})</span>
                        </td>
                        <td className="px-6 py-3">
                          {route.salesman ? (
                            <div className="font-medium text-slate-900 dark:text-slate-100">{route.salesman.name}</div>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className="inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400">
                            {route._count.customers}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center">
                          {route.isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 dark:bg-green-900/20 text-alvoun-green">
                              <span className="h-1.5 w-1.5 rounded-full bg-alvoun-green"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button className="text-alvoun-blue hover:text-alvoun-dark font-medium text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
