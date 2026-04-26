import { LoadingFormCard, LoadingHeader } from "../_components/loading-ui";

export default function Loading() {
  return (
    <div>
      <LoadingHeader showDescription={false} />
      <div className="p-6 max-w-2xl space-y-6">
        <LoadingFormCard sections={4} />
        <LoadingFormCard sections={2} />
        <LoadingFormCard sections={2} />
      </div>
    </div>
  );
}
