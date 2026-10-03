'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export default function OutstandingFilterBar({
  fromDate,
  toDate,
  salesmanId,
  routeId,
  outstandingOnly,
  salesmen,
  routes
}: {
  fromDate: string;
  toDate: string;
  salesmanId?: string;
  routeId?: string;
  outstandingOnly: boolean;
  salesmen: { id: string; name: string }[];
  routes: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = (key: string, value: string | boolean | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value !== undefined && value !== '' && value !== false) {
      params.set(key, String(value));
    } else {
      params.delete(key);
    }
    router.push(`/dashboard/admin/reports/outstanding?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center gap-1.5 px-2">
        <span className="text-xs font-semibold text-slate-400">From</span>
        <input 
          type="date" 
          defaultValue={fromDate} 
          onChange={(e) => updateParam('from', e.target.value)}
          className="text-xs bg-transparent border-none focus:ring-0 focus:outline-none text-slate-900 dark:text-slate-100 cursor-pointer" 
        />
      </div>
      <div className="w-px h-5 bg-slate-200 dark:bg-slate-700"></div>
      <div className="flex items-center gap-1.5 px-2">
        <span className="text-xs font-semibold text-slate-400">To</span>
        <input 
          type="date" 
          defaultValue={toDate} 
          onChange={(e) => updateParam('to', e.target.value)}
          className="text-xs bg-transparent border-none focus:ring-0 focus:outline-none text-slate-900 dark:text-slate-100 cursor-pointer" 
        />
      </div>
      <div className="w-px h-5 bg-slate-200 dark:bg-slate-700"></div>
      <select 
        defaultValue={salesmanId || ''} 
        onChange={(e) => updateParam('salesmanId', e.target.value)}
        className="px-2 py-1 text-xs bg-transparent border-none focus:ring-0 focus:outline-none text-slate-900 dark:text-slate-100 cursor-pointer"
      >
        <option value="">All Salesmen</option>
        {salesmen.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <div className="w-px h-5 bg-slate-200 dark:bg-slate-700"></div>
      <select 
        defaultValue={routeId || ''} 
        onChange={(e) => updateParam('routeId', e.target.value)}
        className="px-2 py-1 text-xs bg-transparent border-none focus:ring-0 focus:outline-none text-slate-900 dark:text-slate-100 cursor-pointer"
      >
        <option value="">All Routes</option>
        {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>
      <div className="w-px h-5 bg-slate-200 dark:bg-slate-700"></div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 px-2 cursor-pointer">
        <input 
          type="checkbox" 
          defaultChecked={outstandingOnly} 
          onChange={(e) => updateParam('outstandingOnly', e.target.checked ? 'true' : 'false')}
          className="rounded border-slate-300 dark:border-slate-700 text-alvoun-blue focus:ring-alvoun-blue" 
        />
        Owing Only
      </label>
    </div>
  );
}
