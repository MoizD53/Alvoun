'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, X, Users, MapPin, Truck, ChevronRight, CornerDownLeft, ExternalLink } from 'lucide-react';
import { searchGlobalRecords, type GlobalSearchResults } from '../actions/search';

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<GlobalSearchResults | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [isPending, startTransition] = useTransition();

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);

  // Flattened list of navigable items for keyboard navigation
  const flatItems = React.useMemo(() => {
    if (!results) return [];
    const items: { type: 'customer' | 'route' | 'salesman'; id: string; url: string; title: string; subtitle: string }[] = [];

    results.customers.forEach((c) => {
      items.push({
        type: 'customer',
        id: `c-${c.id}`,
        url: `/dashboard/admin/customers/${c.id}`,
        title: c.name,
        subtitle: `${c.areaName} · ${c.contact}`,
      });
    });

    results.routes.forEach((r) => {
      items.push({
        type: 'route',
        id: `r-${r.id}`,
        url: `/dashboard/admin/routes`,
        title: r.name,
        subtitle: `${r.cityName} · ${r.areasCount} areas · ${r.customersCount} clients`,
      });
    });

    results.salesmen.forEach((s) => {
      items.push({
        type: 'salesman',
        id: `s-${s.id}`,
        url: `/dashboard/admin/salesmen/${s.id}`,
        title: s.name,
        subtitle: `${s.employeeCode} · ${s.phone || (s.isActive ? 'Active' : 'Inactive')}`,
      });
    });

    return items;
  }, [results]);

  // Global Ctrl+K / Cmd+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Outside click listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search with request sequence locking to eliminate race conditions
  useEffect(() => {
    const clean = query.trim();
    if (clean.length < 1) {
      setResults(null);
      setActiveIndex(-1);
      return;
    }

    const currentReqId = ++requestIdRef.current;

    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await searchGlobalRecords(clean);
          if (requestIdRef.current === currentReqId) {
            setResults(res);
            setActiveIndex(-1);
            setIsOpen(true);
          }
        } catch (err) {
          if (requestIdRef.current === currentReqId) {
            console.error('Search error:', err);
            // Fallback gracefully without locking out user
            setResults({ customers: [], routes: [], salesmen: [], totalMatches: 0 });
          }
        }
      });
    }, 120);

    return () => clearTimeout(timer);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const clean = query.trim();
      if (activeIndex >= 0 && activeIndex < flatItems.length) {
        navigateTo(flatItems[activeIndex].url);
      } else if (flatItems.length > 0) {
        navigateTo(flatItems[0].url);
      } else if (clean.length > 0) {
        navigateTo(`/dashboard/admin/customers?search=${encodeURIComponent(clean)}`);
      }
      return;
    }

    if (!isOpen || flatItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1 >= flatItems.length ? 0 : prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? flatItems.length - 1 : prev - 1));
    }
  };

  const navigateTo = (url: string) => {
    setIsOpen(false);
    setQuery('');
    router.push(url);
  };

  const clearSearch = () => {
    setQuery('');
    setResults(null);
    setActiveIndex(-1);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim().length >= 1) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search customers, routes, staff..."
          aria-label="Search records"
          aria-expanded={isOpen}
          role="combobox"
          aria-autocomplete="list"
          className="w-full h-10 pl-9.5 pr-14 text-xs font-semibold rounded-xl bg-surface-inset border border-border-default shadow-inset text-primary placeholder:text-muted focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
        />

        {/* Right Adornments: Clear Button + Loading Spinner + Ctrl+K badge */}
        <div className="absolute right-2.5 flex items-center gap-1.5 pointer-events-auto">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-teal-600 dark:text-teal-400" />
          ) : query ? (
            <button
              type="button"
              onClick={clearSearch}
              className="p-1 rounded-md text-muted hover:text-primary hover:bg-surface-raised cursor-pointer transition-colors"
              aria-label="Clear query"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-muted bg-surface-raised border border-border-default shadow-xs select-none">
              <span className="text-[9px]">⌘</span>K
            </kbd>
          )}
        </div>
      </div>

      {/* Dropdown Results Overlay */}
      {isOpen && query.trim().length >= 1 && (
        <div className="absolute top-full left-0 right-0 sm:min-w-[400px] mt-2 z-50 bg-surface-raised border border-border-default shadow-raised rounded-2xl overflow-hidden animate-fade-in-up max-h-[460px] flex flex-col">
          {/* Header Info */}
          <div className="px-3.5 py-2 border-b border-border-default bg-surface-raised flex items-center justify-between text-[11px] text-secondary">
            <span className="font-semibold">
              {isPending
                ? 'Searching records...'
                : results?.totalMatches
                ? `${results.totalMatches} matches found`
                : 'No matches'}
            </span>
            <span className="text-[10px] text-muted hidden sm:inline">Use ↑↓ to navigate · Enter to open</span>
          </div>

          {/* Results Scroll Area */}
          <div className="overflow-y-auto divide-y divide-border-subtle p-1.5 flex-1">
            {/* Empty State */}
            {!isPending && results && results.totalMatches === 0 && (
              <div className="p-6 text-center text-secondary">
                <Search className="h-8 w-8 text-muted mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold text-primary">No records found</p>
                <p className="text-[11px] text-muted mt-0.5 mb-3">
                  No customers, routes, or salesmen matched &ldquo;{query}&rdquo;
                </p>
                <button
                  type="button"
                  onClick={() => navigateTo(`/dashboard/admin/customers?search=${encodeURIComponent(query.trim())}`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-inset border border-border-default text-xs font-bold text-teal-700 dark:text-teal-400 hover:bg-surface-raised transition-colors cursor-pointer"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Search full customer database</span>
                </button>
              </div>
            )}

            {/* Customers Section */}
            {results && results.customers.length > 0 && (
              <div className="py-1">
                <div className="px-2.5 py-1 text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="h-3 w-3 text-teal-600 dark:text-teal-400" />
                  <span>Customers ({results.customers.length})</span>
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {results.customers.map((c) => {
                    const itemIdx = flatItems.findIndex((it) => it.id === `c-${c.id}`);
                    const isSelected = activeIndex === itemIdx;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => navigateTo(`/dashboard/admin/customers/${c.id}`)}
                        className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between transition-colors cursor-pointer group ${
                          isSelected
                            ? 'bg-surface-inset text-teal-800 dark:text-teal-300 shadow-inset font-bold'
                            : 'hover:bg-surface-inset/60 text-primary'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold truncate leading-tight group-hover:text-teal-700 dark:group-hover:text-teal-400">
                            {c.name}
                          </p>
                          <p className="text-[10px] text-secondary truncate mt-0.5">
                            {c.areaName} · {c.contact}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 text-muted">
                          <span className="text-[9px] font-mono text-secondary bg-surface-inset px-1.5 py-0.5 rounded border border-border-default">
                            Customer
                          </span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Routes Section */}
            {results && results.routes.length > 0 && (
              <div className="py-1">
                <div className="px-2.5 py-1 text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-teal-600 dark:text-teal-400" />
                  <span>Routes & Sectors ({results.routes.length})</span>
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {results.routes.map((r) => {
                    const itemIdx = flatItems.findIndex((it) => it.id === `r-${r.id}`);
                    const isSelected = activeIndex === itemIdx;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => navigateTo(`/dashboard/admin/routes`)}
                        className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between transition-colors cursor-pointer group ${
                          isSelected
                            ? 'bg-surface-inset text-teal-800 dark:text-teal-300 shadow-inset font-bold'
                            : 'hover:bg-surface-inset/60 text-primary'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold truncate leading-tight group-hover:text-teal-700 dark:group-hover:text-teal-400">
                            {r.name}
                          </p>
                          <p className="text-[10px] text-secondary truncate mt-0.5">
                            {r.cityName} · {r.areasCount} areas · {r.customersCount} clients
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 text-muted">
                          <span className="text-[9px] font-mono text-secondary bg-surface-inset px-1.5 py-0.5 rounded border border-border-default">
                            Route
                          </span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Salesmen Section */}
            {results && results.salesmen.length > 0 && (
              <div className="py-1">
                <div className="px-2.5 py-1 text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="h-3 w-3 text-teal-600 dark:text-teal-400" />
                  <span>Field Salesmen ({results.salesmen.length})</span>
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {results.salesmen.map((s) => {
                    const itemIdx = flatItems.findIndex((it) => it.id === `s-${s.id}`);
                    const isSelected = activeIndex === itemIdx;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => navigateTo(`/dashboard/admin/salesmen/${s.id}`)}
                        className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between transition-colors cursor-pointer group ${
                          isSelected
                            ? 'bg-surface-inset text-teal-800 dark:text-teal-300 shadow-inset font-bold'
                            : 'hover:bg-surface-inset/60 text-primary'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold truncate leading-tight group-hover:text-teal-700 dark:group-hover:text-teal-400">
                              {s.name}
                            </span>
                            <span className={`h-1.5 w-1.5 rounded-full ${s.isActive ? 'bg-emerald-500' : 'bg-muted'}`} />
                          </div>
                          <p className="text-[10px] text-secondary truncate mt-0.5">
                            {s.employeeCode} {s.phone ? `· ${s.phone}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 text-muted">
                          <span className="text-[9px] font-mono text-secondary bg-surface-inset px-1.5 py-0.5 rounded border border-border-default">
                            Staff
                          </span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Direct Jump */}
          <div className="p-2 border-t border-border-default bg-surface-raised flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => navigateTo(`/dashboard/admin/customers?search=${encodeURIComponent(query.trim())}`)}
              className="w-full py-1.5 px-2 rounded-lg text-teal-700 dark:text-teal-400 hover:bg-surface-inset transition-colors flex items-center justify-center gap-1 font-bold text-[11px]"
            >
              <span>View all matching customers in directory</span>
              <CornerDownLeft className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
