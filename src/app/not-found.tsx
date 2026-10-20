import Link from 'next/link';
import { Compass, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6 text-center animate-fade-in">
      <div className="max-w-md w-full bg-surface-raised rounded-3xl p-8 sm:p-10 shadow-raised-lg border border-border-subtle flex flex-col items-center">
        <div className="w-20 h-20 bg-surface-sunken shadow-inset border border-border-subtle rounded-3xl flex items-center justify-center mb-6 text-brand-teal">
          <Compass className="h-10 w-10 animate-spin-slow" />
        </div>
        <span className="text-xs font-black tracking-widest uppercase text-accent-terracotta bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full mb-3">
          Error 404
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight mb-2">
          Page Not Found
        </h1>
        <p className="text-sm font-semibold text-text-secondary mb-8 max-w-xs">
          The destination you are looking for has been moved, renamed, or is unavailable in your territory.
        </p>
        <Link
          href="/dashboard"
          className="min-h-[50px] px-6 py-3.5 bg-brand-teal hover:bg-brand-teal-dark text-white rounded-2xl font-black text-sm shadow-raised active:scale-95 transition-all flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
