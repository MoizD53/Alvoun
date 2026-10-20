"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onValueChange?: (value: number) => void;
  label?: string;
  showValue?: boolean;
  valueFormatter?: (value: number) => string;
  className?: string;
}

export const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  (
    {
      value: controlledValue,
      defaultValue = 0,
      min = 0,
      max = 100,
      step = 1,
      disabled = false,
      onValueChange,
      label,
      showValue = false,
      valueFormatter = (v) => `${v}`,
      className,
      ...props
    },
    ref
  ) => {
    const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
    const isControlled = controlledValue !== undefined;
    const value = Math.min(max, Math.max(min, isControlled ? controlledValue : uncontrolledValue));

    const trackRef = React.useRef<HTMLDivElement>(null);
    const percentage = ((value - min) / (max - min)) * 100;

    const updateFromPosition = (clientX: number) => {
      if (disabled || !trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const rawPct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const rawValue = min + rawPct * (max - min);
      const steppedValue = Math.round(rawValue / step) * step;
      const clampedValue = Math.min(max, Math.max(min, steppedValue));

      if (!isControlled) {
        setUncontrolledValue(clampedValue);
      }
      onValueChange?.(clampedValue);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
      if (disabled) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      updateFromPosition(e.clientX);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
      if (disabled || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
      updateFromPosition(e.clientX);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;
      let next = value;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        next = Math.min(max, value + step);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        next = Math.max(min, value - step);
      } else if (e.key === "Home") {
        next = min;
      } else if (e.key === "End") {
        next = max;
      } else {
        return;
      }
      e.preventDefault();
      if (!isControlled) setUncontrolledValue(next);
      onValueChange?.(next);
    };

    return (
      <div className={cn("w-full space-y-2 select-none", className)}>
        {(label || showValue) && (
          <div className="flex items-center justify-between text-xs font-semibold text-secondary uppercase tracking-wider">
            {label && <span>{label}</span>}
            {showValue && <span className="font-mono text-primary">{valueFormatter(value)}</span>}
          </div>
        )}

        <div
          ref={ref}
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          className={cn(
            "relative flex w-full items-center cursor-pointer py-2 touch-none focus-visible:outline-none",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          {...props}
        >
          {/* Inset track well */}
          <div
            ref={trackRef}
            className="relative h-2.5 w-full rounded-full bg-surface-inset border border-border-default shadow-inset overflow-hidden"
          >
            {/* Teal filled progress */}
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-75"
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Raised thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-surface-overlay border-2 border-teal-500 shadow-md transition-transform hover:scale-110 active:scale-95 focus-visible:ring-2 focus-visible:ring-teal-500"
            style={{ left: `calc(${percentage}% - 10px)` }}
          />
        </div>
      </div>
    );
  }
);

Slider.displayName = "Slider";
