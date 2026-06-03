import type { BatchSummary } from "../types";

interface SummaryBarProps {
  summary: BatchSummary;
}

interface TileProps {
  label: string;
  value: number;
  valueColor?: string;
}

function Tile({ label, value, valueColor = 'var(--text-primary)' }: TileProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-1 px-6">
      <span
        style={{
          fontFamily: 'Outfit, sans-serif',
          fontWeight: 700,
          fontSize: '28px',
          color: valueColor,
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: '11px',
          fontWeight: 400,
          color: 'var(--text-secondary)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function SummaryBar({ summary }: SummaryBarProps) {
  const valid = summary.byStatus["No need to update - Still valid"] ?? 0;
  const needsReview = (summary.byStatus["Pending"] ?? 0) + (summary.byStatus["Other"] ?? 0);
  const autoResolved = summary.processed - needsReview;

  const divider = (
    <div style={{ width: '1px', height: '40px', backgroundColor: 'var(--border-subtle)' }} />
  );

  return (
    <div
      className="flex items-center"
      style={{
        height: '72px',
        backgroundColor: 'var(--surface)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <Tile label="Total" value={summary.total} />
      {divider}
      <Tile label="Valid" value={valid} valueColor="var(--success-text)" />
      {divider}
      <Tile label="Needs Review" value={needsReview} valueColor="var(--primary)" />
      {divider}
      <Tile label="Auto-resolved" value={autoResolved} />
    </div>
  );
}
