import { useEffect, useMemo, useState } from "react";
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { ChevronRight } from "lucide-react";
import type { AiReviewProgress, BatchProcessResult, CsvRowError } from "../types";
import { toDisplayRows, type DisplayRow } from "../lib/toDisplayRows";
import { StatusBadge } from "./StatusBadge";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { ImportErrorBanner } from "./ImportErrorBanner";
import { SummaryBar } from "./SummaryBar";
import { TableToolbar } from "./TableToolbar";
import { ResultsTable } from "./ResultsTable";
import { AiReviewPanel } from "./AiReviewPanel";

const col = createColumnHelper<DisplayRow>();

export type TableDensity = "comfortable" | "compact";
export type ReviewDecision = "accepted" | "rejected";
export type RowReviewState = {
  decision: ReviewDecision;
  updatedAt: string;
};
export type RowReviewMap = Record<string, RowReviewState>;
export type CsvExportHrefs = {
  reviewed: string | null;
  unresolved: string | null;
  aiWrong: string | null;
};

export type ResultsTableMeta = {
  activeRowKey: string | null;
  rowReviews: RowReviewMap;
  onOpenRow: (row: DisplayRow) => void;
};

type PersistedResultsViewState = {
  columnFilters?: ColumnFiltersState;
  globalFilter?: string;
  columnVisibility?: VisibilityState;
  sorting?: SortingState;
  density?: TableDensity;
  rowReviews?: RowReviewMap;
};

export function getRowKey(row: DisplayRow): string {
  return `${row.menuId || "unknown"}::${row.currentMenuUrl || "missing"}`;
}

const urlCellStyle: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '12px',
  color: 'var(--text-primary)',
  display: 'block',
  maxWidth: '220px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  textDecoration: 'none',
};

const URL_HEALTH_STYLES: Record<DisplayRow["urlHealth"], { color: string; label: string }> = {
  accessible: { color: 'var(--success-text)', label: 'accessible' },
  dead: { color: 'var(--danger-text)', label: 'dead' },
  unverifiable: { color: 'var(--warning-text)', label: 'unverifiable' },
};

const COLUMNS = [
  col.display({
    id: "select",
    enableSorting: false,
    header: ({ table }) => <HeaderSelectCheckbox table={table} />,
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onChange={row.getToggleSelectedHandler()}
        onClick={(event) => event.stopPropagation()}
        aria-label={`Select row ${row.original.menuId}`}
        style={selectionCheckboxStyle}
      />
    ),
  }),
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
    cell: (info) => (
      <button
        type="button"
        className="flex items-center justify-center"
        style={{
          width: '24px',
          height: '24px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          transition: 'color 150ms ease-out',
          padding: 0,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--primary)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
        onClick={(event) => {
          event.stopPropagation();
          const meta = info.table.options.meta as ResultsTableMeta | undefined;
          meta?.onOpenRow(info.row.original);
        }}
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
          <span style={{ fontStyle: 'italic', color: 'var(--danger-text)', fontSize: '12px' }}>
            {row._error}
          </span>
        );
      }
      return (
        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{info.getValue()}</span>
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
          style={{ ...urlCellStyle, color: 'var(--primary)' }}
          title={val}
        >
          {val}
        </a>
      );
    },
  }),
  col.accessor("aiRecommendedAction", {
    header: "AI Action",
    enableSorting: true,
    cell: (info) => info.getValue() ?? "—",
  }),
  col.accessor("aiConfidence", {
    header: "AI Confidence",
    enableSorting: true,
    cell: (info) => info.getValue() ?? "—",
  }),
  col.accessor("aiConfidencePercentage", {
    header: "AI Confidence %",
    enableSorting: true,
    cell: (info) => info.getValue() === undefined ? "—" : `${info.getValue()}%`,
  }),
  col.accessor("aiUrlStillAccessible", {
    header: "AI URL Accessible",
    enableSorting: true,
    cell: (info) => info.getValue() === undefined ? "—" : String(info.getValue()),
  }),
  col.accessor("aiMenuStillAvailable", {
    header: "AI Menu Available",
    enableSorting: true,
    cell: (info) => info.getValue() === undefined ? "—" : String(info.getValue()),
  }),
  col.accessor("aiCandidateUrl", {
    header: "AI Candidate URL",
    enableSorting: false,
    cell: (info) => {
      const val = info.getValue();
      if (!val) return "—";
      return (
        <a href={val} target="_blank" rel="noreferrer" style={{ ...urlCellStyle, color: 'var(--primary)' }} title={val}>
          {val}
        </a>
      );
    },
  }),
  col.accessor("aiReason", {
    header: "AI Reason",
    enableSorting: false,
    cell: (info) => info.getValue() ?? "—",
  }),
  col.accessor("aiTargetClusterHint", {
    header: "AI Cluster Hint",
    enableSorting: false,
    cell: (info) => info.getValue() ?? "—",
  }),
  col.accessor("aiEvidenceUrls", {
    header: "AI Evidence URLs",
    enableSorting: false,
    cell: (info) => info.getValue()?.join(" | ") ?? "—",
  }),
  col.accessor("aiError", {
    header: "AI Error",
    enableSorting: false,
    cell: (info) => info.getValue() ?? "—",
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
  aiConfidence: false,
  aiUrlStillAccessible: false,
  aiMenuStillAvailable: false,
  aiReason: false,
  aiTargetClusterHint: false,
  aiEvidenceUrls: false,
  aiError: false,
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
  aiReview?: AiReviewProgress;
  persistenceKey: string;
  onAiReview: (limit: number) => void;
  onAiReviewSelected: (rowIndexes: number[]) => void;
  onReset: () => void;
}

export function ResultsView({
  result,
  csv,
  importErrors,
  aiReview,
  persistenceKey,
  onAiReview,
  onAiReviewSelected,
  onReset,
}: ResultsViewProps) {
  const displayRows = useMemo(() => toDisplayRows(result.results), [result]);
  const [csvHref, setCsvHref] = useState<string | null>(null);
  const persisted = useMemo(
    () => loadPersistedResultsViewState(persistenceKey),
    [persistenceKey],
  );

  useEffect(() => {
    const objectUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    setCsvHref(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [csv]);

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
    persisted.columnFilters ?? [],
  );
  const [globalFilter, setGlobalFilter] = useState(persisted.globalFilter ?? "");
  const [columnVisibility, setColumnVisibility] =
    useState<VisibilityState>({ ...DEFAULT_HIDDEN, ...(persisted.columnVisibility ?? {}) });
  const [sorting, setSorting] = useState<SortingState>(persisted.sorting ?? []);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [density, setDensity] = useState<TableDensity>(persisted.density ?? "comfortable");
  const [rowReviews, setRowReviews] = useState<RowReviewMap>(persisted.rowReviews ?? {});
  const [activeRowKey, setActiveRowKey] = useState<string | null>(displayRows[0] ? getRowKey(displayRows[0]) : null);

  const table = useReactTable({
    data: displayRows,
    columns: COLUMNS,
    state: { columnFilters, globalFilter, columnVisibility, sorting, rowSelection },
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => String(row.sourceIndex),
    enableRowSelection: (row) => row.original._kind === "success",
    meta: {
      activeRowKey,
      rowReviews,
      onOpenRow: (row: DisplayRow) => setActiveRowKey(getRowKey(row)),
    } satisfies ResultsTableMeta,
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

  const activeRow = useMemo(
    () => displayRows.find((row) => getRowKey(row) === activeRowKey) ?? displayRows[0],
    [activeRowKey, displayRows],
  );
  const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);
  const exportHrefs = useCsvExports(displayRows, rowReviews);

  useEffect(() => {
    savePersistedResultsViewState(persistenceKey, {
      columnFilters,
      globalFilter,
      columnVisibility,
      sorting,
      density,
      rowReviews,
    });
  }, [columnFilters, columnVisibility, density, globalFilter, persistenceKey, rowReviews, sorting]);

  function toggleVisibleRows(selected: boolean) {
    setRowSelection((current) => {
      const next = { ...current };
      for (const row of table.getRowModel().rows) {
        if (!row.getCanSelect()) continue;
        if (selected) next[row.id] = true;
        else delete next[row.id];
      }
      return next;
    });
  }

  function selectRowsBy(predicate: (row: DisplayRow) => boolean) {
    const next: RowSelectionState = {};
    for (const row of table.getFilteredRowModel().rows) {
      if (row.getCanSelect() && predicate(row.original)) next[row.id] = true;
    }
    setRowSelection(next);
  }

  function markRowsReviewed(rows: DisplayRow[], decision: ReviewDecision) {
    const updatedAt = new Date().toISOString();
    setRowReviews((current) => {
      const next = { ...current };
      for (const row of rows) {
        next[getRowKey(row)] = { decision, updatedAt };
      }
      return next;
    });
  }

  function markRowReviewed(row: DisplayRow, decision: ReviewDecision) {
    markRowsReviewed([row], decision);
  }

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
        exportHrefs={exportHrefs}
        aiReview={aiReview}
        density={density}
        selectedCount={selectedRows.length}
        onDensityChange={setDensity}
        onClearSelection={() => setRowSelection({})}
        onSelectVisible={() => toggleVisibleRows(true)}
        onSelectByUrlHealth={(urlHealth) => selectRowsBy((row) => row.urlHealth === urlHealth)}
        onSelectByAiConfidence={(confidence) => selectRowsBy((row) => row.aiConfidence === confidence)}
        onSelectByPlatform={(platform) => selectRowsBy((row) => row.detectedPlatform === platform)}
        onSelectByStatus={(status) => selectRowsBy((row) => row.reviewerAction === status)}
        onAcceptSelected={() => markRowsReviewed(selectedRows, "accepted")}
        onRejectSelected={() => markRowsReviewed(selectedRows, "rejected")}
        onAiReview={onAiReview}
        onAiReviewSelected={onAiReviewSelected}
        onReset={onReset}
      />
      <AiReviewPanel
        row={activeRow}
        selectedCount={selectedRows.length}
        review={activeRow ? rowReviews[getRowKey(activeRow)] : undefined}
        onAcceptRow={() => activeRow && markRowReviewed(activeRow, "accepted")}
        onRejectRow={() => activeRow && markRowReviewed(activeRow, "rejected")}
        onAcceptSelected={() => markRowsReviewed(selectedRows, "accepted")}
        onRejectSelected={() => markRowsReviewed(selectedRows, "rejected")}
      />
      <div className="flex-1 overflow-hidden">
        <ResultsTable table={table} density={density} />
      </div>
    </div>
  );
}

const selectionCheckboxStyle: React.CSSProperties = {
  width: '14px',
  height: '14px',
  accentColor: 'var(--primary)',
  cursor: 'pointer',
};

function HeaderSelectCheckbox({ table }: { table: ReturnType<typeof useReactTable<DisplayRow>> }) {
  const selectableRows = table
    .getFilteredRowModel()
    .rows
    .filter((row) => row.getCanSelect());
  const selectedCount = selectableRows.filter((row) => row.getIsSelected()).length;
  const checked = selectableRows.length > 0 && selectedCount === selectableRows.length;
  const indeterminate = selectedCount > 0 && selectedCount < selectableRows.length;

  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={selectableRows.length === 0}
      ref={(node) => {
        if (node) node.indeterminate = indeterminate;
      }}
      onChange={(event) => {
        for (const row of selectableRows) {
          row.toggleSelected(event.currentTarget.checked);
        }
      }}
      aria-label="Select all visible rows"
      style={selectionCheckboxStyle}
    />
  );
}

function useCsvExports(rows: DisplayRow[], rowReviews: RowReviewMap): CsvExportHrefs {
  const [hrefs, setHrefs] = useState<CsvExportHrefs>({
    reviewed: null,
    unresolved: null,
    aiWrong: null,
  });

  useEffect(() => {
    const exports = {
      reviewed: URL.createObjectURL(new Blob([
        rowsToCsv(rows.filter((row) => Boolean(rowReviews[getRowKey(row)])), rowReviews),
      ], { type: "text/csv" })),
      unresolved: URL.createObjectURL(new Blob([
        rowsToCsv(rows.filter((row) => isUnresolved(row, rowReviews)), rowReviews),
      ], { type: "text/csv" })),
      aiWrong: URL.createObjectURL(new Blob([
        rowsToCsv(rows.filter((row) => rowReviews[getRowKey(row)]?.decision === "rejected" && hasAiReview(row)), rowReviews),
      ], { type: "text/csv" })),
    };

    setHrefs(exports);
    return () => {
      URL.revokeObjectURL(exports.reviewed);
      URL.revokeObjectURL(exports.unresolved);
      URL.revokeObjectURL(exports.aiWrong);
    };
  }, [rowReviews, rows]);

  return hrefs;
}

function isUnresolved(row: DisplayRow, rowReviews: RowReviewMap): boolean {
  if (rowReviews[getRowKey(row)]) return false;
  return (
    row._kind === "error" ||
    row.reviewerAction === "Check manually" ||
    row.urlHealth !== "accessible" ||
    row.aiRecommendedAction === "manual_review" ||
    Boolean(row.aiError)
  );
}

function hasAiReview(row: DisplayRow): boolean {
  return Boolean(
    row.aiRecommendedAction ||
    row.aiReason ||
    row.aiCandidateUrl ||
    row.aiEvidenceUrls?.length ||
    row.aiConfidencePercentage !== undefined ||
    row.aiError,
  );
}

function rowsToCsv(rows: DisplayRow[], rowReviews: RowReviewMap): string {
  const headers = [
    "menu_id",
    "brand_name",
    "current_menu_url",
    "url_result",
    "http_status",
    "platform",
    "recommendation",
    "confidence",
    "ai_action",
    "ai_confidence_percent",
    "ai_candidate_url",
    "ai_reason",
    "ai_evidence_urls",
    "review_decision",
    "review_updated_at",
  ];
  const lines = rows.map((row) => {
    const review = rowReviews[getRowKey(row)];
    return [
      row.menuId,
      row.brandName,
      row.currentMenuUrl,
      row.currentUrlResult,
      row.httpStatus ?? "",
      row.detectedPlatform ?? "",
      row.reviewerAction,
      row.confidence,
      row.aiRecommendedAction ?? "",
      row.aiConfidencePercentage ?? "",
      row.aiCandidateUrl ?? "",
      row.aiReason ?? row.aiError ?? "",
      row.aiEvidenceUrls?.join(" | ") ?? "",
      review?.decision ?? "",
      review?.updatedAt ?? "",
    ].map(serializeCsvCell).join(",");
  });
  return [headers.join(","), ...lines].join("\r\n");
}

function serializeCsvCell(value: unknown): string {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function loadPersistedResultsViewState(key: string): PersistedResultsViewState {
  const value = localStorage.getItem(key);
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as PersistedResultsViewState;
    return {
      ...parsed,
      columnVisibility: { ...DEFAULT_HIDDEN, ...(parsed.columnVisibility ?? {}) },
      density: parsed.density === "compact" ? "compact" : "comfortable",
      rowReviews: parsed.rowReviews ?? {},
    };
  } catch {
    localStorage.removeItem(key);
    return {};
  }
}

function savePersistedResultsViewState(key: string, state: PersistedResultsViewState): void {
  localStorage.setItem(key, JSON.stringify(state));
}
