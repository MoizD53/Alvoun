import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  X,
} from "lucide-react";

export interface AlertBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "danger";
  title?: string;
  onClose?: () => void;
  icon?: React.ReactNode;
}

export const AlertBanner = React.forwardRef<HTMLDivElement, AlertBannerProps>(
  (
    {
      className,
      variant = "info",
      title,
      children,
      onClose,
      icon,
      ...props
    },
    ref
  ) => {
    const defaultIcons = {
      info: <Info className="h-5 w-5 text-teal-600 dark:text-teal-400 shrink-0" />,
      success: <CheckCircle2 className="h-5 w-5 text-success shrink-0" />,
      warning: <AlertTriangle className="h-5 w-5 text-warning shrink-0" />,
      danger: <AlertOctagon className="h-5 w-5 text-danger shrink-0" />,
    };

    const variantStyles = {
      info: "bg-teal-50 dark:bg-teal-900/20 border-teal-500/30 text-teal-900 dark:text-teal-100",
      success: "bg-success-bg dark:bg-success-bg/20 border-success/30 text-success dark:text-success",
      warning: "bg-warning-bg dark:bg-warning-bg/20 border-warning/30 text-warning dark:text-warning",
      danger: "bg-danger-bg dark:bg-danger-bg/20 border-danger/30 text-danger dark:text-danger",
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "relative flex items-start gap-3.5 p-4 rounded-xl border shadow-xs transition-all",
          variantStyles[variant],
          className
        )}
        {...props}
      >
        <span className="mt-0.5">{icon || defaultIcons[variant]}</span>

        <div className="flex-1 text-sm">
          {title && <h5 className="font-bold tracking-tight mb-1">{title}</h5>}
          <div className="opacity-90 leading-relaxed">{children}</div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:text-primary transition-colors -mr-1 -mt-1 cursor-pointer"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);

AlertBanner.displayName = "AlertBanner";
