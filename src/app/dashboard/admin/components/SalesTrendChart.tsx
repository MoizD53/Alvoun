'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { TrendingUp, Loader2 } from 'lucide-react';
import { formatMoney } from '@/lib/format';
import type { TrendPoint } from '@/lib/dashboard-data';
import { fetchSalesTrends } from '../actions/dashboard-data';

interface SalesTrendChartProps {
  initialPoints: TrendPoint[];
  selectedDate: string;
  activeDateKey?: string;
  onSelectDate?: (dateKey: string, dateLabel: string) => void;
}

export default function SalesTrendChart({ 
  initialPoints, 
  selectedDate,
  activeDateKey,
  onSelectDate
}: SalesTrendChartProps) {
  const [period, setPeriod] = useState<'7D' | '14D' | '30D'>('7D');
  const [points, setPoints] = useState<TrendPoint[]>(initialPoints || []);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  // Reset to initialPoints if selectedDate or initialPoints change and period is 7D
  useEffect(() => {
    if (period === '7D') {
      setPoints(initialPoints || []);
    }
  }, [initialPoints, selectedDate, period]);

  const handlePeriodChange = (newPeriod: '7D' | '14D' | '30D') => {
    if (newPeriod === period) return;
    setPeriod(newPeriod);
    setHoveredIdx(null);

    const daysCount = newPeriod === '7D' ? 7 : newPeriod === '14D' ? 14 : 30;
    startTransition(async () => {
      try {
        const trends = await fetchSalesTrends(selectedDate, daysCount);
        if (trends?.points) {
          setPoints(trends.points);
        }
      } catch (err) {
        console.error('Failed to fetch period trends:', err);
      }
    });
  };

  const currentPoints = points.length > 0 ? points : initialPoints || [];
  const values = currentPoints.map((p) => p.salesPaise);
  const totalSales = values.reduce((sum, v) => sum + v, 0);
  const avgSales = values.length > 0 ? Math.round(totalSales / values.length) : 0;
  const hasData = totalSales > 0;
  const maxVal = Math.max(...values, 100000); // Minimum scale ₹1,000 for realistic grid

  // SVG dimensions
  const svgWidth = 440;
  const svgHeight = 150;
  const padLeft = 45;
  const padRight = 16;
  const padTop = 22;
  const padBottom = 24;

  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;
  const stepX = currentPoints.length > 1 ? chartWidth / (currentPoints.length - 1) : chartWidth;

  const coords = currentPoints.map((p, idx) => {
    const x = padLeft + idx * stepX;
    const y = padTop + chartHeight - (p.salesPaise / maxVal) * chartHeight;
    return { x, y, point: p };
  });

  // Build smooth curve
  let pathD = `M ${coords[0]?.x || padLeft} ${coords[0]?.y || padTop + chartHeight}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i === 0 ? 0 : i - 1];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2 < coords.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  const areaD = `${pathD} L ${coords[coords.length - 1]?.x || svgWidth} ${padTop + chartHeight} L ${
    coords[0]?.x || padLeft
  } ${padTop + chartHeight} Z`;

  // Find index of activeDateKey if present
  const activeDateIdx = activeDateKey ? currentPoints.findIndex(p => p.dateKey === activeDateKey) : -1;

  // Determine peak or latest point for reference callout pin
  const highestIdx = values.length > 0 ? values.indexOf(Math.max(...values)) : 0;
  const activePinIdx = hoveredIdx !== null 
    ? hoveredIdx 
    : activeDateIdx !== -1 
    ? activeDateIdx 
    : hasData 
    ? highestIdx 
    : null;

  // Decide which x-axis labels to render based on point count
  const shouldRenderLabel = (idx: number, total: number) => {
    if (total <= 7) return true;
    if (total <= 14) return idx % 2 === 0 || idx === total - 1;
    return idx === 0 || idx === total - 1 || idx % 5 === 0;
  };

  return (
    <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-4 flex flex-col justify-between h-full select-none">
      {/* 1. Header with Inset Icon Well + Title + Metric Summary + Period Pill Switch */}
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-800 dark:text-teal-400 shrink-0">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin text-teal-600" /> : <TrendingUp className="h-4 w-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-primary tracking-tight">Sales Trend</h3>
              <span className="text-[10px] font-mono text-secondary font-medium">
                (Avg: {formatMoney(avgSales)}/day)
              </span>
            </div>
            {onSelectDate && (
              <span className="text-[10px] text-muted">
                Click any point to inspect date
              </span>
            )}
          </div>
        </div>

        {/* Reference Period Pill Tabs: [7D] [14D] [30D] */}
        <div className="flex items-center p-0.5 rounded-full bg-surface-inset border border-border-default shadow-inset text-xs">
          {(['7D', '14D', '30D'] as const).map((tab) => {
            const isActive = period === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => handlePeriodChange(tab)}
                disabled={isPending}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#1A5F63] text-white shadow-xs'
                    : 'text-secondary hover:text-primary disabled:opacity-50'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Interactive SVG Canvas */}
      <div className="relative w-full overflow-hidden select-none my-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-36 sm:h-40 overflow-visible"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id="trendGradRef" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1A5F63" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#1A5F63" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {/* Horizontal Grid Ticks */}
          {[0, 0.5, 1].map((ratio, i) => {
            const y = padTop + chartHeight * (1 - ratio);
            const label =
              ratio === 0
                ? '0'
                : ratio === 0.5
                ? `${Math.round(maxVal / 200000)}L`
                : `${Math.round(maxVal / 100000)}L`;
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke="currentColor"
                  className="text-border-default/60"
                  strokeWidth={0.8}
                  strokeDasharray="2 2"
                />
                <text
                  x={padLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-muted text-[9px] font-mono select-none"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={areaD} fill="url(#trendGradRef)" />

          {/* Curve Stroke (Rich Deep Teal) */}
          <path
            d={pathD}
            fill="none"
            stroke="#1A5F63"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Data Points */}
          {coords.map((c, i) => {
            const isHovered = hoveredIdx === i;
            const isPointSelected = c.point.dateKey === activeDateKey;
            const showLabel = shouldRenderLabel(i, coords.length);
            return (
              <g 
                key={i}
                className="cursor-pointer"
                onClick={() => {
                  if (onSelectDate) {
                    onSelectDate(c.point.dateKey, c.point.label);
                  }
                }}
              >
                {/* Hit target */}
                <rect
                  x={c.x - Math.max(stepX / 2, 8)}
                  y={padTop}
                  width={Math.max(stepX, 16)}
                  height={chartHeight}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIdx(i)}
                />

                {/* Point dot */}
                {(isHovered || isPointSelected || coords.length <= 14 || activePinIdx === i) && (
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={isPointSelected ? 5.5 : isHovered ? 4.5 : 3}
                    fill={isPointSelected ? '#D97706' : isHovered ? '#1A5F63' : '#EDE4D8'}
                    stroke={isPointSelected ? '#FDE68A' : '#1A5F63'}
                    strokeWidth={isPointSelected ? 2.5 : 2}
                    className="transition-all duration-150"
                  />
                )}

                {/* X-axis Date Label */}
                {showLabel && (
                  <text
                    x={c.x}
                    y={svgHeight - 4}
                    textAnchor="middle"
                    className={`text-[9px] font-mono select-none transition-colors ${
                      isPointSelected 
                        ? 'fill-amber-600 font-bold'
                        : isHovered 
                        ? 'fill-[#1A5F63] font-bold' 
                        : 'fill-muted'
                    }`}
                  >
                    {c.point.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Reference-Styled Tooltip Callout Pin */}
        {activePinIdx !== null && coords[activePinIdx] && (
          <div
            className="absolute pointer-events-none transform -translate-x-1/2 bg-[#1A5F63] text-white rounded-lg px-2.5 py-1 text-center shadow-raised z-20 transition-all duration-150"
            style={{
              left: `${(coords[activePinIdx].x / svgWidth) * 100}%`,
              top: `${Math.max(4, (coords[activePinIdx].y / svgHeight) * 100 - 32)}%`,
            }}
          >
            <div className="text-[9px] font-semibold text-teal-100 uppercase tracking-wider leading-none">
              {coords[activePinIdx].point.label}
            </div>
            <div className="font-mono font-bold text-xs leading-tight mt-0.5">
              {formatMoney(coords[activePinIdx].point.salesPaise)}
            </div>
            {/* Downward triangle arrow */}
            <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[#1A5F63] mx-auto -mb-1 mt-0.5" />
          </div>
        )}

        {/* Subtle zero-data watermark if genuine 0 */}
        {!hasData && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[10px] font-bold text-secondary bg-surface-raised/90 border border-border-default px-2.5 py-1 rounded-full shadow-xs">
              0 Sales Recorded in this {period} Window
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
