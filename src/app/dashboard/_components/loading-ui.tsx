function Block({ className = "" }: { className?: string }) {
  return <div className={`rounded bg-gray-100 ${className}`.trim()} />;
}

export function LoadingHeader({
  showActions = true,
  showDescription = true,
}: {
  showActions?: boolean;
  showDescription?: boolean;
}) {
  return (
    <header className="flex items-center justify-between px-7 py-5 bg-white border-b border-gray-100">
      <div className="animate-pulse space-y-2">
        <Block className="h-5 w-40" />
        {showDescription ? <Block className="h-3.5 w-64" /> : null}
      </div>
      <div className="flex items-center gap-3 animate-pulse">
        {showActions ? <Block className="h-9 w-32 rounded-lg" /> : null}
        <Block className="h-8 w-8 rounded-full" />
      </div>
    </header>
  );
}

export function LoadingStatsGrid({ count = 4 }: { count?: number }) {
  const gridCls = count === 4 ? "grid-cols-2 lg:grid-cols-4" : count === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4";
  return (
    <div className={`grid gap-4 ${gridCls}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-xl border border-gray-100 bg-white p-5 animate-pulse space-y-3">
          <Block className="h-9 w-9 rounded-xl" />
          <Block className="h-7 w-20" />
          <Block className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

export function LoadingListCard({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white overflow-hidden animate-pulse">
      <div className="divide-y divide-gray-50">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <Block className="h-8 w-8 rounded-lg" />
              <div className="space-y-2">
                <Block className="h-4 w-28" />
                <Block className="h-3 w-20" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Block className="h-6 w-16 rounded-full" />
              <Block className="h-4 w-4 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LoadingFilters() {
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between animate-pulse">
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <Block className="h-10 w-full sm:w-[220px] rounded-md" />
        <Block className="h-10 w-full sm:w-[220px] rounded-md" />
      </div>
      <Block className="h-4 w-24" />
    </div>
  );
}

export function LoadingOwnerGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-xl border border-gray-100 bg-white p-4 animate-pulse">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <Block className="h-9 w-9 rounded-full" />
              <div className="space-y-2">
                <Block className="h-4 w-28" />
                <Block className="h-3.5 w-36" />
                <div className="flex gap-2 pt-1">
                  <Block className="h-5 w-16 rounded-full" />
                  <Block className="h-5 w-20 rounded-full" />
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <Block className="h-8 w-8 rounded-md" />
              <Block className="h-8 w-8 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function LoadingFormCard({ sections = 3 }: { sections?: number }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 animate-pulse space-y-5">
      <div className="space-y-2">
        <Block className="h-5 w-48" />
        <Block className="h-4 w-80" />
      </div>
      {Array.from({ length: sections }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Block className="h-4 w-28" />
          <Block className="h-10 w-full rounded-md" />
        </div>
      ))}
      <Block className="h-10 w-32 rounded-lg" />
    </div>
  );
}

export function LoadingTable({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white overflow-hidden animate-pulse">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <Block className="h-4 w-24" />
        <Block className="h-4 w-16" />
      </div>
      <div className="grid grid-cols-12 px-5 py-3 bg-gray-50 border-b border-gray-100 gap-3">
        <Block className="col-span-3 h-3" />
        <Block className="col-span-4 h-3" />
        <Block className="col-span-2 h-3" />
        <Block className="col-span-3 h-3" />
      </div>
      <div className="divide-y divide-gray-50">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="grid grid-cols-12 px-5 py-4 items-center gap-3">
            <div className="col-span-3 flex items-center gap-2.5">
              <Block className="h-7 w-7 rounded-full" />
              <Block className="h-4 w-24" />
            </div>
            <Block className="col-span-4 h-4" />
            <Block className="col-span-2 h-4 w-16" />
            <div className="col-span-3 flex justify-end">
              <Block className="h-6 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
