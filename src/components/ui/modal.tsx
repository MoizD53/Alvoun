"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  size = "md",
}: ModalProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Warm dimmed backdrop */}
      <div
        className="fixed inset-0 bg-[#2C2015]/40 dark:bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in-up"
        onClick={onClose}
      />

      {/* Neumorphic modal card */}
      <div
        className={cn(
          "relative w-full rounded-2xl bg-surface-overlay border border-border-default shadow-modal p-6 text-left transition-all animate-scale-in z-10",
          sizeStyles[size],
          className
        )}
      >
        {/* Close icon button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-muted hover:text-primary hover:bg-surface-raised transition-colors cursor-pointer select-none"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        {(title || description) && (
          <div className="mb-4 pr-6">
            {title && (
              <h3 className="text-lg font-bold text-primary tracking-tight">
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-1 text-xs sm:text-sm text-secondary">
                {description}
              </p>
            )}
          </div>
        )}

        {/* Content body */}
        <div className="text-sm text-primary">{children}</div>

        {/* Footer actions */}
        {footer && (
          <div className="mt-6 flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-border-subtle">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
