'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, MapPin, Building2, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { createRoute } from '@/lib/actions/route';
import { createArea } from '@/lib/actions/area';

interface AddTerritoryFormsProps {
  cities: any[];
  routes: any[];
  salesmen: any[];
}

export default function AddTerritoryForms({ cities, routes, salesmen }: AddTerritoryFormsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'ROUTE' | 'AREA'>('AREA');
  const [isPending, startTransition] = useTransition();

  // Route Form State
  const [routeForm, setRouteForm] = useState({
    cityId: '',
    name: '',
    salesmanId: '',
  });

  // Area Form State
  const [areaForm, setAreaForm] = useState({
    routeId: routes[0]?.id || '',
    name: '',
  });

  // Feedback State
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleCreateRoute = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const fd = new FormData();
    fd.append('cityId', routeForm.cityId);
    fd.append('name', routeForm.name);
    if (routeForm.salesmanId) {
      fd.append('salesmanId', routeForm.salesmanId);
    }
    fd.append('isActive', 'true');

    startTransition(async () => {
      try {
        const res = await createRoute(fd);
        if (res?.error) {
          setStatusMessage({ type: 'error', text: res.error });
        } else {
          setStatusMessage({ type: 'success', text: `Route "${routeForm.name}" created successfully!` });
          setRouteForm({ cityId: '', name: '', salesmanId: '' });
          router.refresh();
        }
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: err?.message || 'Failed to create route.' });
      }
    });
  };

  const handleCreateArea = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!areaForm.routeId) {
      setStatusMessage({ type: 'error', text: 'Please select a delivery route.' });
      return;
    }

    const fd = new FormData();
    fd.append('routeId', areaForm.routeId);
    fd.append('name', areaForm.name.trim());

    startTransition(async () => {
      try {
        const res = await createArea(fd);
        if (res?.error) {
          setStatusMessage({ type: 'error', text: res.error });
        } else {
          const selectedRoute = routes.find(r => r.id === areaForm.routeId);
          setStatusMessage({ 
            type: 'success', 
            text: `Area "${areaForm.name.trim()}" created successfully under ${selectedRoute?.name || 'route'}!` 
          });
          setAreaForm(prev => ({ ...prev, name: '' }));
          router.refresh();
        }
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: err?.message || 'Failed to create area.' });
      }
    });
  };

  return (
    <div className="bg-surface-raised p-5 sm:p-6 rounded-3xl shadow-raised border border-border-subtle sticky top-24 select-none">
      {/* Tab Switcher: Route vs Area */}
      <div className="flex items-center gap-1.5 p-1 bg-surface-sunken border border-border-subtle shadow-inset rounded-2xl mb-5">
        <button
          type="button"
          onClick={() => {
            setActiveTab('AREA');
            setStatusMessage(null);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'AREA'
              ? 'bg-brand-teal text-white shadow-raised'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <MapPin className="h-3.5 w-3.5" />
          <span>+ Add Area</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('ROUTE');
            setStatusMessage(null);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'ROUTE'
              ? 'bg-brand-teal text-white shadow-raised'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          <span>+ Add Route</span>
        </button>
      </div>

      {/* Header */}
      <div className="mb-4">
        <h2 className="text-base font-black text-text-primary flex items-center gap-2 tracking-tight">
          <Plus className="h-4 w-4 text-brand-teal" />
          {activeTab === 'AREA' ? 'Add New Area' : 'Add New Route'}
        </h2>
        <p className="text-xs text-text-muted mt-0.5 font-medium">
          {activeTab === 'AREA'
            ? 'Create a territory sector / delivery area under an existing route.'
            : 'Establish a new regional route for dispatches and driver assignments.'}
        </p>
      </div>

      {/* Feedback Banner */}
      {statusMessage && (
        <div
          className={`p-3 rounded-2xl mb-4 text-xs font-semibold flex items-center gap-2 border animate-fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
              : 'bg-red-500/10 text-red-800 dark:text-red-300 border-red-500/30'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* 1. ADD NEW AREA FORM */}
      {activeTab === 'AREA' && (
        <form onSubmit={handleCreateArea} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Select Route
            </label>
            <select
              value={areaForm.routeId}
              onChange={(e) => setAreaForm({ ...areaForm, routeId: e.target.value })}
              required
              disabled={isPending}
              className="w-full rounded-2xl border border-border-subtle px-3.5 py-2.5 text-sm font-semibold bg-surface-sunken shadow-inset text-text-primary focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20 transition-all cursor-pointer"
            >
              <option value="">Select a Route</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.city?.name || 'Dahod'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Area / Sector Name
            </label>
            <input
              type="text"
              value={areaForm.name}
              onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })}
              required
              disabled={isPending}
              placeholder="e.g. Govind Nagar, Station Road Area"
              className="w-full rounded-2xl border border-border-subtle px-3.5 py-2.5 text-sm font-semibold bg-surface-sunken shadow-inset text-text-primary placeholder:text-text-muted focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isPending || !areaForm.name.trim() || !areaForm.routeId}
            className="w-full min-h-[44px] bg-brand-teal hover:bg-brand-teal-dark disabled:opacity-50 text-white rounded-2xl px-4 py-3 text-sm font-black shadow-raised active:scale-[0.98] transition-all tracking-wide flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating Area...</span>
              </>
            ) : (
              <span>Create Area</span>
            )}
          </button>
        </form>
      )}

      {/* 2. ADD NEW ROUTE FORM */}
      {activeTab === 'ROUTE' && (
        <form onSubmit={handleCreateRoute} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
              City
            </label>
            <select
              value={routeForm.cityId}
              onChange={(e) => setRouteForm({ ...routeForm, cityId: e.target.value })}
              required
              disabled={isPending}
              className="w-full rounded-2xl border border-border-subtle px-3.5 py-2.5 text-sm font-semibold bg-surface-sunken shadow-inset text-text-primary focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20 transition-all cursor-pointer"
            >
              <option value="">Select City</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.state.name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Route Name
            </label>
            <input
              type="text"
              value={routeForm.name}
              onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })}
              required
              disabled={isPending}
              placeholder="e.g. Downtown Sector A"
              className="w-full rounded-2xl border border-border-subtle px-3.5 py-2.5 text-sm font-semibold bg-surface-sunken shadow-inset text-text-primary placeholder:text-text-muted focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Default Salesman (Optional)
            </label>
            <select
              value={routeForm.salesmanId}
              onChange={(e) => setRouteForm({ ...routeForm, salesmanId: e.target.value })}
              disabled={isPending}
              className="w-full rounded-2xl border border-border-subtle px-3.5 py-2.5 text-sm font-semibold bg-surface-sunken shadow-inset text-text-primary focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20 transition-all cursor-pointer"
            >
              <option value="">None</option>
              {salesmen.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isPending || !routeForm.name.trim() || !routeForm.cityId}
            className="w-full min-h-[44px] bg-brand-teal hover:bg-brand-teal-dark disabled:opacity-50 text-white rounded-2xl px-4 py-3 text-sm font-black shadow-raised active:scale-[0.98] transition-all tracking-wide flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating Route...</span>
              </>
            ) : (
              <span>Create Route</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
