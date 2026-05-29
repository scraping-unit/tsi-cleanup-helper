import { cn } from "@/lib/utils";
import type { CleanupStatus } from "../types";

const STATUS_CLASSES: Record<CleanupStatus, string> = {
  "No need to update - Still valid":
    "bg-green-100 text-green-800 border-green-200",
  "URL Updated": "bg-blue-100 text-blue-800 border-blue-200",
  Excluded: "bg-red-100 text-red-800 border-red-200",
  "Format updated": "bg-orange-100 text-orange-800 border-orange-200",
  "Moved to another brand": "bg-purple-100 text-purple-800 border-purple-200",
  Pending: "bg-secondary text-secondary-foreground border-border",
  Other: "text-foreground border-border",
};

const STATUS_LABELS: Record<CleanupStatus, string> = {
  "No need to update - Still valid": "Still valid",
  "URL Updated": "URL Updated",
  Excluded: "Excluded",
  "Format updated": "Format updated",
  "Moved to another brand": "Moved",
  Pending: "Pending",
  Other: "Other",
};

interface StatusBadgeProps {
  status: CleanupStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_CLASSES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
