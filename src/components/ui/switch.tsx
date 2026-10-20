"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  value?: string;
  label?: string;
  description?: string;
  className?: string;
  size?: "sm" | "md";
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
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
      size = "md",
      ...props
    },
    ref
  ) => {
    const [uncontrolledChecked, setUncontrolledChecked] = React.useState(defaultChecked);
    const isControlled = controlledChecked !== undefined;
    const isChecked = isControlled ? controlledChecked : uncontrolledChecked;

    const generatedId = React.useId();
    const switchId = id || generatedId;

    const toggle = () => {
      if (disabled) return;
      const next = !isChecked;
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

    const sizeStyles = {
      sm: {
        track: "w-9 h-5 p-0.5",
        thumb: "w-4 h-4",
        translate: "translate-x-4",
      },
      md: {
        track: "w-11 h-6 p-0.5",
        thumb: "w-5 h-5",
        translate: "translate-x-5",
      },
    };

    const currentSize = sizeStyles[size];

    return (
      <div className={cn("inline-flex items-center gap-3", className)}>
        <button
          ref={ref}
          id={switchId}
          type="button"
          role="switch"
          aria-checked={isChecked}
          disabled={disabled}
          onClick={toggle}
          onKeyDown={handleKeyDown}
          className={cn(
            "relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
            isChecked
              ? "bg-teal-500 border border-teal-600/40 shadow-xs"
              : "bg-surface-inset border border-border-default shadow-inset",
            disabled && "opacity-50 cursor-not-allowed",
            currentSize.track
          )}
          {...props}
        >
          <span
            className={cn(
              "pointer-events-none block rounded-full bg-surface-overlay shadow-sm transition-transform duration-200 ease-in-out border border-border-default/40",
              currentSize.thumb,
              isChecked ? currentSize.translate : "translate-x-0"
            )}
          />
          {name && (
            <input
              type="hidden"
              name={name}
              value={isChecked ? value || "true" : "false"}
            />
          )}
        </button>

        {(label || description) && (
          <label htmlFor={switchId} className="cursor-pointer select-none text-left">
            {label && (
              <span className="block text-sm font-semibold text-primary">
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

Switch.displayName = "Switch";
