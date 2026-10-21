'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Root Error Boundary Caught]:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-6 select-none animate-fade-in-up">
      <div className="h-16 w-16 bg-surface-inset border border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4 shadow-inset">
        <AlertTriangle className="h-8 w-8" />
      </div>

      <h1 className="text-2xl font-black text-primary tracking-tight mb-2">
        Something went wrong
      </h1>
      <p className="text-sm text-secondary max-w-sm mb-6 leading-relaxed">
        An unexpected application error occurred. You can reload the current view or return to the main dashboard.
      </p>

      {error?.digest && (
        <div className="mb-6 px-3 py-1.5 rounded-lg bg-surface-inset border border-border-default text-[11px] font-mono text-muted">
          Digest: {error.digest}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs shadow-raised transition-all cursor-pointer active:scale-95"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Try Again</span>
        </button>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-raised border border-border-default hover:bg-surface-inset text-primary font-bold text-xs shadow-raised transition-all"
        >
          <Home className="h-4 w-4" />
          <span>Go to Home</span>
        </Link>
      </div>
    </div>
  );
}
