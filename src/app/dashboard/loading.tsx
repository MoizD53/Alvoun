import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] w-full animate-fade-in-up">
      <div className="relative flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-alvoun-blue animate-spin" />
        <div className="absolute inset-0 h-10 w-10 rounded-full border-4 border-alvoun-blue/20"></div>
      </div>
      <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">Loading...</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Please wait while we prepare your dashboard.</p>
    </div>
  );
}
