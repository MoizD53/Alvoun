'use client';

import React, { useState, useRef, useEffect, useTransition, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  Loader2, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getKolkataDateString, getCurrentKolkataTime } from '@/lib/time';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

interface AdminDatePickerProps {
  currentDate: string;
  basePath?: string;
  compact?: boolean;
}

export default function AdminDatePicker({
  currentDate,
  basePath,
  compact = false,
}: AdminDatePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Today in Asia/Kolkata timezone
  const todayStr = useMemo(() => {
    return getKolkataDateString(getCurrentKolkataTime());
  }, []);

  const effectiveDate = currentDate || todayStr;
  const isHistorical = effectiveDate !== todayStr;

  // Selected date components for calendar view
  const [selectedYear, selectedMonth, selectedDay] = useMemo(() => {
    const parts = (effectiveDate || todayStr).split('-').map(Number);
    return [parts[0], parts[1] - 1, parts[2]];
  }, [effectiveDate, todayStr]);

  // Calendar view month & year (for navigation inside popover)
  const [viewYear, setViewYear] = useState<number>(selectedYear);
  const [viewMonth, setViewMonth] = useState<number>(selectedMonth);

  // Sync view when effectiveDate changes
  useEffect(() => {
    setViewYear(selectedYear);
    setViewMonth(selectedMonth);
  }, [selectedYear, selectedMonth]);

  // Click outside to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Navigate to target date via URL searchParams
  const navigateToDate = (targetDate: string) => {
    // Strict block: never allow future dates
    if (targetDate > todayStr) {
      targetDate = todayStr;
    }

    const targetBasePath = basePath || pathname;
    const params = new URLSearchParams(searchParams.toString());

    if (targetDate && targetDate !== todayStr) {
      params.set('date', targetDate);
    } else {
      params.delete('date');
    }

    setIsOpen(false);

    startTransition(() => {
      const queryStr = params.toString();
      router.push(queryStr ? `${targetBasePath}?${queryStr}` : targetBasePath);
    });
  };

  // Month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const [todayYear, todayMonth] = useMemo(() => {
    const parts = todayStr.split('-').map(Number);
    return [parts[0], parts[1] - 1];
  }, [todayStr]);

  const isNextMonthDisabled = useMemo(() => {
    if (viewYear > todayYear) return true;
    if (viewYear === todayYear && viewMonth >= todayMonth) return true;
    return false;
  }, [viewYear, viewMonth, todayYear, todayMonth]);

  const handleNextMonth = () => {
    if (isNextMonthDisabled) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Build 42-day calendar matrix for viewYear & viewMonth
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);

    // Day of week: 0=Sun, 1=Mon, ..., 6=Sat -> Convert to Mon=0 ... Sun=6
    const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const days: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isSelected: boolean;
      isToday: boolean;
      isFuture: boolean;
    }[] = [];

    // Previous month padding days
    const prevMonthLastDate = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDate - i;
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      const mm = String(prevMonth + 1).padStart(2, '0');
      const dd = String(dayNum).padStart(2, '0');
      const dateStr = `${prevYear}-${mm}-${dd}`;
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isSelected: dateStr === effectiveDate,
        isToday: dateStr === todayStr,
        isFuture: dateStr > todayStr,
      });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const mm = String(viewMonth + 1).padStart(2, '0');
      const dd = String(i).padStart(2, '0');
      const dateStr = `${viewYear}-${mm}-${dd}`;
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        isSelected: dateStr === effectiveDate,
        isToday: dateStr === todayStr,
        isFuture: dateStr > todayStr,
      });
    }

    // Next month padding days to complete 35 or 42 cells
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
      const mm = String(nextMonth + 1).padStart(2, '0');
      const dd = String(i).padStart(2, '0');
      const dateStr = `${nextYear}-${mm}-${dd}`;
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isSelected: dateStr === effectiveDate,
        isToday: dateStr === todayStr,
        isFuture: dateStr > todayStr,
      });
    }

    return days;
  }, [viewYear, viewMonth, effectiveDate, todayStr]);

  // Formatted display text (e.g., "23 Oct 2026")
  const formattedDisplayDate = useMemo(() => {
    try {
      const [y, m, d] = effectiveDate.split('-').map(Number);
      const monthShort = MONTH_NAMES[m - 1]?.slice(0, 3) || '';
      return `${d} ${monthShort} ${y}`;
    } catch {
      return effectiveDate;
    }
  }, [effectiveDate]);

  return (
    <div ref={containerRef} className={`relative inline-flex items-center ${isOpen ? 'z-[100]' : 'z-10'}`}>
      {/* 1. Main Uniform Calendar Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className={`group relative inline-flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold select-none cursor-pointer border transition-all duration-180 ${
          isOpen
            ? 'bg-surface-inset border-primary shadow-inset text-primary ring-2 ring-primary/20'
            : isHistorical
            ? 'bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200 hover:bg-amber-500/15 shadow-raised-sm'
            : 'bg-surface-raised border-border-default hover:border-primary/50 text-foreground hover:bg-surface-inset shadow-raised hover:shadow-raised-sm'
        } ${isPending ? 'opacity-70 cursor-wait' : ''}`}
        title="Open Universal Reporting Calendar (Asia/Kolkata)"
        aria-expanded={isOpen}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
        ) : (
          <Calendar className="h-4 w-4 text-primary shrink-0 transition-transform group-hover:scale-105" />
        )}

        <span className="font-extrabold tracking-tight tabular-nums">
          {formattedDisplayDate}
        </span>

        {isHistorical ? (
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300 font-black">
            Past
          </span>
        ) : (
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-black">
            Today
          </span>
        )}

        <ChevronDown 
          className={`h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* 2. Interactive Calendar Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-[999] w-[315px] bg-[#FAF6F0] dark:bg-[#1E242B] border border-border-strong shadow-[0_25px_60px_-10px_rgba(0,0,0,0.35)] rounded-2xl p-4 animate-scale-in select-none">
          {/* Header: Month & Year with Navigation */}
          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-border-default/60">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-inset transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="font-bold text-sm text-foreground">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              disabled={isNextMonthDisabled}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-inset transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
              title={isNextMonthDisabled ? 'Future dates are prohibited' : 'Next Month'}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday Labels (Mon - Sun) */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAY_NAMES.map((name) => (
              <span key={name} className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground py-1">
                {name}
              </span>
            ))}
          </div>

          {/* 42-Cell Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              if (day.isFuture) {
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled
                    className="h-8 w-8 mx-auto flex items-center justify-center text-xs text-muted-foreground/30 opacity-20 cursor-not-allowed rounded-lg"
                    title="Future dates are not permitted"
                  >
                    {day.dayNumber}
                  </button>
                );
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => navigateToDate(day.dateStr)}
                  className={`h-8 w-8 mx-auto flex items-center justify-center text-xs font-semibold rounded-xl transition-all relative ${
                    day.isSelected
                      ? 'bg-primary text-primary-foreground font-black shadow-raised-sm'
                      : day.isCurrentMonth
                      ? 'text-foreground hover:bg-surface-inset hover:font-bold'
                      : 'text-muted-foreground/50 hover:bg-surface-inset/60'
                  }`}
                >
                  <span>{day.dayNumber}</span>
                  {day.isToday && !day.isSelected && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Shortcuts Footer */}
          <div className="mt-3 pt-3 border-t border-border-default/60 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => navigateToDate(todayStr)}
              className="inline-flex items-center gap-1 font-bold text-primary hover:underline px-2 py-1 rounded-lg hover:bg-surface-inset transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Today</span>
            </button>

            {isHistorical && (
              <button
                type="button"
                onClick={() => {
                  // Yesterday
                  const d = new Date(todayStr);
                  d.setDate(d.getDate() - 1);
                  navigateToDate(d.toISOString().split('T')[0]);
                }}
                className="font-semibold text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-surface-inset transition-colors"
              >
                Yesterday
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="font-semibold text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-surface-inset transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
