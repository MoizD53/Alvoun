import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "teal" | "success" | "warning" | "danger";
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      className,
      value = 0,
      max = 100,
      label,
      showValue = false,
      size = "md",
      variant = "teal",
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    const sizeStyles = {
      sm: "h-2",
      md: "h-3",
      lg: "h-4",
    };

    const variantStyles = {
      teal: "bg-teal-500",
      success: "bg-success",
      warning: "bg-warning",
      danger: "bg-danger",
    };

    return (
      <div className={cn("w-full space-y-1.5", className)}>
        {(label || showValue) && (
          <div className="flex items-center justify-between text-xs font-semibold text-secondary uppercase tracking-wider">
            {label && <span>{label}</span>}
            {showValue && <span className="font-mono text-primary">{Math.round(percentage)}%</span>}
          </div>
        )}

        <div
          ref={ref}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          className={cn(
            "w-full rounded-full bg-surface-inset border border-border-default shadow-inset overflow-hidden p-0.5",
            sizeStyles[size]
          )}
          {...props}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300 ease-out shadow-xs",
              variantStyles[variant]
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);

Progress.displayName = "Progress";
