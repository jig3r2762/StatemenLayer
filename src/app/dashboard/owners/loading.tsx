import { LoadingHeader, LoadingTable } from "../_components/loading-ui";

export default function Loading() {
  return (
    <div className="flex-1">
      <LoadingHeader showDescription />
      <div className="px-7 py-6 space-y-5 max-w-5xl">
        <div className="h-4 w-40 rounded bg-gray-100 animate-pulse" />
        <LoadingTable rows={6} />
      </div>
    </div>
  );
}
