'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { useState, useEffect, useRef, useTransition } from 'react';
import { Spinner } from '@/components/ui/spinner';

export default function CustomerFilterBar({
  initialFilters,
  routes,
  salesmen
}: {
  initialFilters: {
    search?: string;
    category?: string;
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

  // Debounced search effect (200ms)
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
    <div className="bg-surface-raised p-4 rounded-2xl border border-border-default shadow-xs">
      <div className="flex flex-col lg:flex-row gap-3 items-center">
        {/* Search Input Well */}
        <div className="relative w-full lg:w-96 shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            {isPending ? (
              <Spinner size="xs" variant="teal" />
            ) : (
              <Search className="h-4 w-4 text-muted" />
            )}
          </div>
          <input 
            type="text" 
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Search customers, firm name, phone, code..." 
            className="w-full pl-10 pr-3.5 py-2.5 bg-surface-inset border border-border-default shadow-inset rounded-xl text-xs font-medium text-primary placeholder:text-muted focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
          />
        </div>
        
        {/* Filter Dropdowns */}
        <div className="flex w-full lg:w-auto gap-2.5 overflow-x-auto pb-1 lg:pb-0">
          <select 
            defaultValue={initialFilters.category || ''} 
            onChange={(e) => updateParam('category', e.target.value)}
            className="bg-surface-inset border border-border-default shadow-inset rounded-xl px-3 py-2 text-xs font-semibold text-primary focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 min-w-[130px] cursor-pointer"
          >
            <option value="">All Categories</option>
            <option value="RETAILER">Retailers</option>
            <option value="DEALER">Dealers</option>
            <option value="DISTRIBUTOR">Distributors</option>
          </select>

          

          

          <select 
            defaultValue={initialFilters.status || ''} 
            onChange={(e) => updateParam('status', e.target.value)}
            className="bg-surface-inset border border-border-default shadow-inset rounded-xl px-3 py-2 text-xs font-semibold text-primary focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 min-w-[110px] cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <select 
            defaultValue={initialFilters.sort || 'asc'} 
            onChange={(e) => updateParam('sort', e.target.value)}
            className="bg-surface-inset border border-border-default shadow-inset rounded-xl px-3 py-2 text-xs font-semibold text-primary focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 min-w-[110px] cursor-pointer"
          >
            <option value="asc">A to Z</option>
            <option value="desc">Z to A</option>
          </select>
        </div>
      </div>
    </div>
  );
}
