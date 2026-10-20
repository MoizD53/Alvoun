import { getCities, createCity } from '@/lib/actions/city';
import { getStates } from '@/lib/actions/state';
import { prisma } from '@/lib/db';
import { Building2, Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import TerritoryNav from '../routes/components/TerritoryNav';

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
            <h1 className="text-2xl font-black text-text-primary tracking-tight">Cities</h1>
            <p className="text-xs font-semibold text-text-muted mt-0.5">Manage operational cities and assign regional hubs.</p>
          </div>
        </div>
      </div>

      {/* Territory Navigation Pills */}
      <TerritoryNav />
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Table Column */}
        <div className="lg:col-span-3">
          <div className="bg-surface-raised rounded-3xl shadow-raised border border-border-subtle overflow-hidden">
            <div className="overflow-x-auto min-h-[260px]">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-surface/80 text-text-muted font-bold text-xs uppercase tracking-wider border-b border-border-subtle">
                  <tr>
                    <th className="px-6 py-4">City Name</th>
                    <th className="px-6 py-4">State</th>
                    <th className="px-6 py-4 text-center">Routes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {cities.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-16 text-center text-text-muted">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-14 h-14 bg-surface-sunken shadow-inset border border-border-subtle rounded-2xl flex items-center justify-center mb-3 text-text-muted">
                            <Building2 className="h-7 w-7" />
                          </div>
                          <p className="text-base font-black text-text-primary">No cities found</p>
                          <p className="text-xs font-semibold text-text-muted mt-1">Add a city using the form on the right to begin creating routes.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    cities.map((city) => (
                      <tr key={city.id} className="hover:bg-surface-sunken/40 transition-colors group">
                        <td className="px-6 py-4 font-black text-text-primary text-base">{city.name}</td>
                        <td className="px-6 py-4 font-semibold text-text-secondary">{city.state.name}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center h-6 min-w-[1.75rem] px-2.5 rounded-full bg-surface-sunken shadow-inset-sm text-xs font-black text-text-primary border border-border-subtle">
                            {city._count?.routes || 0}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {/* Add City Column */}
        <div className="lg:col-span-1">
          <div className="bg-surface-raised p-6 rounded-3xl shadow-raised border border-border-subtle sticky top-24">
            <h2 className="text-base font-black text-text-primary mb-4 flex items-center gap-2 tracking-tight">
              <Plus className="h-4 w-4 text-brand-teal" />
              Add City
            </h2>
            <form action={async (data) => { 'use server'; await createCity(data); }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">State</label>
                <select 
                  name="stateId" 
                  required 
                  className="w-full rounded-2xl border border-border-subtle px-3.5 py-2.5 text-sm font-semibold bg-surface-sunken shadow-inset text-text-primary focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20 transition-all"
                >
                  <option value="">Select State</option>
                  {states.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">City Name</label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  placeholder="e.g. Surat"
                  className="w-full rounded-2xl border border-border-subtle px-3.5 py-2.5 text-sm font-semibold bg-surface-sunken shadow-inset text-text-primary placeholder:text-text-muted focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20 transition-all"
                />
              </div>
              <button 
                type="submit" 
                className="w-full min-h-[44px] bg-brand-teal hover:bg-brand-teal-dark text-white rounded-2xl px-4 py-3 text-sm font-black shadow-raised active:scale-[0.98] transition-all tracking-wide mt-2"
              >
                Create City
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
