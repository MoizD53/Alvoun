import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "inset" | "danger" | "danger-outline";
  size?: "xs" | "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "relative inline-flex items-center justify-center font-medium transition-all duration-200 ease-out select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 press-active hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.985]";

    const variantStyles = {
      primary:
        "bg-teal-500 text-text-inverse hover:bg-teal-600 shadow-raised-sm hover:shadow-hover active:shadow-inset border border-teal-600/30",
      secondary:
        "bg-surface-raised text-primary hover:text-primary border border-border-default hover:border-border-strong shadow-raised-sm hover:shadow-hover active:shadow-inset",
      outline:
        "bg-transparent text-primary hover:bg-surface-raised border border-border-default hover:border-border-strong active:shadow-inner",
      ghost:
        "bg-transparent text-secondary hover:text-primary hover:bg-surface-raised/70 active:bg-surface-inset",
      inset:
        "bg-surface-inset text-primary border border-border-default shadow-inset hover:border-border-strong",
      danger:
        "bg-danger text-text-inverse hover:opacity-95 shadow-raised-sm hover:shadow-hover active:shadow-inset border border-danger/30",
      "danger-outline":
        "bg-transparent text-danger border border-danger/30 hover:bg-danger/10 active:shadow-inner",
    };

    const sizeStyles = {
      xs: "h-7 px-2.5 text-xs rounded-md gap-1.5",
      sm: "h-9 px-3.5 text-xs rounded-lg gap-2",
      md: "h-11 px-5 text-sm rounded-xl gap-2.5",
      lg: "h-13 px-6 text-base rounded-2xl gap-3",
      icon: "h-10 w-10 p-0 rounded-xl justify-center",
    };

    const isEffectivelyDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isEffectivelyDisabled}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <span>{children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0 inline-flex">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0 inline-flex">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
