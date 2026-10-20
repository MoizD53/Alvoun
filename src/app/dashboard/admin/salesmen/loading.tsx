export default function SalesmenLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="h-8 w-44 bg-surface-raised shadow-raised rounded-xl"></div>
          <div className="h-4 w-72 bg-surface-inset shadow-inset rounded-lg mt-2"></div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="h-11 w-80 bg-surface-inset shadow-inset rounded-2xl border border-border/40"></div>

      {/* Search & Filters */}
      <div className="bg-surface-raised shadow-raised p-4 rounded-2xl border border-border/40 flex flex-col lg:flex-row gap-3">
        <div className="h-10 flex-1 bg-surface-inset shadow-inset rounded-xl"></div>
        <div className="h-10 w-full lg:w-44 bg-surface-inset shadow-inset rounded-xl"></div>
        <div className="h-10 w-full lg:w-44 bg-surface-inset shadow-inset rounded-xl"></div>
        <div className="h-10 w-full lg:w-36 bg-surface-raised shadow-raised rounded-xl"></div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-surface-raised shadow-raised rounded-2xl border border-border/40 overflow-hidden">
        <div className="h-12 bg-surface-inset shadow-inset border-b border-border/40"></div>
        <div className="divide-y divide-border/40 p-2 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 w-full bg-surface-inset/40 rounded-xl"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
