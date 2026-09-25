export default function ReportsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="h-8 w-44 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          <div className="h-4 w-60 bg-slate-100 dark:bg-slate-800/60 rounded mt-2"></div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        ))}
      </div>

      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-4 space-y-3">
        <div className="h-10 w-full bg-slate-50 dark:bg-slate-900 rounded-lg"></div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 w-full bg-slate-100 dark:bg-slate-800/50 rounded-lg"></div>
        ))}
      </div>
    </div>
  );
}
