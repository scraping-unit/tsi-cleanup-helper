import type { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
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
import { CLEANUP_STATUSES, CONFIDENCE_VALUES } from "../types";
import type { DisplayRow } from "../lib/toDisplayRows";

const URL_RESULT_VALUES = [
  "not_checked",
  "valid",
  "inaccessible",
  "redirected",
  "invalid",
  "unknown",
] as const;

const HIDDEN_TOGGLEABLE_COLUMNS = [
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

export function TableToolbar({
  table,
  globalFilter,
  onGlobalFilterChange,
  csvHref,
  onReset,
}: TableToolbarProps) {
  const statusCol = table.getColumn("recommendedStatus");
  const confidenceCol = table.getColumn("confidence");
  const urlResultCol = table.getColumn("currentUrlResult");

  const statusValue =
    (statusCol?.getFilterValue() as string | undefined) ?? "";
  const confidenceValue =
    (confidenceCol?.getFilterValue() as string | undefined) ?? "";
  const urlResultValue =
    (urlResultCol?.getFilterValue() as string | undefined) ?? "";

  const hasFilters =
    globalFilter !== "" ||
    statusValue !== "" ||
    confidenceValue !== "" ||
    urlResultValue !== "";

  function clearFilters() {
    onGlobalFilterChange("");
    statusCol?.setFilterValue(undefined);
    confidenceCol?.setFilterValue(undefined);
    urlResultCol?.setFilterValue(undefined);
  }

  const toggleableColumns = HIDDEN_TOGGLEABLE_COLUMNS.map((id) =>
    table.getColumn(id),
  ).filter(Boolean);

  return (
    <div className="flex flex-wrap items-center gap-2 py-3">
      <Input
        placeholder="Search brand or URL…"
        value={globalFilter}
        onChange={(e) => onGlobalFilterChange(e.target.value)}
        className="h-8 w-48 text-xs"
      />

      <Select
        value={statusValue || "all"}
        onValueChange={(v) =>
          statusCol?.setFilterValue(v === "all" ? undefined : v)
        }
      >
        <SelectTrigger className="h-8 w-44 text-xs">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {CLEANUP_STATUSES.map((s) => (
            <SelectItem key={s} value={s} className="text-xs">
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
        <SelectTrigger className="h-8 w-32 text-xs">
          <SelectValue placeholder="Confidence" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All confidence</SelectItem>
          {CONFIDENCE_VALUES.map((c) => (
            <SelectItem key={c} value={c} className="text-xs">
              {c}
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
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue placeholder="URL result" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All URL results</SelectItem>
          {URL_RESULT_VALUES.map((r) => (
            <SelectItem key={r} value={r} className="text-xs">
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs">
            Columns
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {toggleableColumns.map((col) => {
            if (!col) return null;
            return (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={col.getIsVisible()}
                onCheckedChange={(v) => col.toggleVisibility(v)}
                className="text-xs"
              >
                {col.id}
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={clearFilters}
        >
          Clear filters
        </Button>
      )}

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={onReset}
        >
          Upload another file
        </Button>
        <a href={csvHref} download="tsi-cleanup-export.csv">
          <Button size="sm" className="h-8 text-xs">
            Download CSV
          </Button>
        </a>
      </div>
    </div>
  );
}
