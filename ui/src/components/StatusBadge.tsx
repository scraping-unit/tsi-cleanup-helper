import type { ReviewerAction } from "../lib/toDisplayRows";

const ACTION_COLORS: Record<ReviewerAction, { bg: string; text: string }> = {
  "Valid":          { bg: 'var(--success-bg)', text: 'var(--success-text)' },
  "Update URL":     { bg: 'var(--warning-bg)', text: 'var(--warning-text)' },
  "Exclude":        { bg: 'var(--danger-bg)', text: 'var(--danger-text)' },
  "Check manually": { bg: 'var(--neutral-bg)', text: 'var(--neutral-text)' },
};

interface StatusBadgeProps {
  action: ReviewerAction;
}

export function StatusBadge({ action }: StatusBadgeProps) {
  const { bg, text } = ACTION_COLORS[action];
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
      {action}
    </span>
  );
}
