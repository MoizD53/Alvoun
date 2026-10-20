'use client';

import { useEffect } from 'react';
import { Moon, Clock, AlertTriangle, LogIn, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function SalesmanError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  if (error.message === 'SESSION_ENDED') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 animate-fade-in-up">
        <div className="w-20 h-20 bg-surface-raised shadow-raised rounded-2xl border border-border/40 flex items-center justify-center mb-6 text-primary">
          <Moon className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Work Session Concluded</h1>
        <p className="text-muted-foreground mb-8 max-w-sm text-sm">Your work day has concluded because it is past 7:00 PM. See you tomorrow!</p>
        <Link 
          href="/login" 
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-raised hover:shadow-raised-sm press-active transition-all"
        >
          <LogIn className="w-4 h-4" />
          Return to Login
        </Link>
      </div>
    );
  }

  if (error.message === 'NOT_STARTED') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 animate-fade-in-up">
        <div className="w-20 h-20 bg-surface-raised shadow-raised rounded-2xl border border-border/40 flex items-center justify-center mb-6 text-primary">
          <Clock className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Work Not Started</h1>
        <p className="text-muted-foreground mb-8 max-w-sm text-sm">Work sessions are active between 7:00 AM – 7:00 PM. Please return during working hours.</p>
        <Link 
          href="/login" 
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-raised hover:shadow-raised-sm press-active transition-all"
        >
          <LogIn className="w-4 h-4" />
          Return to Login
        </Link>
      </div>
    );
  }

  if (error.message === 'NOT_AUTHENTICATED') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <h1 className="text-xl font-bold text-foreground mb-4">Please log in to continue</h1>
        <Link 
          href="/login" 
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-raised hover:shadow-raised-sm press-active transition-all"
        >
          <LogIn className="w-4 h-4" />
          Go to Login
        </Link>
      </div>
    );
  }

  if (error.message === 'NOT_AUTHORIZED') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <h1 className="text-xl font-bold text-foreground mb-2">Not Authorized</h1>
        <p className="text-muted-foreground mb-6 text-sm">You do not have access to the Salesman workspace.</p>
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-raised hover:shadow-raised-sm press-active transition-all"
        >
          <Home className="w-4 h-4" />
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <div className="w-20 h-20 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-center justify-center mb-6 text-destructive">
        <AlertTriangle className="h-10 w-10" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-8 max-w-sm text-sm">An unexpected issue occurred while rendering this view.</p>
      <div className="flex gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-surface-raised shadow-raised hover:shadow-raised-sm press-active border border-border/40 text-foreground rounded-xl font-semibold text-sm transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
        <Link 
          href="/dashboard/salesman" 
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-raised hover:shadow-raised-sm press-active transition-all"
        >
          <Home className="w-4 h-4" />
          Go Home
        </Link>
      </div>
    </div>
  );
}
