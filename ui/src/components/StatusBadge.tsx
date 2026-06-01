import type { ReviewerAction } from "../lib/toDisplayRows";

const ACTION_COLORS: Record<ReviewerAction, { bg: string; text: string }> = {
  "Valid":          { bg: '#E8F7EF', text: '#2D7A4F' },
  "Update URL":     { bg: '#FFF0CC', text: '#A05C00' },
  "Exclude":        { bg: '#FDECEA', text: '#B83030' },
  "Check manually": { bg: '#F4F0ED', text: '#555555' },
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
