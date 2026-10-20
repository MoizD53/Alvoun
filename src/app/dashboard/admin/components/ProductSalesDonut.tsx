'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Package, ChevronRight, Layers } from 'lucide-react';
import { formatMoney } from '@/lib/format';
import type { ProductSalesData } from '@/lib/dashboard-data';

// Palette matching reference donut segments
const REFERENCE_PRODUCT_COLORS = [
  '#1A5F63', // Deep Teal
  '#4A8EB4', // Soft Sky Blue
  '#D97706', // Warm Amber
  '#3E9B66', // Sage Green
  '#D14343', // Warm Crimson / Coral
  '#8E7B6A', // Warm Stone Taupe
];

interface ProductSalesDonutProps {
  productSales: ProductSalesData;
}

export default function ProductSalesDonut({ productSales }: ProductSalesDonutProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const { products, totalSalesPaise, totalLitres } = productSales || {
    products: [],
    totalSalesPaise: 0,
    totalLitres: 0,
  };
  const hasSales = totalSalesPaise > 0 && products.length > 0;

  // Donut geometry
  const size = 135;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Compute segment offsets strictly using actual sales data
  let cumulativePercent = 0;
  const segments = hasSales
    ? products.map((p, idx) => {
        const strokeDasharray = `${(p.percentage / 100) * circumference} ${circumference}`;
        const strokeDashoffset = -((cumulativePercent / 100) * circumference);
        cumulativePercent += p.percentage;
        const color = REFERENCE_PRODUCT_COLORS[idx % REFERENCE_PRODUCT_COLORS.length];
        return {
          ...p,
          color,
          strokeDasharray,
          strokeDashoffset,
        };
      })
    : [];

  return (
    <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-4 flex flex-col justify-between h-full select-none">
      {/* 1. Header with Inset Square Well + Title + Products Link */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-800 dark:text-teal-400 shrink-0">
            <Package className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary tracking-tight">
              Sales by Product
            </h3>
          </div>
        </div>

        <Link
          href="/dashboard/admin/reports/products"
          className="text-xs font-semibold text-secondary hover:text-primary transition-colors inline-flex items-center gap-0.5 whitespace-nowrap shrink-0"
          title="Open Products & Rates Master"
        >
          <span>Catalog</span>
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* 2. Side-by-side Donut on Left, Compact Legend Table on Right */}
      {hasSales ? (
        <div className="flex items-center justify-between gap-3 my-auto">
          {/* Donut Chart Visual */}
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

              {/* Segments */}
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
                    strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                );
              })}
            </svg>

            {/* Center Hole Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-1">
              <span className="text-[9px] font-semibold text-secondary uppercase tracking-wider leading-none">
                {hoveredIdx !== null && segments[hoveredIdx]
                  ? segments[hoveredIdx].productName
                  : 'Total Sales'}
              </span>
              <span className="text-xs sm:text-sm font-bold text-primary font-mono tracking-tight mt-1 leading-none">
                {hoveredIdx !== null && segments[hoveredIdx]
                  ? formatMoney(segments[hoveredIdx].salesPaise)
                  : formatMoney(totalSalesPaise)}
              </span>
              {hoveredIdx !== null && segments[hoveredIdx] && (
                <span className="text-[9px] text-muted font-mono mt-0.5">
                  {segments[hoveredIdx].crates} crt · {segments[hoveredIdx].volumeLitres}L
                </span>
              )}
            </div>
          </div>

          {/* Legend Table */}
          <div className="flex-1 min-w-0 space-y-1">
            {segments.map((prod, idx) => {
              const isHovered = hoveredIdx === idx;
              return (
                <Link
                  key={prod.productId}
                  href="/dashboard/admin/reports/products"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className={`flex items-center justify-between py-1 px-1.5 rounded-lg transition-colors cursor-pointer group ${
                    isHovered ? 'bg-surface-inset shadow-inset font-bold' : 'hover:bg-surface-inset/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: prod.color }}
                    />
                    <span className="text-[11px] font-medium text-primary truncate group-hover:text-teal-700 dark:group-hover:text-teal-400">
                      {prod.productName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                    <span className="text-secondary text-[10px]">{prod.percentage}%</span>
                    <span className="font-bold text-primary">{formatMoney(prod.salesPaise)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        /* Genuine Empty State (No Fabricated Values) */
        <div className="flex flex-col items-center justify-center my-auto py-3 text-center">
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
              <span className="text-[10px] font-mono font-bold text-muted">₹0</span>
            </div>
          </div>
          <p className="text-xs font-bold text-primary">No Product Sales</p>
          <p className="text-[10px] text-secondary mt-0.5 max-w-[200px]">
            No bottle dispatches or sales billed for this selected date.
          </p>
          <Link
            href="/dashboard/admin/reports/products"
            className="mt-2 text-[10px] font-bold text-teal-800 dark:text-teal-300 hover:underline inline-flex items-center gap-0.5"
          >
            <span>View Product Rates & Stock</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
