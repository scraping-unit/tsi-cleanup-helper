import type { Table } from "@tanstack/react-table";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CONFIDENCE_VALUES } from "../types";
import { REVIEWER_ACTIONS } from "../lib/toDisplayRows";
import type { DisplayRow } from "../lib/toDisplayRows";

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
};

const HIDDEN_TOGGLEABLE_COLUMNS = [
  "menuId",
  "detectedPlatform",
  "deliverooVerified",
  "recommendedStatus",
  "recommendationReason",
  "candidateNewUrl",
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
  csvHref: string;
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
  onReset,
}: TableToolbarProps) {
  const actionCol = table.getColumn("reviewerAction");
  const confidenceCol = table.getColumn("confidence");
  const urlResultCol = table.getColumn("currentUrlResult");

  const actionValue =
    (actionCol?.getFilterValue() as string | undefined) ?? "";
  const confidenceValue =
    (confidenceCol?.getFilterValue() as string | undefined) ?? "";
  const urlResultValue =
    (urlResultCol?.getFilterValue() as string | undefined) ?? "";

  const hasFilters =
    globalFilter !== "" ||
    actionValue !== "" ||
    confidenceValue !== "" ||
    urlResultValue !== "";

  function clearFilters() {
    onGlobalFilterChange("");
    actionCol?.setFilterValue(undefined);
    confidenceCol?.setFilterValue(undefined);
    urlResultCol?.setFilterValue(undefined);
  }

  const toggleableColumns = HIDDEN_TOGGLEABLE_COLUMNS.map((id) =>
    table.getColumn(id),
  ).filter(Boolean);

  return (
    <div
      className="flex flex-wrap items-center gap-2 px-4"
      style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid rgb(238 97 44 / 0.12)',
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: '13px',
              fontWeight: 400,
              color: '#6B4230',
              background: 'transparent',
              border: '1px solid rgb(238 97 44 / 0.2)',
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
            color: '#6B4230',
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
        <button
          onClick={onReset}
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: '13px',
            fontWeight: 400,
            color: '#6B4230',
            background: 'transparent',
            border: '1px solid rgb(238 97 44 / 0.2)',
            borderRadius: '6px',
            height: '34px',
            padding: '0 12px',
            cursor: 'pointer',
          }}
        >
          Upload another file
        </button>
        <a href={csvHref} download="tsi-cleanup-export.csv" style={{ textDecoration: 'none' }}>
          <button
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: '13px',
              fontWeight: 500,
              color: '#FFFFFF',
              backgroundColor: '#EE612C',
              border: 'none',
              borderRadius: '6px',
              height: '34px',
              padding: '0 16px',
              cursor: 'pointer',
              transition: 'background-color 150ms ease-out',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#D4521E'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#EE612C'; }}
          >
            Download CSV
          </button>
        </a>
      </div>
    </div>
  );
}
