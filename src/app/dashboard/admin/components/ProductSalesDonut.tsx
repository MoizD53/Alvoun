'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Package, ChevronRight, Layers, Loader2, RotateCcw } from 'lucide-react';
import { formatMoney } from '@/lib/format';
import type { ProductSalesData } from '@/lib/dashboard-data';
import AdminDatePicker from './AdminDatePicker';

// Standard 3-Product Color Assignment as strictly specified:
// 1 Litre: Blue (#2583C5)
// 500ml:   Teal (#159D91)
// 250ml:   Amber (#E9A23B)
export function getProductColor(productName: string): { color: string; isStandard: boolean } {
  const norm = productName.toLowerCase().replace(/\s+/g, '');
  if (norm.includes('1litre') || norm.includes('1l') || norm.includes('1000ml')) {
    return { color: '#2583C5', isStandard: true }; // 1 Litre - Blue
  }
  if (norm.includes('500ml') || norm.includes('0.5l')) {
    return { color: '#159D91', isStandard: true }; // 500ml - Teal
  }
  if (norm.includes('250ml') || norm.includes('0.25l')) {
    return { color: '#E9A23B', isStandard: true }; // 250ml - Amber
  }
  if (norm.includes('2litre') || norm.includes('2l')) {
    return { color: '#8B5CF6', isStandard: false }; // 2 Litre - Purple
  }
  return { color: '#64748B', isStandard: false }; // Fallback - Neutral Slate
}

interface ProductSalesDonutProps {
  productSales: ProductSalesData;
  selectedDate?: string;
  selectedDateLabel?: string;
  isDateOverridden?: boolean;
  onResetDate?: () => void;
  isLoading?: boolean;
}

export default function ProductSalesDonut({ 
  productSales,
  selectedDate,
  selectedDateLabel,
  isDateOverridden,
  onResetDate,
  isLoading
}: ProductSalesDonutProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const { products = [], totalSalesPaise = 0, totalLitres = 0 } = productSales || {};

  // Filter to strictly non-zero sales products so zero-sales products do not produce misleading segments
  const nonZeroProducts = products.filter((p) => p.salesPaise > 0);
  const hasSales = totalSalesPaise > 0 && nonZeroProducts.length > 0;

  // Donut SVG geometry (Distance Readable)
  const size = 150;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate segment arcs using exact proportional revenue shares
  let cumulativeRatio = 0;
  const segments = hasSales
    ? nonZeroProducts.map((p, idx) => {
        const ratio = p.salesPaise / totalSalesPaise;
        const strokeDasharray = `${ratio * circumference} ${circumference}`;
        const strokeDashoffset = -(cumulativeRatio * circumference);
        cumulativeRatio += ratio;

        const { color } = getProductColor(p.productName);
        const percentDisplay = Number((ratio * 100).toFixed(1));

        return {
          ...p,
          color,
          ratio,
          percentDisplay,
          strokeDasharray,
          strokeDashoffset,
        };
      })
    : [];

  return (
    <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-full select-none relative">
      {/* 1. Header with Inset Well + Title + DatePicker + Catalog Link */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-800 dark:text-teal-400 shrink-0">
            <Package className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-primary tracking-tight">
              Sales by Product
            </h3>
            {isDateOverridden && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-bold text-teal-800 dark:text-teal-300 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
                  {selectedDateLabel}
                </span>
                {onResetDate && (
                  <button
                    type="button"
                    onClick={onResetDate}
                    className="text-[10px] font-bold text-secondary hover:text-teal-700 dark:hover:text-teal-400 inline-flex items-center gap-0.5 cursor-pointer underline"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    <span>Today</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AdminDatePicker currentDate={selectedDate || ''} compact />
          <Link
            href="/dashboard/admin/reports/products"
            className="text-xs sm:text-sm font-bold text-secondary hover:text-primary transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            title="Open Products & Rates Master"
          >
            <span>Catalog</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* 2. Visual Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center my-auto py-10 text-center">
          <Loader2 className="h-8 w-8 text-teal-600 dark:text-teal-400 animate-spin" />
          <span className="text-xs text-secondary mt-2">Loading product sales...</span>
        </div>
      ) : hasSales ? (
        <div className="flex flex-col sm:flex-row items-center gap-5 my-auto py-2">
          {/* Donut Chart SVG */}
          <div className="relative shrink-0 flex items-center justify-center">
            <svg width={size} height={size} className="transform -rotate-90">
              {/* Background circle track */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-surface-inset"
              />
              {/* Segment arcs */}
              {segments.map((seg, idx) => {
                const isHovered = hoveredIdx === idx;
                return (
                  <circle
                    key={seg.productId}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                );
              })}
            </svg>

            {/* Donut Center Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[10px] font-semibold text-secondary uppercase tracking-wider">
                {hoveredIdx !== null ? segments[hoveredIdx]?.productName : 'Total Volume'}
              </span>
              <span className="text-base sm:text-lg font-black text-primary font-mono tabular-nums leading-tight">
                {hoveredIdx !== null 
                  ? `${segments[hoveredIdx]?.crates} cr`
                  : `${totalLitres} L`}
              </span>
              <span className="text-[10px] font-bold text-teal-800 dark:text-teal-400 font-mono">
                {hoveredIdx !== null 
                  ? `${segments[hoveredIdx]?.percentDisplay}%` 
                  : formatMoney(totalSalesPaise)}
              </span>
            </div>
          </div>

          {/* Product Breakdown Legend */}
          <div className="flex-1 w-full space-y-2">
            {segments.map((prod, idx) => {
              const isHovered = hoveredIdx === idx;
              return (
                <Link
                  key={prod.productId}
                  href="/dashboard/admin/reports/products"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className={`flex items-center justify-between py-1.5 px-2.5 rounded-xl transition-colors cursor-pointer group ${
                    isHovered ? 'bg-surface-inset shadow-inset font-bold' : 'hover:bg-surface-inset/60'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: prod.color }}
                    />
                    <span className="text-xs sm:text-sm font-bold text-primary truncate group-hover:text-teal-700 dark:group-hover:text-teal-400">
                      {prod.productName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-mono text-xs sm:text-sm">
                    <span className="text-secondary text-xs font-semibold">{prod.percentDisplay}%</span>
                    <span className="font-extrabold text-primary tabular-nums">{formatMoney(prod.salesPaise)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        /* Genuine Empty State (No Fabricated Values) */
        <div className="flex flex-col items-center justify-center my-auto py-4 text-center">
          <div className="relative mb-2 flex items-center justify-center">
            <div className="h-14 w-14 rounded-full bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-muted">
              <Layers className="h-7 w-7 opacity-40" />
            </div>
          </div>
          <span className="text-sm font-bold text-primary tracking-tight">
            No Product Sales Recorded
          </span>
          <p className="text-xs text-secondary max-w-[240px] mt-1">
            {isDateOverridden 
              ? `No dispatches or retail sales logged on ${selectedDateLabel}.`
              : 'Sales booked via mobile billing will populate product revenue shares.'}
          </p>
        </div>
      )}

      {/* 3. Footer Summary */}
      <div className="pt-3 border-t border-border-subtle flex items-center justify-between text-xs text-secondary">
        <span className="font-semibold">Portfolio Mix</span>
        <span className="font-mono font-bold text-primary">
          {hasSales ? `${nonZeroProducts.length} Active SKUs` : '1L · 500ml · 250ml'}
        </span>
      </div>
    </div>
  );
}
