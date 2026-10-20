"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, Minus } from "lucide-react";

export interface CheckboxProps {
  checked?: boolean | "indeterminate";
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  value?: string;
  label?: string;
  description?: string;
  className?: string;
}

export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  (
    {
      checked: controlledChecked,
      defaultChecked = false,
      onCheckedChange,
      disabled = false,
      id,
      name,
      value,
      label,
      description,
      className,
      ...props
    },
    ref
  ) => {
    const [uncontrolledChecked, setUncontrolledChecked] = React.useState(defaultChecked);
    const isControlled = controlledChecked !== undefined;
    const isChecked = isControlled ? controlledChecked : uncontrolledChecked;

    const generatedId = React.useId();
    const checkboxId = id || generatedId;

    const toggle = () => {
      if (disabled) return;
      const next = isChecked === true ? false : true;
      if (!isControlled) {
        setUncontrolledChecked(next);
      }
      onCheckedChange?.(next);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        toggle();
      }
    };

    return (
      <div className={cn("inline-flex items-start gap-2.5", className)}>
        <button
          ref={ref}
          id={checkboxId}
          type="button"
          role="checkbox"
          aria-checked={isChecked === "indeterminate" ? "mixed" : isChecked}
          disabled={disabled}
          onClick={toggle}
          onKeyDown={handleKeyDown}
          className={cn(
            "relative flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
            isChecked
              ? "bg-teal-500 border border-teal-600 text-text-inverse shadow-xs"
              : "bg-surface-inset border border-border-default shadow-inset",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          {...props}
        >
          {isChecked === "indeterminate" ? (
            <Minus className="h-3 w-3 stroke-[3]" />
          ) : isChecked ? (
            <Check className="h-3.5 w-3.5 stroke-[3]" />
          ) : null}

          {name && (
            <input
              type="hidden"
              name={name}
              value={isChecked === true ? value || "true" : "false"}
            />
          )}
        </button>

        {(label || description) && (
          <label htmlFor={checkboxId} className="cursor-pointer select-none text-left">
            {label && (
              <span className="block text-sm font-semibold text-primary leading-tight">
                {label}
              </span>
            )}
            {description && (
              <span className="block text-xs text-secondary mt-0.5">
                {description}
              </span>
            )}
          </label>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
