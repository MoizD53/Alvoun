'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Home, LayoutDashboard } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log complete error details to client console for diagnostic transparency
    console.error('[Admin Dashboard Error Boundary Caught]:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 py-8 animate-fade-in-up">
      <div className="h-16 w-16 bg-surface-inset border border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4 shadow-inset">
        <AlertCircle className="h-8 w-8" />
      </div>

      <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight mb-2">
        Operational View Temporarily Unavailable
      </h1>
      <p className="text-sm text-secondary max-w-md mb-6 leading-relaxed">
        The dashboard encountered a data rendering exception. Your underlying records and database state are safe.
      </p>

      {error?.digest && (
        <div className="mb-6 px-3 py-1.5 rounded-lg bg-surface-inset border border-border-default text-[11px] font-mono text-muted">
          Digest: {error.digest}
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap justify-center">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs shadow-raised transition-all cursor-pointer active:scale-95"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Retry Loading</span>
        </button>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-raised border border-border-default hover:bg-surface-inset text-primary font-bold text-xs shadow-raised transition-all"
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Dashboard Home</span>
        </Link>
      </div>
    </div>
  );
}
