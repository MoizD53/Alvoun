'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createCustomer, updateCustomer } from '@/lib/actions/customer';
import { Button } from '@/components/ui/button';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Building2, Phone, MapPin, UserCheck, IndianRupee, Save } from 'lucide-react';

export default function CustomerForm({
  initialData,
  states,
  cities,
  routes,
  salesmen,
  areas = [],
}: {
  initialData?: any;
  states: any[];
  cities: any[];
  routes: any[];
  salesmen: any[];
  areas?: any[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [stateId, setStateId] = useState(initialData?.stateId || '');
  const [cityId, setCityId] = useState(initialData?.cityId || '');
  const [routeId, setRouteId] = useState(initialData?.routeId || '');
  const [areaId, setAreaId] = useState(initialData?.areaId || '');

  const availableCities = stateId ? cities.filter(c => c.stateId === stateId) : cities;
  const availableRoutes = cityId ? routes.filter(r => r.cityId === cityId) : routes;
  const availableAreas = routeId ? areas.filter(a => a.routeId === routeId) : areas;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);
    
    // Explicitly ensure routeId & areaId are set from state
    if (routeId) data.routeId = routeId;
    if (areaId) data.areaId = areaId;

    // Convert float input to paise for openingBalance
    const balanceInput = parseFloat(data.openingBalance as string);
    data.openingBalance = (isNaN(balanceInput) ? 0 : Math.round(balanceInput * 100)) as any;

    startTransition(async () => {
      const res = initialData?.id 
        ? await updateCustomer(initialData.id, data)
        : await createCustomer(data);
        
      if (res?.error) {
        setError(res.error);
      } else {
        router.push('/dashboard/admin/customers');
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {error && (
        <AlertBanner
          variant="danger"
          title="Could not save customer"
          onClose={() => setError(null)}
        >
          {error}
        </AlertBanner>
      )}

      {/* Basic Details Section */}
      <div className="bg-surface-raised shadow-raised rounded-2xl p-6 border border-border/40 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-border/40">
          <Building2 className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Basic Information</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Customer Name <span className="text-destructive">*</span>
            </label>
            <input
              required
              type="text"
              name="customerName"
              placeholder="e.g. Ramesh Bhai Parmar"
              defaultValue={initialData?.customerName}
              className="w-full rounded-xl bg-surface-inset shadow-inset border border-border/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Firm / Shop Name
            </label>
            <input
              type="text"
              name="firmName"
              placeholder="e.g. Jay Ambe Cold Drinks"
              defaultValue={initialData?.firmName}
              className="w-full rounded-xl bg-surface-inset shadow-inset border border-border/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Customer Category <span className="text-destructive">*</span>
            </label>
            <select
              name="category"
              defaultValue={
                initialData?.category === 'B' ? 'B' :
                initialData?.category === 'C' ? 'C' : 'A'
              }
              className="w-full rounded-xl bg-surface-inset shadow-inset border border-border/40 px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all cursor-pointer font-bold"
            >
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Contact Number <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                required
                type="text"
                name="contact"
                placeholder="e.g. +91 98765 43210"
                defaultValue={initialData?.contact}
                className="w-full rounded-xl bg-surface-inset shadow-inset border border-border/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Address <span className="text-destructive">*</span>
            </label>
            <textarea
              required
              name="address"
              defaultValue={initialData?.address}
              rows={3}
              placeholder="Shop No., Street, Landmark"
              className="w-full rounded-xl bg-surface-inset shadow-inset border border-border/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
            />
          </div>
        </div>
      </div>

      {/* Location & Routing Section */}
      <div className="bg-surface-raised shadow-raised rounded-2xl p-6 border border-border/40 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-border/40">
          <MapPin className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Territory & Routing</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              State <span className="text-destructive">*</span>
            </label>
            <select 
              required
              name="stateId"
              value={stateId} 
              onChange={(e) => { setStateId(e.target.value); setCityId(''); }}
              className="w-full rounded-xl bg-surface-inset shadow-inset border border-border/40 px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all cursor-pointer font-semibold"
            >
              <option value="">Select State</option>
              {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              City <span className="text-destructive">*</span>
            </label>
            <select 
              required
              name="cityId"
              value={cityId} 
              onChange={(e) => setCityId(e.target.value)}
              className="w-full rounded-xl bg-surface-inset shadow-inset border border-border/40 px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all cursor-pointer font-semibold"
            >
              <option value="">Select City</option>
              {availableCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Route / Beat
            </label>
            <select 
              name="routeId"
              value={routeId} 
              onChange={(e) => {
                const newRouteId = e.target.value;
                setRouteId(newRouteId);
                // Clear area if it doesn't belong to new route
                if (newRouteId) {
                  const areaBelongs = areas.some(a => a.id === areaId && a.routeId === newRouteId);
                  if (!areaBelongs) setAreaId('');
                }
              }}
              className="w-full rounded-xl bg-surface-inset shadow-inset border border-border/40 px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all cursor-pointer font-semibold"
            >
              <option value="">Select Route</option>
              {availableRoutes.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Area / Sector
            </label>
            <select 
              name="areaId"
              value={areaId} 
              onChange={(e) => {
                const selectedVal = e.target.value;
                setAreaId(selectedVal);
                if (selectedVal) {
                  const matchedArea = areas.find(a => a.id === selectedVal);
                  if (matchedArea?.routeId && matchedArea.routeId !== routeId) {
                    setRouteId(matchedArea.routeId);
                  }
                }
              }}
              className="w-full rounded-xl bg-surface-inset shadow-inset border border-border/40 px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all cursor-pointer font-semibold"
            >
              <option value="">Select Area</option>
              {availableAreas.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} {a.route ? `(${a.route.name})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Financials & Status Section */}
      <div className="bg-surface-raised shadow-raised rounded-2xl p-6 border border-border/40 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-border/40">
          <IndianRupee className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Financials & Status</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Opening Balance (₹) <span className="text-destructive">*</span>
            </label>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              name="openingBalance"
              defaultValue={initialData ? (initialData.openingBalance / 100).toFixed(2) : '0.00'}
              className="w-full rounded-xl bg-surface-inset shadow-inset border border-border/40 px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Balance Type
            </label>
            <select
              name="openingBalanceType"
              defaultValue={initialData?.openingBalanceType || 'DEBIT'}
              className="w-full rounded-xl bg-surface-inset shadow-inset border border-border/40 px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all cursor-pointer font-semibold"
            >
              <option value="DEBIT">DEBIT (Customer owes us)</option>
              <option value="CREDIT">CREDIT (We owe customer)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Account Status
            </label>
            <select
              name="status"
              defaultValue={initialData?.status || 'ACTIVE'}
              className="w-full rounded-xl bg-surface-inset shadow-inset border border-border/40 px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all cursor-pointer font-semibold"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Form Action Controls */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isPending}
          className="shadow-raised hover:shadow-raised-sm press-active font-bold"
        >
          <Save className="w-4 h-4 mr-1.5" />
          {isPending ? 'Saving...' : (initialData ? 'Update Customer' : 'Create Customer')}
        </Button>
      </div>
    </form>
  );
}
