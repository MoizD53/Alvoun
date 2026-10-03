'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { useState, useEffect, useRef, useTransition } from 'react';

export default function CustomerFilterBar({
  initialFilters,
  routes,
  salesmen
}: {
  initialFilters: {
    search?: string;
    routeId?: string;
    salesmanId?: string;
    status?: string;
    sort?: string;
  };
  routes: { id: string; name: string }[];
  salesmen: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchVal, setSearchVal] = useState(initialFilters.search || '');
  const isFirstMount = useRef(true);

  // Sync state if initialFilters.search changes externally
  useEffect(() => {
    setSearchVal(initialFilters.search || '');
  }, [initialFilters.search]);

  // Debounced search effect (200ms) to ensure smooth fast typing without lag
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchVal.trim()) {
        params.set('search', searchVal.trim());
      } else {
        params.delete('search');
      }
      params.delete('page');
      startTransition(() => {
        router.push(`/dashboard/admin/customers?${params.toString()}`);
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [searchVal]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page'); // Reset pagination on filter change
    startTransition(() => {
      router.push(`/dashboard/admin/customers?${params.toString()}`);
    });
  };

  return (
    <div className="bg-white dark:bg-slate-950 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
      <div className="flex flex-col lg:flex-row gap-3 items-center">
        <div className="relative w-full lg:w-96 flex-shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {isPending ? (
              <div className="h-4 w-4 border-2 border-alvoun-blue border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="h-4 w-4 text-slate-400" />
            )}
          </div>
          <input 
            type="text" 
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Search customers..." 
            className="text-slate-900 dark:text-slate-100 w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-alvoun-blue/20 focus:border-alvoun-blue transition-colors"
          />
        </div>
        
        <div className="flex w-full lg:w-auto gap-2 overflow-x-auto pb-1 lg:pb-0">
          <select 
            defaultValue={initialFilters.routeId || ''} 
            onChange={(e) => updateParam('routeId', e.target.value)}
            className="text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-alvoun-blue/20 focus:border-alvoun-blue min-w-[140px] cursor-pointer"
          >
            <option value="">All Routes</option>
            {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select 
            defaultValue={initialFilters.salesmanId || ''} 
            onChange={(e) => updateParam('salesmanId', e.target.value)}
            className="text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-alvoun-blue/20 focus:border-alvoun-blue min-w-[140px] cursor-pointer"
          >
            <option value="">All Salesmen</option>
            {salesmen.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select 
            defaultValue={initialFilters.status || ''} 
            onChange={(e) => updateParam('status', e.target.value)}
            className="text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-alvoun-blue/20 focus:border-alvoun-blue min-w-[120px] cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <select 
            defaultValue={initialFilters.sort || 'asc'} 
            onChange={(e) => updateParam('sort', e.target.value)}
            className="text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-alvoun-blue/20 focus:border-alvoun-blue min-w-[120px] cursor-pointer"
          >
            <option value="asc">A to Z</option>
            <option value="desc">Z to A</option>
          </select>
        </div>
      </div>
    </div>
  );
}
