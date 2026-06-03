import { flexRender, type Row, type Table } from "@tanstack/react-table";
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { DisplayRow } from "../lib/toDisplayRows";
import type { ResultsTableMeta, TableDensity } from "./ResultsView";

interface ResultsTableProps {
  table: Table<DisplayRow>;
  density: TableDensity;
}

const STICKY_COLUMNS: Record<string, React.CSSProperties> = {
  select: { position: 'sticky', left: 0, width: '42px', minWidth: '42px', maxWidth: '42px' },
  currentMenuUrl: { position: 'sticky', left: '42px', width: '260px', minWidth: '260px', maxWidth: '260px' },
  currentUrlResult: { position: 'sticky', left: '302px', width: '150px', minWidth: '150px', maxWidth: '150px' },
  reviewerAction: { position: 'sticky', left: '452px', width: '160px', minWidth: '160px', maxWidth: '160px' },
  action: { position: 'sticky', right: 0, width: '48px', minWidth: '48px', maxWidth: '48px' },
};

export function ResultsTable({ table, density }: ResultsTableProps) {
  const rows = table.getRowModel().rows;
  const headers = table.getVisibleLeafColumns();
  const meta = table.options.meta as ResultsTableMeta | undefined;
  const rowHeight = density === "compact" ? '32px' : '40px';
  const headerHeight = density === "compact" ? '34px' : '40px';
  const cellPadding = density === "compact" ? "px-2" : "px-3";

  return (
    <UITable
      containerClassName="h-full"
      style={{ minWidth: '1500px' }}
    >
      <TableHeader
        className="sticky top-0 z-10"
        style={{ backgroundColor: 'var(--surface)' }}
      >
        {table.getHeaderGroups().map((hg) => (
          <TableRow
            key={hg.id}
            className="border-0"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            {hg.headers.map((header) => (
              <TableHead
                key={header.id}
                className={cn(
                  "whitespace-nowrap",
                  cellPadding,
                  header.column.getCanSort() && "cursor-pointer select-none",
                )}
                style={{
                  ...getStickyCellStyle(header.column.id, true),
                  height: headerHeight,
                  fontFamily: 'Outfit, sans-serif',
                  fontWeight: 600,
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: 'var(--text-secondary)',
                }}
                onClick={header.column.getToggleSortingHandler()}
              >
                <span className="inline-flex items-center gap-1">
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                  {header.column.getIsSorted() === "asc" && " ↑"}
                  {header.column.getIsSorted() === "desc" && " ↓"}
                </span>
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow className="border-0">
            <TableCell
              colSpan={headers.length}
              className="h-24 text-center"
              style={{ fontFamily: 'Outfit, sans-serif', fontSize: '14px', color: 'var(--text-secondary)' }}
            >
              No rows match the current filters.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row, i) => (
            <TableRowView
              key={row.id}
              row={row}
              index={i}
              rowHeight={rowHeight}
              cellPadding={cellPadding}
              meta={meta}
            />
          ))
        )}
      </TableBody>
    </UITable>
  );
}

function TableRowView({
  row,
  index,
  rowHeight,
  cellPadding,
  meta,
}: {
  row: Row<DisplayRow>;
  index: number;
  rowHeight: string;
  cellPadding: string;
  meta?: ResultsTableMeta;
}) {
  const key = getRowKey(row.original);
  const selected = row.getIsSelected();
  const active = meta?.activeRowKey === key;
  const review = meta?.rowReviews[key];
  const baseBg = getRowBackground(row.original, index, selected, active);

  return (
    <TableRow
      className="border-0"
      style={{
        "--row-bg": baseBg,
        backgroundColor: 'var(--row-bg)',
        boxShadow: getRowInset(active, review?.decision),
        cursor: 'pointer',
      } as React.CSSProperties}
      onClick={() => meta?.onOpenRow(row.original)}
      onMouseEnter={(e) => {
        if (row.original._kind !== "error") {
          e.currentTarget.style.setProperty('--row-bg', 'var(--surface-hover)');
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.setProperty('--row-bg', baseBg);
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          className={cn("py-0", cellPadding)}
          style={{
            ...getStickyCellStyle(cell.column.id),
            height: rowHeight,
            backgroundColor: 'var(--row-bg)',
          }}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}

function getStickyCellStyle(columnId: string, header = false): React.CSSProperties {
  const style = STICKY_COLUMNS[columnId];
  if (!style) return {};
  return {
    ...style,
    backgroundColor: header ? 'var(--surface)' : 'var(--row-bg)',
    boxShadow: columnId === "action"
      ? '-1px 0 0 var(--border-subtle)'
      : '1px 0 0 var(--border-subtle)',
    zIndex: header ? 30 : 20,
  };
}

function getRowBackground(row: DisplayRow, index: number, selected: boolean, active: boolean): string {
  if (row._kind === "error") return 'var(--danger-bg)';
  if (active) return 'var(--surface-active)';
  if (selected) return 'var(--surface-selected)';
  return index % 2 === 0 ? 'var(--surface)' : 'var(--surface-subtle)';
}

function getRowInset(active: boolean, decision?: string): string {
  const side = decision === "accepted"
    ? 'inset 3px 0 0 var(--reviewed-border)'
    : decision === "rejected"
      ? 'inset 3px 0 0 var(--rejected-border)'
      : '';
  const activeRing = active ? 'inset 0 0 0 1px var(--primary)' : '';
  return [side, activeRing].filter(Boolean).join(", ");
}

function getRowKey(row: DisplayRow): string {
  return `${row.menuId || "unknown"}::${row.currentMenuUrl || "missing"}`;
}
