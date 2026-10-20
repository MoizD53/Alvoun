import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      id,
      containerClassName,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className={cn("w-full space-y-1.5 text-left", containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-secondary select-none"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="pointer-events-none absolute left-3.5 flex items-center text-muted">
              {leftIcon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            type={type}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={cn(
              "w-full h-11 rounded-xl bg-surface-inset text-primary placeholder:text-muted border border-border-default shadow-inset transition-all duration-150 text-sm",
              "focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20",
              leftIcon ? "pl-11" : "pl-4",
              rightIcon || error ? "pr-11" : "pr-4",
              error && "border-danger focus:border-danger focus:ring-danger/20",
              disabled && "opacity-50 cursor-not-allowed",
              className
            )}
            {...props}
          />

          {error ? (
            <div className="pointer-events-none absolute right-3.5 flex items-center text-danger">
              <AlertCircle className="h-4 w-4" />
            </div>
          ) : (
            rightIcon && (
              <div className="absolute right-3.5 flex items-center text-muted">
                {rightIcon}
              </div>
            )
          )}
        </div>

        {error ? (
          <p id={errorId} className="text-xs font-medium text-danger flex items-center gap-1 mt-1">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-muted mt-1">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
