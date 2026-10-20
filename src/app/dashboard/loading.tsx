import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] w-full animate-fade-in-up">
      <div className="w-16 h-16 rounded-2xl bg-surface-sunken shadow-inset border border-border-subtle flex items-center justify-center mb-4 text-brand-teal">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
      <h3 className="text-lg font-black text-text-primary tracking-tight">Loading...</h3>
      <p className="text-xs font-semibold text-text-muted mt-1">Please wait while we prepare your dashboard.</p>
    </div>
  );
}
