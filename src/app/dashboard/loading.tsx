import { LoadingHeader, LoadingListCard, LoadingStatsGrid } from "./_components/loading-ui";

export default function Loading() {
  return (
    <div className="flex-1">
      <LoadingHeader showDescription />
      <div className="px-7 py-6 space-y-6 max-w-5xl">
        <div className="animate-pulse rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
          <div className="h-4 w-96 rounded bg-amber-100" />
        </div>
        <LoadingStatsGrid />
        <div className="space-y-3">
          <div className="flex items-center justify-between animate-pulse">
            <div className="h-4 w-28 rounded bg-gray-100" />
            <div className="h-4 w-16 rounded bg-gray-100" />
          </div>
          <LoadingListCard rows={5} />
        </div>
      </div>
    </div>
  );
}
