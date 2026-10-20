'use client';

import React, { useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, Loader2, RotateCcw } from 'lucide-react';
import { getKolkataDateString, getCurrentKolkataTime } from '@/lib/time';

export default function AdminDatePicker({ 
  currentDate, 
  basePath = '/dashboard/admin' 
}: { 
  currentDate: string; 
  basePath?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const todayStr = getKolkataDateString(getCurrentKolkataTime());
  const isHistorical = currentDate && currentDate !== todayStr;

  const navigateToDate = (targetDate: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (targetDate && targetDate !== todayStr) {
      params.set('date', targetDate);
    } else {
      params.delete('date');
    }
    
    startTransition(() => {
      const queryStr = params.toString();
      router.push(queryStr ? `${basePath}?${queryStr}` : basePath);
    });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    navigateToDate(e.target.value);
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative inline-flex items-center">
        {isPending ? (
          <Loader2 className="absolute left-3 h-4 w-4 text-teal-600 dark:text-teal-400 animate-spin shrink-0" />
        ) : (
          <Calendar className="pointer-events-none absolute left-3 h-4 w-4 text-muted shrink-0" />
        )}
        <input 
          type="date" 
          value={currentDate || todayStr}
          onChange={handleDateChange}
          disabled={isPending}
          className={`h-10 text-xs font-semibold rounded-xl pl-9 pr-3.5 bg-surface-inset border shadow-inset text-primary focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 cursor-pointer transition-all ${
            isPending ? 'opacity-60 cursor-wait' : ''
          } ${
            isHistorical ? 'border-amber-500/40 text-amber-900 dark:text-amber-200' : 'border-border-default'
          }`}
          aria-label="Filter dashboard by date"
        />
      </div>

      {/* Quick "Today" reset button if viewing historical date */}
      {isHistorical && (
        <button
          type="button"
          onClick={() => navigateToDate(null)}
          disabled={isPending}
          className="h-10 px-2.5 rounded-xl bg-surface-raised border border-border-default shadow-raised text-xs font-bold text-teal-800 dark:text-teal-300 hover:text-teal-900 hover:border-teal-500/50 flex items-center gap-1 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          title="Reset to today's operations"
        >
          <RotateCcw className="h-3 w-3" />
          <span className="hidden sm:inline">Today</span>
        </button>
      )}
    </div>
  );
}
