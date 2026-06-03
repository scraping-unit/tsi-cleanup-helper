import { Check, ExternalLink, X } from "lucide-react";
import type { DisplayRow } from "../lib/toDisplayRows";
import type { RowReviewState } from "./ResultsView";

interface AiReviewPanelProps {
  row?: DisplayRow;
  selectedCount: number;
  review?: RowReviewState;
  onAcceptRow: () => void;
  onRejectRow: () => void;
  onAcceptSelected: () => void;
  onRejectSelected: () => void;
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'Outfit, sans-serif',
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const valueStyle: React.CSSProperties = {
  fontFamily: 'Outfit, sans-serif',
  fontSize: '13px',
  color: 'var(--text-primary)',
};

export function AiReviewPanel({
  row,
  selectedCount,
  review,
  onAcceptRow,
  onRejectRow,
  onAcceptSelected,
  onRejectSelected,
}: AiReviewPanelProps) {
  if (!row) return null;

  const evidenceUrls = row.aiEvidenceUrls ?? [];
  const confidence =
    row.aiConfidencePercentage !== undefined
      ? `${row.aiConfidencePercentage}%`
      : row.aiConfidence ?? "—";

  return (
    <section
      className="grid gap-3 px-4 py-3"
      style={{
        backgroundColor: 'var(--surface-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
      }}
    >
      <div className="min-w-0">
        <div style={labelStyle}>Selected row</div>
        <div className="truncate" style={{ ...valueStyle, fontWeight: 600 }} title={row.brandName}>
          {row.brandName}
        </div>
        <div className="truncate" style={{ ...valueStyle, color: 'var(--text-secondary)' }} title={row.currentMenuUrl}>
          {row.menuId} · {row.currentUrlResult}
        </div>
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <PanelField label="AI Action" value={row.aiRecommendedAction ?? "—"} />
        <PanelField label="AI Confidence" value={confidence} />
        <PanelField label="Candidate URL" value={row.aiCandidateUrl ?? "—"} href={row.aiCandidateUrl} />
        <PanelField label="Cluster Hint" value={row.aiTargetClusterHint ?? "—"} />
        <div className="min-w-0">
          <div style={labelStyle}>Reason</div>
          <div className="line-clamp-2" style={valueStyle} title={row.aiReason ?? row.recommendationReason}>
            {row.aiReason ?? row.recommendationReason}
          </div>
        </div>
        <div className="min-w-0">
          <div style={labelStyle}>Evidence</div>
          {evidenceUrls.length === 0 ? (
            <div style={valueStyle}>—</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {evidenceUrls.slice(0, 3).map((url, index) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1"
                  style={{ ...valueStyle, color: 'var(--primary)', textDecoration: 'none' }}
                  title={url}
                >
                  Source {index + 1}
                  <ExternalLink size={12} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end justify-between gap-2">
        <div style={{ ...valueStyle, color: review?.decision === "rejected" ? 'var(--danger-text)' : 'var(--success-text)' }}>
          {review ? review.decision : "unreviewed"}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {selectedCount > 0 && (
            <>
              <ActionButton label={`Accept ${selectedCount}`} icon="accept" onClick={onAcceptSelected} />
              <ActionButton label={`Reject ${selectedCount}`} icon="reject" onClick={onRejectSelected} />
            </>
          )}
          <ActionButton label="Accept row" icon="accept" onClick={onAcceptRow} />
          <ActionButton label="Reject AI" icon="reject" onClick={onRejectRow} />
        </div>
      </div>
    </section>
  );
}

function PanelField({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="min-w-0">
      <div style={labelStyle}>{label}</div>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="truncate inline-flex max-w-full items-center gap-1"
          style={{ ...valueStyle, color: 'var(--primary)', textDecoration: 'none' }}
          title={value}
        >
          <span className="truncate">{value}</span>
          <ExternalLink size={12} />
        </a>
      ) : (
        <div className="truncate" style={valueStyle} title={value}>{value}</div>
      )}
    </div>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: "accept" | "reject";
  onClick: () => void;
}) {
  const isAccept = icon === "accept";
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5"
      style={{
        height: '30px',
        borderRadius: '6px',
        border: `1px solid ${isAccept ? 'var(--success-text)' : 'var(--danger-text)'}`,
        background: 'transparent',
        color: isAccept ? 'var(--success-text)' : 'var(--danger-text)',
        fontFamily: 'Outfit, sans-serif',
        fontSize: '12px',
        fontWeight: 600,
        padding: '0 10px',
        cursor: 'pointer',
      }}
    >
      {isAccept ? <Check size={14} /> : <X size={14} />}
      {label}
    </button>
  );
}
