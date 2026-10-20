import * as React from "react";
import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      className,
      icon,
      title,
      description,
      action,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl bg-surface-raised border border-border-default shadow-xs",
          className
        )}
        {...props}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-inset border border-border-default shadow-inset text-teal-600 dark:text-teal-400 mb-4 animate-scale-in">
          {icon || <Inbox className="h-7 w-7" />}
        </div>

        <h4 className="text-base font-bold text-primary tracking-tight">
          {title}
        </h4>

        {description && (
          <p className="mt-1.5 text-sm text-secondary max-w-sm leading-relaxed">
            {description}
          </p>
        )}

        {action && <div className="mt-5">{action}</div>}
      </div>
    );
  }
);

EmptyState.displayName = "EmptyState";
