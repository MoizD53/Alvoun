import * as React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "rounded" | "circular" | "rectangular";
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = "rounded", ...props }, ref) => {
    const variantStyles = {
      rounded: "rounded-xl",
      circular: "rounded-full",
      rectangular: "rounded-none",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "animate-shimmer bg-surface-inset border border-border-default/40",
          variantStyles[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Skeleton.displayName = "Skeleton";
