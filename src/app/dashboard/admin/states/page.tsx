import { createState } from '@/lib/actions/state';
import { prisma } from '@/lib/db';
import { Map, Plus } from 'lucide-react';

export default async function StatesPage() {
  const states = await prisma.state.findMany({
    include: {
      _count: {
        select: { cities: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">States</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage operational states or regions.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3">State Name</th>
                    <th className="px-6 py-3 text-center">Cities</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {states.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                        <div className="flex flex-col items-center justify-center">
                          <Map className="h-8 w-8 mb-3 text-slate-300" />
                          <p className="text-base font-medium text-slate-600 dark:text-slate-400">No states found</p>
                          <p className="text-sm mt-1 text-slate-400">Add a state to begin setting up locations.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    states.map((state) => (
                      <tr key={state.id} className="hover:bg-slate-50 dark:bg-slate-900 transition-colors group">
                        <td className="px-6 py-3 font-bold text-slate-900 dark:text-slate-100">{state.name}</td>
                        <td className="px-6 py-3 text-center">
                          <span className="inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400">
                            {state._count?.cities || 0}
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
              Add State
            </h2>
            <form action={async (data) => { 'use server'; await createState(data); }} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">State Name</label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  placeholder="e.g. Gujarat"
                  className="w-full rounded-md border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 focus:bg-white dark:bg-slate-950 focus:border-alvoun-blue focus:outline-none focus:ring-2 focus:ring-alvoun-blue/20 transition-colors"
                />
              </div>
              <button type="submit" className="w-full bg-alvoun-blue text-white rounded-md px-4 py-2.5 text-sm font-medium hover:bg-alvoun-dark transition-colors shadow-sm mt-2">
                Create State
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
