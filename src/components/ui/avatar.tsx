"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  status?: "online" | "offline" | "busy" | "away";
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      className,
      src,
      alt = "Avatar",
      fallback,
      size = "md",
      status,
      ...props
    },
    ref
  ) => {
    const [hasError, setHasError] = React.useState(false);

    const sizeStyles = {
      xs: "w-6 h-6 text-[10px]",
      sm: "w-8 h-8 text-xs",
      md: "w-10 h-10 text-sm",
      lg: "w-12 h-12 text-base",
      xl: "w-16 h-16 text-xl",
    };

    const statusSizes = {
      xs: "w-1.5 h-1.5 ring-1",
      sm: "w-2 h-2 ring-1.5",
      md: "w-2.5 h-2.5 ring-2",
      lg: "w-3 h-3 ring-2",
      xl: "w-4 h-4 ring-2.5",
    };

    const statusColors = {
      online: "bg-success",
      offline: "bg-text-disabled",
      busy: "bg-danger",
      away: "bg-warning",
    };

    // Calculate initials if fallback not given
    const getInitials = (name?: string) => {
      if (!name) return "?";
      const parts = name.trim().split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    };

    const displayInitials = fallback || getInitials(alt);

    return (
      <div
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center rounded-full shrink-0 select-none overflow-hidden bg-surface-raised border border-border-default shadow-xs text-primary font-bold",
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {src && !hasError ? (
          <img
            src={src}
            alt={alt}
            onError={() => setHasError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="tracking-wider">{displayInitials}</span>
        )}

        {status && (
          <span
            className={cn(
              "absolute bottom-0 right-0 rounded-full ring-surface-raised",
              statusSizes[size],
              statusColors[status]
            )}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = "Avatar";
