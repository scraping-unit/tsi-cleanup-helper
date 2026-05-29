import { useState } from "react";
import type { CsvRowError } from "../types";

interface ImportErrorBannerProps {
  errors: CsvRowError[];
}

export function ImportErrorBanner({ errors }: ImportErrorBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || errors.length === 0) return null;

  return (
    <div className="flex items-center justify-between gap-4 border border-amber-200 bg-amber-50 text-amber-800 px-4 py-2.5 text-sm rounded-md">
      <span>
        {errors.length} row{errors.length !== 1 ? "s" : ""} were skipped during
        CSV import due to parse errors.
      </span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="shrink-0 text-amber-600 hover:text-amber-900 leading-none"
      >
        ×
      </button>
    </div>
  );
}
