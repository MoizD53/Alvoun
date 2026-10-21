import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "teal" | "neutral" | "success" | "warning" | "danger" | "info";
  styleType?: "subtle" | "solid" | "outline";
  size?: "sm" | "md";
  dot?: boolean;
  pulse?: boolean;
  leftIcon?: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = "neutral",
      styleType = "subtle",
      size = "md",
      dot = false,
      pulse = false,
      leftIcon,
      children,
      ...props
    },
    ref
  ) => {
    const sizeStyles = {
      sm: "h-5 px-2 text-[10px] gap-1 rounded-md font-semibold shrink-0",
      md: "h-6 px-2.5 text-xs gap-1.5 rounded-lg font-semibold shrink-0",
    };

    const variantStyles = {
      teal: {
        solid: "bg-teal-500 text-text-inverse border border-teal-600/30",
        subtle: "bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-200 border border-teal-200/50 dark:border-teal-700/50",
        outline: "bg-transparent text-teal-600 dark:text-teal-400 border border-teal-500/40",
      },
      neutral: {
        solid: "bg-text-primary text-text-inverse border border-text-primary",
        subtle: "bg-surface-inset text-secondary border border-border-default",
        outline: "bg-transparent text-secondary border border-border-default",
      },
      success: {
        solid: "bg-success text-text-inverse border border-success/30",
        subtle: "bg-success-bg text-success border border-success/30 dark:bg-success-bg/20 dark:text-success",
        outline: "bg-transparent text-success border border-success/40",
      },
      warning: {
        solid: "bg-warning text-text-inverse border border-warning/30",
        subtle: "bg-warning-bg text-warning border border-warning/30 dark:bg-warning-bg/20 dark:text-warning",
        outline: "bg-transparent text-warning border border-warning/40",
      },
      danger: {
        solid: "bg-danger text-text-inverse border border-danger/30",
        subtle: "bg-danger-bg text-danger border border-danger/30 dark:bg-danger-bg/20 dark:text-danger",
        outline: "bg-transparent text-danger border border-danger/40",
      },
      info: {
        solid: "bg-info text-text-inverse border border-info/30",
        subtle: "bg-info-bg text-info border border-info/30 dark:bg-info-bg/20 dark:text-info",
        outline: "bg-transparent text-info border border-info/40",
      },
    };

    const dotColors = {
      teal: "bg-teal-500",
      neutral: "bg-text-secondary",
      success: "bg-success",
      warning: "bg-warning",
      danger: "bg-danger",
      info: "bg-info",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center tracking-wide uppercase transition-colors shadow-2xs select-none whitespace-nowrap",
          sizeStyles[size],
          variantStyles[variant][styleType],
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full shrink-0",
              dotColors[variant],
              pulse && "animate-pulse"
            )}
          />
        )}
        {leftIcon && <span className="shrink-0 inline-flex items-center justify-center mr-0.5">{leftIcon}</span>}
        <span className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap leading-none">{children}</span>
      </span>
    );
  }
);

Badge.displayName = "Badge";
