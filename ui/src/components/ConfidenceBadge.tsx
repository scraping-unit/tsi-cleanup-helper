import type { Confidence } from "../types";

const CONFIDENCE_COLORS: Record<Confidence, { bg: string; text: string }> = {
  high:   { bg: 'var(--success-bg)', text: 'var(--success-text)' },
  medium: { bg: 'var(--warning-bg)', text: 'var(--warning-text)' },
  low:    { bg: 'var(--danger-bg)', text: 'var(--danger-text)' },
};

interface ConfidenceBadgeProps {
  confidence: Confidence;
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const { bg, text } = CONFIDENCE_COLORS[confidence];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: bg,
        color: text,
        fontFamily: 'Outfit, sans-serif',
        fontWeight: 500,
        fontSize: '12px',
        borderRadius: '5px',
        padding: '2px 8px',
        whiteSpace: 'nowrap',
      }}
    >
      {confidence.charAt(0).toUpperCase() + confidence.slice(1)}
    </span>
  );
}
