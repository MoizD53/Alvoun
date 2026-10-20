export default function SalesmanLoading() {
  return (
    <div className="space-y-6 animate-pulse pb-20">
      {/* Header Profile skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-36 bg-surface-raised shadow-raised rounded-xl"></div>
          <div className="h-4 w-48 bg-surface-inset shadow-inset rounded-lg"></div>
        </div>
        <div className="h-10 w-10 bg-surface-raised shadow-raised rounded-xl"></div>
      </div>

      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-3 gap-3 bg-surface-raised shadow-raised rounded-2xl border border-border/40 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-12 bg-surface-inset shadow-inset rounded"></div>
            <div className="h-6 w-16 bg-surface-inset shadow-inset rounded"></div>
          </div>
        ))}
      </div>

      {/* Route Card skeleton */}
      <div className="bg-surface-raised shadow-raised border border-border/40 rounded-2xl p-5 space-y-3">
        <div className="h-4 w-28 bg-surface-inset shadow-inset rounded"></div>
        <div className="h-6 w-48 bg-surface-inset shadow-inset rounded"></div>
        <div className="h-3 w-36 bg-surface-inset shadow-inset rounded"></div>
      </div>

      {/* Customer List skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-32 bg-surface-raised rounded"></div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-surface-raised shadow-raised border border-border/40 rounded-2xl p-4"></div>
        ))}
      </div>
    </div>
  );
}
