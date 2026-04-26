import { AlertCircle, AlertTriangle } from "lucide-react";

interface ValidationErrorsProps {
  errors: string[];
  warnings?: string[];
}

export function ValidationErrors({ errors, warnings = [] }: ValidationErrorsProps) {
  if (errors.length === 0 && warnings.length === 0) return null;

  return (
    <div className="space-y-2">
      {errors.map((err, i) => (
        <div
          key={i}
          className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{err}</span>
        </div>
      ))}
      {warnings.map((warn, i) => (
        <div
          key={i}
          className="flex items-start gap-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2"
        >
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{warn}</span>
        </div>
      ))}
    </div>
  );
}
