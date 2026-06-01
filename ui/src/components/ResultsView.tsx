import { useEffect, useMemo, useState } from "react";
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { ChevronRight } from "lucide-react";
import type { BatchProcessResult, CsvRowError } from "../types";
import { toDisplayRows, type DisplayRow } from "../lib/toDisplayRows";
import { StatusBadge } from "./StatusBadge";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { ImportErrorBanner } from "./ImportErrorBanner";
import { SummaryBar } from "./SummaryBar";
import { TableToolbar } from "./TableToolbar";
import { ResultsTable } from "./ResultsTable";

const col = createColumnHelper<DisplayRow>();

const urlCellStyle: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '12px',
  color: '#1A120B',
  display: 'block',
  maxWidth: '220px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  textDecoration: 'none',
};

const URL_HEALTH_STYLES: Record<DisplayRow["urlHealth"], { color: string; label: string }> = {
  accessible: { color: '#2D7A4F', label: 'accessible' },
  dead: { color: '#B83030', label: 'dead' },
  unverifiable: { color: '#A05C00', label: 'unverifiable' },
};

const COLUMNS = [
  col.accessor("currentMenuUrl", {
    header: "URL",
    enableSorting: false,
    cell: (info) => (
      <a
        href={info.getValue()}
        target="_blank"
        rel="noreferrer"
        style={urlCellStyle}
        title={info.getValue()}
      >
        {info.getValue()}
      </a>
    ),
  }),
  col.accessor("currentUrlResult", {
    header: "Status",
    enableSorting: true,
    cell: (info) => {
      const { color, label } = URL_HEALTH_STYLES[info.row.original.urlHealth];
      return (
        <span className="inline-flex items-center gap-2">
          <span
            role="img"
            aria-label={`URL health: ${label}`}
            title={`URL health: ${label}`}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '999px',
              backgroundColor: color,
              flex: '0 0 auto',
            }}
          />
          <span>{info.getValue()}</span>
        </span>
      );
    },
  }),
  col.accessor("httpStatus", {
    header: "HTTP",
    enableSorting: true,
    cell: (info) => (
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>
        {info.getValue() ?? "—"}
      </span>
    ),
  }),
  col.accessor("reviewerAction", {
    header: "Recommendation",
    enableSorting: true,
    cell: (info) => {
      const row = info.row.original;
      if (row._kind === "error") return null;
      return <StatusBadge action={info.getValue()} />;
    },
  }),
  col.accessor("confidence", {
    header: "Confidence",
    enableSorting: true,
    cell: (info) => {
      const row = info.row.original;
      if (row._kind === "error") return null;
      return <ConfidenceBadge confidence={info.getValue()} />;
    },
  }),
  col.display({
    id: "action",
    header: "",
    cell: () => (
      <button
        type="button"
        className="flex items-center justify-center"
        style={{
          width: '24px',
          height: '24px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: '#6B4230',
          transition: 'color 150ms ease-out',
          padding: 0,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#EE612C'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#6B4230'; }}
        onClick={() => {}}
        aria-label="View details"
      >
        <ChevronRight size={16} />
      </button>
    ),
  }),
  col.accessor("brandName", {
    header: "Brand",
    enableSorting: true,
    cell: (info) => (
      <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '13px', fontWeight: 500 }}>
        {info.getValue()}
      </span>
    ),
  }),
  col.accessor("menuId", {
    header: "Menu ID",
    enableSorting: false,
  }),
  col.accessor("recommendationReason", {
    header: "Reason",
    enableSorting: false,
    cell: (info) => {
      const row = info.row.original;
      if (row._kind === "error") {
        return (
          <span style={{ fontStyle: 'italic', color: '#B83030', fontSize: '12px' }}>
            {row._error}
          </span>
        );
      }
      return (
        <span style={{ color: '#6B4230', fontSize: '12px' }}>{info.getValue()}</span>
      );
    },
  }),
  col.accessor("recommendedStatus", {
    header: "Cleanup Status",
    enableSorting: true,
  }),
  col.accessor("candidateNewUrl", {
    header: "New URL",
    enableSorting: false,
    cell: (info) => {
      const val = info.getValue();
      if (!val) return "—";
      return (
        <a
          href={val}
          target="_blank"
          rel="noreferrer"
          style={{ ...urlCellStyle, color: '#EE612C' }}
          title={val}
        >
          {val}
        </a>
      );
    },
  }),
  col.accessor("detectedPlatform", {
    header: "Platform",
    enableSorting: true,
    cell: (info) => info.getValue() ?? "—",
  }),
  col.accessor("deliverooVerified", {
    header: "Deliveroo State",
    enableSorting: true,
    cell: (info) => info.getValue() ?? "—",
  }),
  col.accessor("brandId", { header: "Brand ID", enableSorting: false }),
  col.accessor("clusterId", { header: "Cluster ID", enableSorting: false }),
  col.accessor("templateName", { header: "Template", enableSorting: false }),
  col.accessor("scrapingStatus", {
    header: "Scraping Status",
    enableSorting: false,
  }),
  col.accessor("finalUrl", {
    header: "Final URL",
    enableSorting: false,
    cell: (info) => info.getValue() ?? "—",
  }),
  col.accessor("candidateSource", {
    header: "Candidate Source",
    enableSorting: false,
    cell: (info) => info.getValue() ?? "—",
  }),
  col.accessor("formatDetected", {
    header: "Format Detected",
    enableSorting: false,
    cell: (info) => info.getValue() ?? "—",
  }),
  col.accessor("menuContentDetected", {
    header: "Content Detected",
    enableSorting: false,
    cell: (info) => String(info.getValue()),
  }),
  col.accessor("brandMatch", {
    header: "Brand Match",
    enableSorting: false,
    cell: (info) => String(info.getValue()),
  }),
  col.accessor("needsEscalation", {
    header: "Escalation",
    enableSorting: false,
    cell: (info) => (info.getValue() ? "Yes" : "No"),
  }),
  col.accessor("escalationReason", {
    header: "Escalation Reason",
    enableSorting: false,
    cell: (info) => info.getValue() ?? "—",
  }),
  col.accessor("humanFinalStatus", {
    header: "Human Status",
    enableSorting: false,
    cell: (info) => info.getValue() ?? "—",
  }),
  col.accessor("humanComment", {
    header: "Human Comment",
    enableSorting: false,
    cell: (info) => info.getValue() ?? "—",
  }),
];

const DEFAULT_HIDDEN: VisibilityState = {
  menuId: false,
  recommendedStatus: false,
  recommendationReason: false,
  candidateNewUrl: false,
  detectedPlatform: false,
  deliverooVerified: false,
  brandId: false,
  clusterId: false,
  templateName: false,
  scrapingStatus: false,
  finalUrl: false,
  candidateSource: false,
  formatDetected: false,
  menuContentDetected: false,
  brandMatch: false,
  needsEscalation: false,
  escalationReason: false,
  humanFinalStatus: false,
  humanComment: false,
};

interface ResultsViewProps {
  result: BatchProcessResult;
  csv: string;
  importErrors: CsvRowError[];
  onReset: () => void;
}

export function ResultsView({
  result,
  csv,
  importErrors,
  onReset,
}: ResultsViewProps) {
  const displayRows = useMemo(() => toDisplayRows(result.results), [result]);

  const csvHref = useMemo(
    () => URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
    [csv],
  );
  useEffect(() => () => URL.revokeObjectURL(csvHref), [csvHref]);

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] =
    useState<VisibilityState>(DEFAULT_HIDDEN);
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: displayRows,
    columns: COLUMNS,
    state: { columnFilters, globalFilter, columnVisibility, sorting },
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: (row, _colId, value: string) => {
      const v = value.toLowerCase();
      return (
        row.original.brandName.toLowerCase().includes(v) ||
        row.original.currentMenuUrl.toLowerCase().includes(v)
      );
    },
  });

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {importErrors.length > 0 && (
        <div className="px-4 pt-3">
          <ImportErrorBanner errors={importErrors} />
        </div>
      )}
      <SummaryBar summary={result.summary} />
      <TableToolbar
        table={table}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        csvHref={csvHref}
        onReset={onReset}
      />
      <div className="flex-1 overflow-hidden">
        <ResultsTable table={table} />
      </div>
    </div>
  );
}
