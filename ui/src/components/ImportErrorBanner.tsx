import { useState } from "react";
import type { CsvRowError } from "../types";

interface ImportErrorBannerProps {
  errors: CsvRowError[];
}

export function ImportErrorBanner({ errors }: ImportErrorBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || errors.length === 0) return null;

  return (
    <div
      className="flex items-center justify-between gap-4 px-4 py-2.5"
      style={{
        backgroundColor: '#FFF0CC',
        color: '#A05C00',
        borderRadius: '6px',
        fontFamily: 'Outfit, sans-serif',
        fontSize: '13px',
      }}
    >
      <span>
        {errors.length} row{errors.length !== 1 ? "s" : ""} skipped during CSV import due to parse errors.
      </span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: '#A05C00',
          fontSize: '16px',
          lineHeight: 1,
          padding: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}
