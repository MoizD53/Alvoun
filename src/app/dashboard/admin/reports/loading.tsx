export default function ReportsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-surface-raised shadow-raised border border-border/40 rounded-2xl p-4 space-y-2">
            <div className="h-3 w-16 bg-surface-inset shadow-inset rounded"></div>
            <div className="h-6 w-24 bg-surface-inset shadow-inset rounded"></div>
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-surface-raised shadow-raised rounded-2xl border border-border/40 overflow-hidden p-4 space-y-3">
        <div className="h-10 w-full bg-surface-inset shadow-inset rounded-xl"></div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 w-full bg-surface-inset/40 rounded-xl"></div>
        ))}
      </div>
    </div>
  );
}
