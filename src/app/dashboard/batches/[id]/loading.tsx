import { LoadingHeader, LoadingStatsGrid, LoadingTable } from "../../_components/loading-ui";

export default function Loading() {
  return (
    <div className="flex-1">
      <LoadingHeader showDescription showActions />
      <div className="px-7 py-6 space-y-5 max-w-5xl">
        <div className="animate-pulse rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
          <div className="h-4 w-72 rounded bg-amber-100" />
        </div>
        <LoadingStatsGrid count={4} />
        <LoadingTable rows={7} />
      </div>
    </div>
  );
}
