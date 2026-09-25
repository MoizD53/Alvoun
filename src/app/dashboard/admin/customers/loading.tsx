export default function CustomersLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="h-8 w-40 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          <div className="h-4 w-64 bg-slate-100 dark:bg-slate-800/60 rounded mt-2"></div>
        </div>
        <div className="h-10 w-36 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="h-10 flex-1 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        <div className="h-10 w-36 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        <div className="h-10 w-36 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="h-12 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800"></div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-14 w-full bg-slate-100 dark:bg-slate-900/60 rounded-lg"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
