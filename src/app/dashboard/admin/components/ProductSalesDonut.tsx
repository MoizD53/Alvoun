'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Package, ChevronRight, Layers } from 'lucide-react';
import { formatMoney } from '@/lib/format';
import type { ProductSalesData } from '@/lib/dashboard-data';

// Standard 3-Product Color Assignment as strictly specified:
// 1 Litre: Blue (#2583C5)
// 500ml:   Teal (#159D91)
// 250ml:   Amber (#E9A23B)
// Unknown or inactive products must not be silently assigned to one of the three colours.
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
  // Secondary / Custom / Inactive products (e.g. 2 Litre, 20L jars, unlisted SKUs)
  if (norm.includes('2litre') || norm.includes('2l')) {
    return { color: '#8B5CF6', isStandard: false }; // 2 Litre - Purple
  }
  return { color: '#64748B', isStandard: false }; // Fallback - Neutral Slate
}

interface ProductSalesDonutProps {
  productSales: ProductSalesData;
}

export default function ProductSalesDonut({ productSales }: ProductSalesDonutProps) {
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
    <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-full select-none">
      {/* 1. Header with Inset Well + Title + Catalog Link */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-800 dark:text-teal-400 shrink-0">
            <Package className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-primary tracking-tight">
              Sales by Product
            </h3>
          </div>
        </div>

        <Link
          href="/dashboard/admin/reports/products"
          className="text-xs sm:text-sm font-bold text-secondary hover:text-primary transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          title="Open Products & Rates Master"
        >
          <span>Catalog</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* 2. Side-by-side Donut on Left, Compact Legend Table on Right */}
      {hasSales ? (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 my-auto">
          {/* Donut Chart Visual (Distance Readable) */}
          <div className="relative shrink-0 flex items-center justify-center">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="transform -rotate-90 overflow-visible"
              aria-label="Product revenue distribution"
            >
              {/* Background Track */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke="currentColor"
                className="text-border-default/40"
                strokeWidth={strokeWidth}
              />

              {/* Individual Product Segments */}
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
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                );
              })}
            </svg>

            {/* Distance-Readable Center Hole Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
              <span className="text-[11px] sm:text-xs font-bold text-secondary uppercase tracking-wider leading-none">
                {hoveredIdx !== null && segments[hoveredIdx]
                  ? segments[hoveredIdx].productName
                  : 'Total Sales'}
              </span>
              <span className="text-base sm:text-lg lg:text-xl font-black text-primary font-mono tracking-tight mt-1 leading-none tabular-nums">
                {hoveredIdx !== null && segments[hoveredIdx]
                  ? formatMoney(segments[hoveredIdx].salesPaise)
                  : formatMoney(totalSalesPaise)}
              </span>
              <span className="text-[11px] sm:text-xs text-muted font-mono font-bold mt-1">
                {hoveredIdx !== null && segments[hoveredIdx]
                  ? `${segments[hoveredIdx].crates} PKG · ${segments[hoveredIdx].volumeLitres}L`
                  : `${totalLitres}L Vol`}
              </span>
            </div>
          </div>

          {/* Distance-Readable Legend Table */}
          <div className="flex-1 w-full sm:w-auto min-w-0 space-y-1.5">
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
            <svg
              width={90}
              height={90}
              viewBox="0 0 90 90"
              className="transform -rotate-90 overflow-visible"
            >
              <circle
                cx={45}
                cy={45}
                r={36}
                fill="transparent"
                stroke="currentColor"
                className="text-border-default/50"
                strokeWidth={10}
                strokeDasharray="4 4"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <Layers className="h-5 w-5 text-muted mb-0.5" />
              <span className="text-xs font-mono font-bold text-muted">₹0</span>
            </div>
          </div>
          <p className="text-sm font-bold text-primary">No Product Sales</p>
          <p className="text-xs text-secondary mt-0.5 max-w-[220px]">
            No bottle dispatches or sales billed for this selected date.
          </p>
          <Link
            href="/dashboard/admin/reports/products"
            className="mt-2 text-xs font-bold text-teal-800 dark:text-teal-300 hover:underline inline-flex items-center gap-0.5"
          >
            <span>View Product Rates & Stock</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
