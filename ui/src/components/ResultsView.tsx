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
import { cn } from "@/lib/utils";
import type { BatchProcessResult, CsvRowError } from "../types";
import { toDisplayRows, type DisplayRow } from "../lib/toDisplayRows";
import { StatusBadge } from "./StatusBadge";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { ImportErrorBanner } from "./ImportErrorBanner";
import { SummaryBar } from "./SummaryBar";
import { TableToolbar } from "./TableToolbar";
import { ResultsTable } from "./ResultsTable";

const col = createColumnHelper<DisplayRow>();

const COLUMNS = [
  col.accessor("brandName", {
    header: "Brand",
    enableSorting: true,
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  col.accessor("menuId", {
    header: "Menu ID",
    enableSorting: false,
  }),
  col.accessor("currentMenuUrl", {
    header: "Menu URL",
    enableSorting: false,
    cell: (info) => (
      <a
        href={info.getValue()}
        target="_blank"
        rel="noreferrer"
        className="max-w-[200px] truncate block text-blue-600 hover:underline"
        title={info.getValue()}
      >
        {info.getValue()}
      </a>
    ),
  }),
  col.accessor("currentUrlResult", {
    header: "URL Result",
    enableSorting: true,
  }),
  col.accessor("httpStatus", {
    header: "HTTP",
    enableSorting: true,
    cell: (info) => info.getValue() ?? "—",
  }),
  col.accessor("detectedPlatform", {
    header: "Platform",
    enableSorting: true,
    cell: (info) => info.getValue() ?? "—",
  }),
  col.accessor("recommendedStatus", {
    header: "Recommended",
    enableSorting: true,
    cell: (info) => {
      const row = info.row.original;
      if (row._kind === "error") return null;
      return <StatusBadge status={info.getValue()} />;
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
  col.accessor("recommendationReason", {
    header: "Reason",
    enableSorting: false,
    cell: (info) => {
      const row = info.row.original;
      if (row._kind === "error") {
        return (
          <span className="italic text-red-500 text-xs">{row._error}</span>
        );
      }
      return <span className="text-muted-foreground">{info.getValue()}</span>;
    },
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
          className="max-w-[200px] truncate block text-blue-600 hover:underline"
          title={val}
        >
          {val}
        </a>
      );
    },
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
    <div className={cn("px-4 pb-8")}>
      {importErrors.length > 0 && (
        <div className="mt-4">
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
      <ResultsTable table={table} />
    </div>
  );
}
