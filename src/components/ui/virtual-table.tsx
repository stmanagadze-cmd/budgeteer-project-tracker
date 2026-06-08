import { useRef, useState, useMemo, ReactNode, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDir = "asc" | "desc";

export interface VirtualTableColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => string | number | Date | null | undefined;
  className?: string;
  headerClassName?: string;
  /** CSS grid-template-columns fragment, e.g. "120px" or "minmax(0,1fr)" */
  width?: string;
}

interface VirtualTableProps<T> {
  rows: T[];
  columns: VirtualTableColumn<T>[];
  rowKey: (row: T) => string;
  rowHeight?: number;
  /** Max height of the scrollable body in px */
  maxBodyHeight?: number;
  getRowClassName?: (row: T) => string;
  empty?: ReactNode;
  defaultSort?: { id: string; dir: SortDir };
}

export function VirtualTable<T>({
  rows,
  columns,
  rowKey,
  rowHeight = 56,
  maxBodyHeight = 520,
  getRowClassName,
  empty,
  defaultSort,
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useState<{ id: string; dir: SortDir } | null>(defaultSort ?? null);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.id === sort.id);
    if (!col?.sortValue) return rows;
    const arr = [...rows];
    arr.sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      const aNil = av === null || av === undefined;
      const bNil = bv === null || bv === undefined;
      if (aNil && bNil) return 0;
      if (aNil) return 1;
      if (bNil) return -1;
      let cmp = 0;
      if (av instanceof Date && bv instanceof Date) cmp = av.getTime() - bv.getTime();
      else if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [rows, columns, sort]);

  const rowVirtualizer = useVirtualizer({
    count: sortedRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  useEffect(() => {
    // Reset scroll when rows shrink dramatically
    if (parentRef.current && sortedRows.length === 0) parentRef.current.scrollTop = 0;
  }, [sortedRows.length]);

  const toggleSort = (id: string) => {
    setSort((prev) => {
      if (!prev || prev.id !== id) return { id, dir: "asc" };
      if (prev.dir === "asc") return { id, dir: "desc" };
      return null;
    });
  };

  const gridTemplate = columns.map((c) => c.width ?? "minmax(0, 1fr)").join(" ");
  const bodyHeight = Math.min(maxBodyHeight, Math.max(rowHeight, rowVirtualizer.getTotalSize()));

  return (
    <div className="rounded-md border overflow-hidden">
      <div
        className="grid border-b bg-muted/50 text-xs font-medium text-muted-foreground"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        {columns.map((col) => {
          const isSorted = sort?.id === col.id;
          return (
            <div
              key={col.id}
              className={cn(
                "px-3 py-2.5 flex items-center gap-1.5",
                col.headerClassName,
                col.sortable && "cursor-pointer hover:text-foreground select-none",
              )}
              onClick={col.sortable ? () => toggleSort(col.id) : undefined}
            >
              <span className="truncate">{col.header}</span>
              {col.sortable &&
                (isSorted ? (
                  sort!.dir === "asc" ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )
                ) : (
                  <ArrowUpDown className="h-3 w-3 opacity-40" />
                ))}
            </div>
          );
        })}
      </div>
      {sortedRows.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">{empty ?? "No entries"}</div>
      ) : (
        <div ref={parentRef} style={{ height: bodyHeight, overflow: "auto" }}>
          <div
            style={{
              height: rowVirtualizer.getTotalSize(),
              position: "relative",
              width: "100%",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((vRow) => {
              const row = sortedRows[vRow.index];
              return (
                <div
                  key={rowKey(row)}
                  className={cn(
                    "grid border-b text-sm items-center hover:bg-muted/40 absolute left-0 right-0",
                    getRowClassName?.(row),
                  )}
                  style={{
                    gridTemplateColumns: gridTemplate,
                    transform: `translateY(${vRow.start}px)`,
                    height: vRow.size,
                  }}
                >
                  {columns.map((col) => (
                    <div key={col.id} className={cn("px-3 py-2 min-w-0 truncate", col.className)}>
                      {col.cell(row, vRow.index)}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
