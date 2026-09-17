'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createCustomer, updateCustomer } from '@/lib/actions/customer';

export default function CustomerForm({
  initialData,
  states,
  cities,
  routes,
  salesmen
}: {
  initialData?: any,
  states: any[],
  cities: any[],
  routes: any[],
  salesmen: any[]
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [stateId, setStateId] = useState(initialData?.stateId || '');
  const [cityId, setCityId] = useState(initialData?.cityId || '');

  const availableCities = cities.filter(c => c.stateId === stateId);
  const availableRoutes = routes.filter(r => r.cityId === cityId);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);
    
    // Convert float input to paise for openingBalance
    const balanceInput = parseFloat(data.openingBalance as string);
    data.openingBalance = (isNaN(balanceInput) ? 0 : Math.round(balanceInput * 100)) as any;

    startTransition(async () => {
      const res = initialData?.id 
        ? await updateCustomer(initialData.id, data)
        : await createCustomer(data);
        
      if (res.error) {
        setError(res.error);
      } else {
        router.push('/dashboard/admin/customers');
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-4 rounded-md text-sm">{error}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Customer Name *</label>
          <input required type="text" name="customerName" defaultValue={initialData?.customerName} className="w-full rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contact Number *</label>
          <input required type="text" name="contact" defaultValue={initialData?.contact} className="w-full rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Address *</label>
          <textarea required name="address" defaultValue={initialData?.address} rows={3} className="w-full rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"></textarea>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">State *</label>
          <select 
            required name="stateId" value={stateId} 
            onChange={(e) => { setStateId(e.target.value); setCityId(''); }}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-950"
          >
            <option value="">Select State</option>
            {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">City *</label>
          <select 
            required name="cityId" value={cityId} 
            onChange={(e) => setCityId(e.target.value)}
            disabled={!stateId}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-950 disabled:bg-slate-100 dark:bg-slate-800"
          >
            <option value="">Select City</option>
            {availableCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Route *</label>
          <select 
            required name="routeId" defaultValue={initialData?.routeId || ''} 
            disabled={!cityId}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-950 disabled:bg-slate-100 dark:bg-slate-800"
          >
            <option value="">Select Route</option>
            {availableRoutes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Salesman *</label>
          <select required name="salesmanId" defaultValue={initialData?.salesmanId || ''} className="w-full rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-950">
            <option value="">Select Salesman</option>
            {salesmen.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Opening Balance (₹) *</label>
          <input required type="number" step="0.01" min="0" name="openingBalance" defaultValue={initialData ? (initialData.openingBalance / 100).toFixed(2) : '0.00'} className="w-full rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Balance Type</label>
          <select name="openingBalanceType" defaultValue={initialData?.openingBalanceType || 'DEBIT'} className="w-full rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-950">
            <option value="DEBIT">DEBIT (Customer owes us)</option>
            <option value="CREDIT">CREDIT (We owe customer)</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
          <select name="status" defaultValue={initialData?.status || 'ACTIVE'} className="w-full rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-950">
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>
      </div>
      
      <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:bg-slate-900">
          Cancel
        </button>
        <button type="submit" disabled={isPending} className="px-4 py-2 text-sm font-medium text-white bg-alvoun-blue rounded-md hover:bg-alvoun-dark disabled:opacity-50">
          {isPending ? 'Saving...' : (initialData ? 'Update Customer' : 'Create Customer')}
        </button>
      </div>
    </form>
  );
}
