import type { Confidence } from "../types";

const CONFIDENCE_COLORS: Record<Confidence, { bg: string; text: string }> = {
  high:   { bg: '#E8F7EF', text: '#2D7A4F' },
  medium: { bg: '#FFF0CC', text: '#A05C00' },
  low:    { bg: '#FDECEA', text: '#B83030' },
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
