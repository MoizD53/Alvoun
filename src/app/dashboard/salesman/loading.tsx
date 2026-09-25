export default function SalesmanLoading() {
  return (
    <div className="space-y-6 animate-pulse pb-20">
      {/* Header Profile skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
          <div className="h-4 w-48 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
        </div>
        <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
      </div>

      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2 shadow-sm">
            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
          </div>
        ))}
      </div>

      {/* Assigned Route Card skeleton */}
      <div className="h-32 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="h-3 w-36 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
      </div>

      {/* Customer List skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm"></div>
        ))}
      </div>
    </div>
  );
}
