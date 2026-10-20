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
    <div className="flex flex-wrap items-center gap-2 bg-surface-inset shadow-inset px-3 py-1.5 rounded-2xl border border-border/40">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">From</span>
        <input 
          type="date" 
          defaultValue={fromDate} 
          onChange={(e) => updateParam('from', e.target.value)}
          className="text-xs bg-transparent border-none focus:outline-none text-foreground font-semibold cursor-pointer w-[115px]" 
        />
      </div>

      <div className="w-px h-5 bg-border/40"></div>

      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">To</span>
        <input 
          type="date" 
          defaultValue={toDate} 
          onChange={(e) => updateParam('to', e.target.value)}
          className="text-xs bg-transparent border-none focus:outline-none text-foreground font-semibold cursor-pointer w-[115px]" 
        />
      </div>

      <div className="w-px h-5 bg-border/40"></div>

      <select 
        defaultValue={salesmanId || ''} 
        onChange={(e) => updateParam('salesmanId', e.target.value)}
        className="text-xs bg-transparent border-none focus:outline-none text-foreground font-semibold cursor-pointer"
      >
        <option value="" className="bg-surface-raised text-foreground">All Salesmen</option>
        {salesmen.map(s => <option key={s.id} value={s.id} className="bg-surface-raised text-foreground">{s.name}</option>)}
      </select>

      <div className="w-px h-5 bg-border/40"></div>

      <select 
        defaultValue={routeId || ''} 
        onChange={(e) => updateParam('routeId', e.target.value)}
        className="text-xs bg-transparent border-none focus:outline-none text-foreground font-semibold cursor-pointer"
      >
        <option value="" className="bg-surface-raised text-foreground">All Routes</option>
        {routes.map(r => <option key={r.id} value={r.id} className="bg-surface-raised text-foreground">{r.name}</option>)}
      </select>

      <div className="w-px h-5 bg-border/40"></div>

      <select 
        defaultValue={searchParams.get('category') || ''} 
        onChange={(e) => updateParam('category', e.target.value)}
        className="text-xs bg-transparent border-none focus:outline-none text-foreground font-semibold cursor-pointer"
      >
        <option value="" className="bg-surface-raised text-foreground">All Categories</option>
        <option value="RETAILER" className="bg-surface-raised text-foreground">Retailers</option>
        <option value="DEALER" className="bg-surface-raised text-foreground">Dealers</option>
        <option value="DISTRIBUTOR" className="bg-surface-raised text-foreground">Distributors</option>
      </select>

      <div className="w-px h-5 bg-border/40"></div>

      <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground cursor-pointer select-none">
        <input 
          type="checkbox" 
          defaultChecked={outstandingOnly} 
          onChange={(e) => updateParam('outstandingOnly', e.target.checked ? 'true' : 'false')}
          className="rounded border-border text-primary focus:ring-primary cursor-pointer" 
        />
        Owing Only
      </label>
    </div>
  );
}
