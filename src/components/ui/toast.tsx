"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertOctagon, Info, AlertTriangle, X } from "lucide-react";

export type ToastVariant = "success" | "info" | "warning" | "danger";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastMessage[];
  toast: (message: Omit<ToastMessage, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    ({ title, description, variant = "info", duration = 4000 }: Omit<ToastMessage, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = { id, title, description, variant, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [dismiss]
  );

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-success shrink-0" />,
    info: <Info className="h-5 w-5 text-teal-600 dark:text-teal-400 shrink-0" />,
    warning: <AlertTriangle className="h-5 w-5 text-warning shrink-0" />,
    danger: <AlertOctagon className="h-5 w-5 text-danger shrink-0" />,
  };

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      {/* Toast viewport fixed at top-right or bottom-right */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex max-w-sm w-full flex-col gap-2.5 pointer-events-none p-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-xl p-3.5 bg-surface-overlay border border-border-default shadow-modal text-left transition-all animate-slide-up"
            )}
          >
            <div className="mt-0.5">{icons[t.variant || "info"]}</div>
            <div className="flex-1 min-w-0">
              <h5 className="text-sm font-bold text-primary tracking-tight">
                {t.title}
              </h5>
              {t.description && (
                <p className="mt-0.5 text-xs text-secondary leading-relaxed">
                  {t.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="text-muted hover:text-primary p-1 rounded-lg transition-colors cursor-pointer"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
