'use client';

import { useEffect } from 'react';
import { Moon, Clock, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function SalesmanError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log the error to an error reporting service
    console.error(error);
  }, [error]);

  if (error.message === 'SESSION_ENDED') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 animate-fade-in-up">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
          <Moon className="h-10 w-10 text-slate-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Session Ended</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm">Your work day has concluded because it is past 7:00 PM. See you tomorrow!</p>
        <Link href="/login" className="px-6 py-3 bg-alvoun-blue text-white rounded-xl font-bold text-sm shadow-lg shadow-alvoun-blue/20 hover:bg-alvoun-dark transition-colors">
          Return to Login
        </Link>
      </div>
    );
  }

  if (error.message === 'NOT_STARTED') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 animate-fade-in-up">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
          <Clock className="h-10 w-10 text-slate-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Work Not Started</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm">Work sessions are active between 7:00 AM ?" 7:00 PM. Please return during working hours.</p>
        <Link href="/login" className="px-6 py-3 bg-alvoun-blue text-white rounded-xl font-bold text-sm shadow-lg shadow-alvoun-blue/20 hover:bg-alvoun-dark transition-colors">
          Return to Login
        </Link>
      </div>
    );
  }

  if (error.message === 'NOT_AUTHENTICATED') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Please log in to continue</h1>
        <Link href="/login" className="px-6 py-3 bg-alvoun-blue text-white rounded-xl font-bold text-sm shadow-lg shadow-alvoun-blue/20 hover:bg-alvoun-dark transition-colors">
          Go to Login
        </Link>
      </div>
    );
  }

  if (error.message === 'NOT_AUTHORIZED') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Not Authorized</h1>
        <p className="text-slate-500 mb-4">You do not have access to the Salesman workspace.</p>
        <Link href="/dashboard" className="px-6 py-3 bg-alvoun-blue text-white rounded-xl font-bold text-sm shadow-lg shadow-alvoun-blue/20 hover:bg-alvoun-dark transition-colors">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
        <AlertTriangle className="h-10 w-10 text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Something went wrong!</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm text-sm">We encountered an unexpected error while loading this page.</p>
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
        >
          Try again
        </button>
        <Link href="/dashboard/salesman" className="px-6 py-3 bg-alvoun-blue text-white rounded-xl font-bold text-sm shadow-lg shadow-alvoun-blue/20 hover:bg-alvoun-dark transition-colors">
          Go Home
        </Link>
      </div>
    </div>
  );
}
