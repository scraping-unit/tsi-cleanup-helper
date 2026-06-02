import { flexRender, type Table } from "@tanstack/react-table";
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

interface ResultsTableProps {
  table: Table<DisplayRow>;
}

export function ResultsTable({ table }: ResultsTableProps) {
  const rows = table.getRowModel().rows;
  const headers = table.getVisibleLeafColumns();

  return (
    <UITable
      containerClassName="h-full"
    >
      <TableHeader
        className="sticky top-0 z-10"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        {table.getHeaderGroups().map((hg) => (
          <TableRow
            key={hg.id}
            className="border-0"
            style={{ borderBottom: '1px solid rgb(238 97 44 / 0.12)' }}
          >
            {hg.headers.map((header) => (
              <TableHead
                key={header.id}
                className={cn(
                  "whitespace-nowrap h-10 px-3",
                  header.column.getCanSort() && "cursor-pointer select-none",
                )}
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontWeight: 600,
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: '#6B4230',
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
              style={{ fontFamily: 'Outfit, sans-serif', fontSize: '14px', color: '#6B4230' }}
            >
              No rows match the current filters.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row, i) => (
            <TableRow
              key={row.id}
              data-state={row.getIsSelected() ? "selected" : undefined}
              className="border-0"
              style={{
                backgroundColor: row.getIsSelected()
                  ? '#FFF4DF'
                  : row.original._kind === "error"
                  ? '#FDECEA'
                  : i % 2 === 0 ? '#FFFFFF' : '#FFF9F0',
                transition: 'background-color 0ms',
              }}
              onMouseEnter={(e) => {
                if (row.original._kind !== "error" && !row.getIsSelected()) {
                  (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#FFF4DF';
                }
              }}
              onMouseLeave={(e) => {
                if (row.original._kind !== "error" && !row.getIsSelected()) {
                  (e.currentTarget as HTMLTableRowElement).style.backgroundColor = i % 2 === 0 ? '#FFFFFF' : '#FFF9F0';
                }
              }}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="py-0 px-3" style={{ height: '40px' }}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </UITable>
  );
}
