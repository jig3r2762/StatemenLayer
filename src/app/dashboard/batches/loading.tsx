import { LoadingHeader, LoadingStatsGrid, LoadingTable } from "../_components/loading-ui";

export default function Loading() {
  return (
    <div className="flex-1">
      <LoadingHeader showDescription />
      <div className="px-7 py-6 space-y-5 max-w-5xl">
        <LoadingStatsGrid count={3} />
        <div className="space-y-3">
          <div className="flex items-center gap-2 animate-pulse">
            <div className="h-8 w-[180px] rounded-lg bg-gray-100" />
            <div className="h-8 w-[160px] rounded-lg bg-gray-100" />
          </div>
          <LoadingTable rows={6} />
        </div>
      </div>
    </div>
  );
}
