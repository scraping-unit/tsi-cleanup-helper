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
    <div className="border rounded-md overflow-auto">
      <UITable>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    "whitespace-nowrap text-xs",
                    header.column.getCanSort() &&
                      "cursor-pointer select-none hover:bg-muted/40",
                  )}
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
            <TableRow>
              <TableCell
                colSpan={headers.length}
                className="h-24 text-center text-muted-foreground text-sm"
              >
                No rows match the current filters.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(
                  row.original._kind === "error" && "bg-red-50/50",
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="text-xs py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </UITable>
    </div>
  );
}
