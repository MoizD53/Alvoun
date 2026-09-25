export default function AdminLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          <div className="h-4 w-72 bg-slate-100 dark:bg-slate-800/60 rounded mt-2"></div>
        </div>
        <div className="h-10 w-36 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
      </div>

      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="h-8 w-8 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
            </div>
            <div className="h-7 w-28 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="h-3 w-36 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
          </div>
        ))}
      </div>

      {/* Chart Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="space-y-2 pt-2">
              <div className="h-6 w-full bg-slate-100 dark:bg-slate-800 rounded"></div>
              <div className="h-6 w-5/6 bg-slate-100 dark:bg-slate-800 rounded"></div>
              <div className="h-6 w-4/6 bg-slate-100 dark:bg-slate-800 rounded"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Salesman Table Skeleton */}
      <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="h-6 w-40 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 w-full bg-slate-100 dark:bg-slate-800/60 rounded-lg"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
