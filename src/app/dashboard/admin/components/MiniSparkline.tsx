import React, { useId } from 'react';

interface MiniSparklineProps {
  data: number[];
  color?: string;
  fillColor?: string;
  height?: number;
  width?: number;
  strokeWidth?: number;
}

export default function MiniSparkline({
  data,
  color = '#2DD4BF',
  fillColor,
  height = 32,
  width = 84,
  strokeWidth = 2,
}: MiniSparklineProps) {
  if (!data || data.length === 0) {
    return <div style={{ width, height }} className="opacity-30 border-b border-dashed border-border-default" />;
  }

  // Handle all zeros
  const allZeros = data.every(v => v === 0);
  if (allZeros) {
    const midY = height / 2;
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
        aria-hidden="true"
      >
        <line
          x1={2}
          y1={midY}
          x2={width - 2}
          y2={midY}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray="3 3"
          strokeOpacity={0.4}
        />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 3;
  const usableHeight = height - padding * 2;
  const stepX = (width - padding * 2) / (data.length - 1);

  const points = data.map((val, idx) => {
    const x = padding + idx * stepX;
    const y = padding + usableHeight - ((val - min) / range) * usableHeight;
    return { x, y };
  });

  // Build smooth curve path using cardinal/catmull-rom or simple bezier
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;
  const rawId = useId();
  const gradId = `spark-grad-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible shrink-0"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColor || color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={fillColor || color} stopOpacity={0.0} />
        </linearGradient>
      </defs>

      {/* Area Fill */}
      <path d={areaD} fill={`url(#${gradId})`} />

      {/* Stroke Line */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Last Point Pulse Dot */}
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r={2.5}
          fill={color}
          className="animate-pulse"
        />
      )}
    </svg>
  );
}
