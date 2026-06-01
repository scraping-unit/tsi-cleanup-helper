import type { CleanupStatus } from "../types";

const STATUS_COLORS: Record<CleanupStatus, { bg: string; text: string }> = {
  "No need to update - Still valid": { bg: '#E8F7EF', text: '#2D7A4F' },
  "URL Updated":                     { bg: '#FFF0CC', text: '#A05C00' },
  "Excluded":                        { bg: '#FDECEA', text: '#B83030' },
  "Format updated":                  { bg: '#FFF0CC', text: '#A05C00' },
  "Moved to another brand":          { bg: '#F0EAF8', text: '#5C3D8F' },
  "Pending":                         { bg: '#F4F0ED', text: '#555555' },
  "Other":                           { bg: '#F4F0ED', text: '#555555' },
};

const STATUS_LABELS: Record<CleanupStatus, string> = {
  "No need to update - Still valid": "Still valid",
  "URL Updated":                     "URL Updated",
  "Excluded":                        "Excluded",
  "Format updated":                  "Format updated",
  "Moved to another brand":          "Moved",
  "Pending":                         "Pending",
  "Other":                           "Other",
};

interface StatusBadgeProps {
  status: CleanupStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { bg, text } = STATUS_COLORS[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: bg,
        color: text,
        fontFamily: 'Outfit, sans-serif',
        fontWeight: 500,
        fontSize: '11px',
        borderRadius: '5px',
        padding: '2px 8px',
        whiteSpace: 'nowrap',
      }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
