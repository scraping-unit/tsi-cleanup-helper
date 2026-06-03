import type { Table } from "@tanstack/react-table";
import { useState } from "react";
import { Download, ListFilter, Rows3, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CONFIDENCE_VALUES, type AiReviewProgress, type Confidence, type MenuPlatform } from "../types";
import { REVIEWER_ACTIONS, shouldReviewDisplayRowWithAi } from "../lib/toDisplayRows";
import type { DisplayRow, ReviewerAction, UrlHealthIndicator } from "../lib/toDisplayRows";
import type { CsvExportHrefs, TableDensity } from "./ResultsView";

const URL_RESULT_VALUES = [
  "not_checked",
  "valid",
  "inaccessible",
  "redirected",
  "invalid",
  "unknown",
] as const;

const COLUMN_LABELS: Record<string, string> = {
  brandId: "Brand ID",
  clusterId: "Cluster ID",
  templateName: "Template",
  scrapingStatus: "Scraping Status",
  finalUrl: "Final URL",
  candidateSource: "Candidate Source",
  formatDetected: "Format Detected",
  menuContentDetected: "Content Detected",
  brandMatch: "Brand Match",
  needsEscalation: "Escalation",
  escalationReason: "Escalation Reason",
  humanFinalStatus: "Human Status",
  humanComment: "Human Comment",
  menuId: "Menu ID",
  detectedPlatform: "Platform",
  deliverooVerified: "Deliveroo State",
  recommendedStatus: "Cleanup Status",
  recommendationReason: "Reason",
  candidateNewUrl: "New URL",
  aiConfidence: "AI Confidence",
  aiConfidencePercentage: "AI Confidence %",
  aiUrlStillAccessible: "AI URL Accessible",
  aiMenuStillAvailable: "AI Menu Available",
  aiReason: "AI Reason",
  aiTargetClusterHint: "AI Cluster Hint",
  aiEvidenceUrls: "AI Evidence URLs",
  aiError: "AI Error",
};

const HIDDEN_TOGGLEABLE_COLUMNS = [
  "menuId",
  "detectedPlatform",
  "deliverooVerified",
  "recommendedStatus",
  "recommendationReason",
  "candidateNewUrl",
  "aiConfidence",
  "aiConfidencePercentage",
  "aiUrlStillAccessible",
  "aiMenuStillAvailable",
  "aiReason",
  "aiTargetClusterHint",
  "aiEvidenceUrls",
  "aiError",
  "brandId",
  "clusterId",
  "templateName",
  "scrapingStatus",
  "finalUrl",
  "candidateSource",
  "formatDetected",
  "menuContentDetected",
  "brandMatch",
  "needsEscalation",
  "escalationReason",
  "humanFinalStatus",
  "humanComment",
];

interface TableToolbarProps {
  table: Table<DisplayRow>;
  globalFilter: string;
  onGlobalFilterChange: (v: string) => void;
  csvHref: string | null;
  exportHrefs: CsvExportHrefs;
  aiReview?: AiReviewProgress;
  density: TableDensity;
  selectedCount: number;
  onDensityChange: (density: TableDensity) => void;
  onClearSelection: () => void;
  onSelectVisible: () => void;
  onSelectByUrlHealth: (urlHealth: UrlHealthIndicator) => void;
  onSelectByAiConfidence: (confidence: Confidence) => void;
  onSelectByPlatform: (platform: MenuPlatform) => void;
  onSelectByStatus: (status: ReviewerAction) => void;
  onAcceptSelected: () => void;
  onRejectSelected: () => void;
  onAiReview: (limit: number) => void;
  onAiReviewSelected: (rowIndexes: number[]) => void;
  onReset: () => void;
}

const toolbarInputStyle: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '13px',
  height: '34px',
};

const selectTextStyle: React.CSSProperties = {
  fontFamily: 'Outfit, sans-serif',
  fontSize: '13px',
};

export function TableToolbar({
  table,
  globalFilter,
  onGlobalFilterChange,
  csvHref,
  exportHrefs,
  aiReview,
  density,
  selectedCount,
  onDensityChange,
  onClearSelection,
  onSelectVisible,
  onSelectByUrlHealth,
  onSelectByAiConfidence,
  onSelectByPlatform,
  onSelectByStatus,
  onAcceptSelected,
  onRejectSelected,
  onAiReview,
  onAiReviewSelected,
  onReset,
}: TableToolbarProps) {
  const [aiLimit, setAiLimit] = useState("10");
  const actionCol = table.getColumn("reviewerAction");
  const confidenceCol = table.getColumn("confidence");
  const urlResultCol = table.getColumn("currentUrlResult");
  const platformCol = table.getColumn("detectedPlatform");
  const aiConfidenceCol = table.getColumn("aiConfidence");

  const actionValue =
    (actionCol?.getFilterValue() as string | undefined) ?? "";
  const confidenceValue =
    (confidenceCol?.getFilterValue() as string | undefined) ?? "";
  const urlResultValue =
    (urlResultCol?.getFilterValue() as string | undefined) ?? "";
  const platformValue =
    (platformCol?.getFilterValue() as string | undefined) ?? "";
  const aiConfidenceValue =
    (aiConfidenceCol?.getFilterValue() as string | undefined) ?? "";

  const hasFilters =
    globalFilter !== "" ||
    actionValue !== "" ||
    confidenceValue !== "" ||
    urlResultValue !== "" ||
    platformValue !== "" ||
    aiConfidenceValue !== "";

  const platformValues = Array.from(new Set(
    table.getPreFilteredRowModel().rows
      .map((row) => row.original.detectedPlatform)
      .filter((platform): platform is MenuPlatform => Boolean(platform)),
  )).sort();

  function clearFilters() {
    onGlobalFilterChange("");
    actionCol?.setFilterValue(undefined);
    confidenceCol?.setFilterValue(undefined);
    urlResultCol?.setFilterValue(undefined);
    platformCol?.setFilterValue(undefined);
    aiConfidenceCol?.setFilterValue(undefined);
  }

  const toggleableColumns = HIDDEN_TOGGLEABLE_COLUMNS.map((id) =>
    table.getColumn(id),
  ).filter(Boolean);
  const selectedEligibleRows = table
    .getSelectedRowModel()
    .rows
    .map((row) => row.original)
    .filter(shouldReviewDisplayRowWithAi);
  const selectedEligibleCount = selectedEligibleRows.length;
  const aiReviewProcessing = aiReview?.status === "processing";

  return (
    <div
      className="flex flex-wrap items-center gap-2 px-4"
      style={{
        backgroundColor: 'var(--surface)',
        borderBottom: '1px solid var(--border-subtle)',
        minHeight: '48px',
        paddingTop: '8px',
        paddingBottom: '8px',
      }}
    >
      <Input
        placeholder="Filter by URL…"
        value={globalFilter}
        onChange={(e) => onGlobalFilterChange(e.target.value)}
        className="w-52"
        style={toolbarInputStyle}
      />

      <Select
        value={actionValue || "all"}
        onValueChange={(v) =>
          actionCol?.setFilterValue(v === "all" ? undefined : v)
        }
      >
        <SelectTrigger className="w-44" style={{ height: '34px', ...selectTextStyle }}>
          <SelectValue placeholder="All actions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" style={selectTextStyle}>All actions</SelectItem>
          {REVIEWER_ACTIONS.map((s) => (
            <SelectItem key={s} value={s} style={selectTextStyle}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={confidenceValue || "all"}
        onValueChange={(v) =>
          confidenceCol?.setFilterValue(v === "all" ? undefined : v)
        }
      >
        <SelectTrigger className="w-32" style={{ height: '34px', ...selectTextStyle }}>
          <SelectValue placeholder="Confidence" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" style={selectTextStyle}>All confidence</SelectItem>
          {CONFIDENCE_VALUES.map((c) => (
            <SelectItem key={c} value={c} style={selectTextStyle}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={urlResultValue || "all"}
        onValueChange={(v) =>
          urlResultCol?.setFilterValue(v === "all" ? undefined : v)
        }
      >
        <SelectTrigger className="w-36" style={{ height: '34px', ...selectTextStyle }}>
          <SelectValue placeholder="URL result" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" style={selectTextStyle}>All URL results</SelectItem>
          {URL_RESULT_VALUES.map((r) => (
            <SelectItem key={r} value={r} style={selectTextStyle}>
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={platformValue || "all"}
        onValueChange={(v) =>
          platformCol?.setFilterValue(v === "all" ? undefined : v)
        }
      >
        <SelectTrigger className="w-32" style={{ height: '34px', ...selectTextStyle }}>
          <SelectValue placeholder="Platform" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" style={selectTextStyle}>All platforms</SelectItem>
          {platformValues.map((platform) => (
            <SelectItem key={platform} value={platform} style={selectTextStyle}>
              {platform}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={aiConfidenceValue || "all"}
        onValueChange={(v) =>
          aiConfidenceCol?.setFilterValue(v === "all" ? undefined : v)
        }
      >
        <SelectTrigger className="w-36" style={{ height: '34px', ...selectTextStyle }}>
          <SelectValue placeholder="AI confidence" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" style={selectTextStyle}>All AI confidence</SelectItem>
          {CONFIDENCE_VALUES.map((c) => (
            <SelectItem key={c} value={c} style={selectTextStyle}>
              AI {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div
        className="inline-flex items-center"
        style={{ border: '1px solid var(--border-control)', borderRadius: '6px', height: '34px', overflow: 'hidden' }}
      >
        {(["comfortable", "compact"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={density === mode}
            onClick={() => onDensityChange(mode)}
            className="inline-flex items-center gap-1"
            style={{
              height: '32px',
              border: 'none',
              borderRight: mode === "comfortable" ? '1px solid var(--border-control)' : 'none',
              backgroundColor: density === mode ? 'var(--surface-hover)' : 'transparent',
              color: density === mode ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontFamily: 'Outfit, sans-serif',
              fontSize: '12px',
              padding: '0 9px',
              cursor: 'pointer',
            }}
          >
            <Rows3 size={13} />
            {mode === "comfortable" ? "Comfort" : "Compact"}
          </button>
        ))}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="inline-flex items-center gap-2"
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: '13px',
              fontWeight: 400,
              color: 'var(--text-secondary)',
              background: selectedCount > 0 ? 'var(--surface-selected)' : 'transparent',
              border: '1px solid var(--border-control)',
              borderRadius: '6px',
              height: '34px',
              padding: '0 12px',
              cursor: 'pointer',
            }}
          >
            <ListFilter size={14} />
            Select{selectedCount > 0 ? ` ${selectedCount}` : ""}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={onSelectVisible} style={selectTextStyle}>Visible rows</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger style={selectTextStyle}>By URL health</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {(["accessible", "dead", "unverifiable"] as const).map((urlHealth) => (
                <DropdownMenuItem key={urlHealth} onClick={() => onSelectByUrlHealth(urlHealth)} style={selectTextStyle}>
                  {urlHealth}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger style={selectTextStyle}>By AI confidence</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {CONFIDENCE_VALUES.map((confidence) => (
                <DropdownMenuItem key={confidence} onClick={() => onSelectByAiConfidence(confidence)} style={selectTextStyle}>
                  {confidence}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger style={selectTextStyle}>By platform</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {platformValues.map((platform) => (
                <DropdownMenuItem key={platform} onClick={() => onSelectByPlatform(platform)} style={selectTextStyle}>
                  {platform}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger style={selectTextStyle}>By status</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {REVIEWER_ACTIONS.map((status) => (
                <DropdownMenuItem key={status} onClick={() => onSelectByStatus(status)} style={selectTextStyle}>
                  {status}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {selectedCount > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onAcceptSelected} style={selectTextStyle}>Accept selected</DropdownMenuItem>
              <DropdownMenuItem onClick={onRejectSelected} style={selectTextStyle}>Reject selected</DropdownMenuItem>
              <DropdownMenuItem onClick={onClearSelection} style={selectTextStyle}>Clear selection</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: '13px',
              fontWeight: 400,
              color: 'var(--text-secondary)',
              background: 'transparent',
              border: '1px solid var(--border-control)',
              borderRadius: '6px',
              height: '34px',
              padding: '0 12px',
              cursor: 'pointer',
            }}
          >
            Columns
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel style={selectTextStyle}>Visible columns</DropdownMenuLabel>
          {toggleableColumns.map((col) => {
            if (!col) return null;
            return (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={col.getIsVisible()}
                onCheckedChange={(v) => col.toggleVisibility(v)}
                style={selectTextStyle}
              >
                {COLUMN_LABELS[col.id] ?? col.id}
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {hasFilters && (
        <button
          onClick={clearFilters}
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '0 4px',
          }}
        >
          Clear filters
        </button>
      )}

      <div className="ml-auto flex items-center gap-2">
        <Select value={aiLimit} onValueChange={setAiLimit}>
          <SelectTrigger className="w-20" style={{ height: '34px', ...selectTextStyle }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["1", "5", "10", "25", "50"].map((limit) => (
              <SelectItem key={limit} value={limit} style={selectTextStyle}>{limit}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          disabled={aiReviewProcessing || selectedEligibleCount === 0}
          onClick={() => onAiReviewSelected(selectedEligibleRows.map((row) => row.sourceIndex))}
          title="Use paid OpenAI web search on selected unresolved rows"
          className="inline-flex items-center gap-2"
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: '13px',
            color: '#6B4230',
            background: 'transparent',
            border: '1px solid rgb(238 97 44 / 0.2)',
            borderRadius: '6px',
            height: '34px',
            padding: '0 12px',
            cursor: aiReviewProcessing ? 'wait' : selectedEligibleCount === 0 ? 'not-allowed' : 'pointer',
            opacity: selectedEligibleCount === 0 ? 0.55 : 1,
          }}
        >
          <Sparkles size={15} />
          {`AI review selected (${selectedEligibleCount})`}
        </button>
        <button
          type="button"
          disabled={aiReviewProcessing}
          onClick={() => onAiReview(Number(aiLimit))}
          title="Use paid OpenAI web search on unresolved rows"
          className="inline-flex items-center gap-2"
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            background: 'transparent',
            border: '1px solid var(--border-control)',
            borderRadius: '6px',
            height: '34px',
            padding: '0 12px',
            cursor: aiReviewProcessing ? 'wait' : 'pointer',
          }}
        >
          <Sparkles size={15} />
          {aiReview?.status === "processing"
            ? `AI ${aiReview.completed}/${aiReview.total}`
            : aiReview?.status === "error"
              ? "Retry AI failed"
            : "AI review unresolved"}
        </button>
        {aiReview?.status === "complete" && (
          <span style={selectTextStyle}>AI updated {aiReview.updated}</span>
        )}
        {aiReview?.status === "error" && (
          <span style={{ ...selectTextStyle, color: 'var(--danger-text)' }} title={aiReview.error}>AI failed</span>
        )}
        <button
          onClick={onReset}
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: '13px',
            fontWeight: 400,
            color: 'var(--text-secondary)',
            background: 'transparent',
            border: '1px solid var(--border-control)',
            borderRadius: '6px',
            height: '34px',
            padding: '0 12px',
            cursor: 'pointer',
          }}
        >
          Upload another file
        </button>
        <a href={csvHref ?? undefined} download="tsi-cleanup-export.csv" style={{ textDecoration: 'none' }}>
          <button
            disabled={csvHref === null}
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--primary-foreground)',
              backgroundColor: 'var(--primary)',
              border: 'none',
              borderRadius: '6px',
              height: '34px',
              padding: '0 16px',
              cursor: csvHref === null ? 'not-allowed' : 'pointer',
              opacity: csvHref === null ? 0.7 : 1,
              transition: 'background-color 150ms ease-out',
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = 'var(--primary-hover)';
            }}
            onMouseLeave={(e) => {
              if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = 'var(--primary)';
            }}
          >
            Download CSV
          </button>
        </a>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2"
              style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                background: 'transparent',
                border: '1px solid var(--border-control)',
                borderRadius: '6px',
                height: '34px',
                padding: '0 12px',
                cursor: 'pointer',
              }}
            >
              <Download size={14} />
              Export
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild style={selectTextStyle}>
              <a href={exportHrefs.reviewed ?? undefined} download="tsi-cleanup-reviewed.csv">Reviewed only</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild style={selectTextStyle}>
              <a href={exportHrefs.unresolved ?? undefined} download="tsi-cleanup-unresolved.csv">Unresolved only</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild style={selectTextStyle}>
              <a href={exportHrefs.aiWrong ?? undefined} download="tsi-cleanup-ai-wrong.csv">AI wrong only</a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
