import { getCities, createCity } from '@/lib/actions/city';
import { getStates } from '@/lib/actions/state';
import { prisma } from '@/lib/db';
import { Building2, Plus } from 'lucide-react';

export default async function CitiesPage() {
  const cities = await prisma.city.findMany({
    include: {
      state: true,
      _count: {
        select: { customers: true, routes: true }
      }
    },
    orderBy: { name: 'asc' }
  });
  const states = await getStates();

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Routes & Areas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage operational cities.</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
        <a href="/dashboard/admin/routes" className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          Routes & Areas
        </a>
        <a href="/dashboard/admin/cities" className="px-4 py-2 text-sm font-medium border-b-2 border-alvoun-blue text-alvoun-blue">
          Cities
        </a>
        <a href="/dashboard/admin/states" className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          States
        </a>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3">City Name</th>
                    <th className="px-6 py-3">State</th>
                    <th className="px-6 py-3 text-center">Routes</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {cities.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                        <div className="flex flex-col items-center justify-center">
                          <Building2 className="h-8 w-8 mb-3 text-slate-300" />
                          <p className="text-base font-medium text-slate-600 dark:text-slate-400">No cities found</p>
                          <p className="text-sm mt-1 text-slate-400">Add a city to begin creating routes.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    cities.map((city) => (
                      <tr key={city.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors group">
                        <td className="px-6 py-3 font-bold text-slate-900 dark:text-slate-100">{city.name}</td>
                        <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{city.state.name}</td>
                        <td className="px-6 py-3 text-center">
                          <span className="inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400">
                            {city._count?.routes || 0}
                          </span>
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
        
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-950 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 sticky top-24">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4 text-alvoun-blue" />
              Add City
            </h2>
            <form action={async (data) => { 'use server'; await createCity(data); }} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">State</label>
                <select 
                  name="stateId" 
                  required 
                  className="w-full rounded-md border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 focus:border-alvoun-blue focus:outline-none focus:ring-2 focus:ring-alvoun-blue/20 transition-colors"
                >
                  <option value="">Select State</option>
                  {states.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">City Name</label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  placeholder="e.g. Surat"
                  className="w-full rounded-md border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 focus:border-alvoun-blue focus:outline-none focus:ring-2 focus:ring-alvoun-blue/20 transition-colors"
                />
              </div>
              <button type="submit" className="w-full bg-alvoun-blue text-white rounded-md px-4 py-2.5 text-sm font-medium hover:bg-alvoun-dark transition-colors shadow-sm mt-2">
                Create City
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
