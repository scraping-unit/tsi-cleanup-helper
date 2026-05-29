import { Fragment } from "react";
import type { BatchSummary, CleanupStatus } from "../types";
import { CLEANUP_STATUSES } from "../types";

const STATUS_SHORT: Record<CleanupStatus, string> = {
  "No need to update - Still valid": "Still valid",
  "URL Updated": "URL Updated",
  Excluded: "Excluded",
  "Format updated": "Format updated",
  "Moved to another brand": "Moved",
  Pending: "Pending",
  Other: "Other",
};

interface SummaryBarProps {
  summary: BatchSummary;
}

function Chip({ label, count }: { label: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-transparent px-2.5 py-0.5 text-xs bg-secondary text-secondary-foreground whitespace-nowrap">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{count}</span>
    </span>
  );
}

export function SummaryBar({ summary }: SummaryBarProps) {
  const statusChips = CLEANUP_STATUSES.filter((s) => summary.byStatus[s] > 0);

  return (
    <div className="flex flex-wrap items-center gap-2 py-3">
      <Chip label="Total" count={summary.total} />
      <span className="text-muted-foreground text-xs">·</span>
      <Chip label="Processed" count={summary.processed} />
      <span className="text-muted-foreground text-xs">·</span>
      <Chip label="Errors" count={summary.errors} />
      {statusChips.map((status) => (
        <Fragment key={status}>
          <span className="text-muted-foreground text-xs">·</span>
          <Chip
            label={STATUS_SHORT[status]}
            count={summary.byStatus[status]}
          />
        </Fragment>
      ))}
    </div>
  );
}
