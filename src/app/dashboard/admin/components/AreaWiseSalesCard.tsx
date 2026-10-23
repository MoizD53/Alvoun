'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, ChevronRight } from 'lucide-react';
import { formatMoney } from '@/lib/format';
import type { AreaSaleItem } from '@/lib/dashboard-data';

interface AreaWiseSalesCardProps {
  areaSales: AreaSaleItem[];
  selectedDate?: string;
  isToday?: boolean;
}

export default function AreaWiseSalesCard({ 
  areaSales,
  selectedDate,
  isToday = true,
}: AreaWiseSalesCardProps) {
  const maxAreaSales = areaSales.length > 0 ? Math.max(...areaSales.map((a) => a.salesPaise), 1) : 1;

  return (
    <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-4 flex flex-col justify-between h-full select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="min-w-0">
          <h3 className="text-xs sm:text-sm font-bold text-primary tracking-tight">
            Area-Wise Sales
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/admin/routes${selectedDate ? `?date=${encodeURIComponent(selectedDate)}` : ''}`}
            className="text-[11px] font-semibold text-secondary hover:text-primary transition-colors inline-flex items-center gap-0.5 shrink-0"
            title="Open Routes & Sectors Master"
          >
            <span>Routes</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Area List with Visual Contribution Bars */}
      <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[260px] pr-1">
        {areaSales.length === 0 ? (
          <div className="text-center py-8 text-xs text-secondary">
            No area-level distribution recorded for this date.
          </div>
        ) : (
          areaSales.map((area) => {
            const barWidth = Math.max(3, (area.salesPaise / maxAreaSales) * 100);
            return (
              <Link
                key={area.areaId}
                href="/dashboard/admin/routes"
                className="block space-y-1 p-1 rounded-xl hover:bg-surface-inset/60 transition-colors group"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 truncate pr-2">
                    <span className="font-bold text-primary group-hover:text-teal-700 dark:group-hover:text-teal-400 truncate text-[11px] transition-colors">
                      {area.areaName}
                    </span>
                    <span className="text-[10px] text-muted">
                      ({area.routeName})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-bold text-primary text-[11px]">
                      {formatMoney(area.salesPaise)}
                    </span>
                    <span className="font-mono text-[9px] font-bold text-teal-800 dark:text-teal-400 bg-surface-inset px-1.5 py-0.2 rounded border border-border-default shadow-inset">
                      {area.percentage}%
                    </span>
                  </div>
                </div>

                <div className="w-full bg-surface-inset border border-border-default shadow-inset rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[#1A5F63] h-full rounded-full transition-all duration-300"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="pt-2.5 border-t border-border-subtle mt-2 flex items-center justify-between text-[11px] text-secondary">
        <span>Active Territories</span>
        <span className="font-mono font-bold text-primary">{areaSales.length} Active Sectors</span>
      </div>
    </div>
  );
}
