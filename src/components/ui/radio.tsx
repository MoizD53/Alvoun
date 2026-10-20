"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface RadioGroupContextValue {
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue>({});

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  (
    {
      name,
      value: controlledValue,
      defaultValue,
      onValueChange,
      disabled = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : uncontrolledValue;

    const onChange = React.useCallback(
      (val: string) => {
        if (!isControlled) {
          setUncontrolledValue(val);
        }
        onValueChange?.(val);
      },
      [isControlled, onValueChange]
    );

    return (
      <RadioGroupContext.Provider value={{ name, value, onChange, disabled }}>
        <div
          ref={ref}
          role="radiogroup"
          className={cn("grid gap-2.5", className)}
          {...props}
        >
          {children}
        </div>
      </RadioGroupContext.Provider>
    );
  }
);
RadioGroup.displayName = "RadioGroup";

export interface RadioProps {
  value: string;
  id?: string;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export const Radio = React.forwardRef<HTMLButtonElement, RadioProps>(
  (
    {
      value,
      id,
      label,
      description,
      disabled: itemDisabled = false,
      className,
      ...props
    },
    ref
  ) => {
    const context = React.useContext(RadioGroupContext);
    const isChecked = context.value === value;
    const disabled = context.disabled || itemDisabled;

    const generatedId = React.useId();
    const radioId = id || generatedId;

    const handleClick = () => {
      if (disabled) return;
      context.onChange?.(value);
    };

    return (
      <div className={cn("inline-flex items-start gap-2.5", className)}>
        <button
          ref={ref}
          id={radioId}
          type="button"
          role="radio"
          aria-checked={isChecked}
          disabled={disabled}
          onClick={handleClick}
          className={cn(
            "relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
            isChecked
              ? "border-2 border-teal-500 bg-surface-raised shadow-xs"
              : "bg-surface-inset border border-border-default shadow-inset",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          {...props}
        >
          {isChecked && (
            <span className="h-2.5 w-2.5 rounded-full bg-teal-500 animate-scale-in" />
          )}

          {context.name && (
            <input
              type="radio"
              name={context.name}
              value={value}
              checked={isChecked}
              readOnly
              className="sr-only"
            />
          )}
        </button>

        {(label || description) && (
          <label htmlFor={radioId} className="cursor-pointer select-none text-left">
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
Radio.displayName = "Radio";
