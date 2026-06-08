import { useMemo, useState } from "react";
import { Expense, ExpenseCategory } from "@/types/expense";
import { VirtualTable, VirtualTableColumn } from "@/components/ui/virtual-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ExpensesTableProps {
  expenses: Expense[];
  categories: ExpenseCategory[];
  onDelete: (id: string) => void | Promise<void>;
  onArchiveToggle: (id: string, archived: boolean) => void | Promise<void>;
}

function parseLocalDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, (m || 1) - 1, day || 1);
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export function ExpensesTable({ expenses, categories, onDelete, onArchiveToggle }: ExpensesTableProps) {
  const [showArchived, setShowArchived] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Expense | null>(null);

  const categoryById = useMemo(() => {
    const m = new Map<string, ExpenseCategory>();
    categories.forEach((c) => m.set(c.id, c));
    return m;
  }, [categories]);

  const rows = useMemo(
    () => expenses.filter((e) => (showArchived ? true : !e.archived)),
    [expenses, showArchived],
  );

  const columns: VirtualTableColumn<Expense>[] = useMemo(
    () => [
      {
        id: "description",
        header: "Description",
        sortable: true,
        sortValue: (e) => e.description?.toLowerCase() ?? "",
        cell: (e) => <span className="font-medium truncate">{e.description || "—"}</span>,
        width: "minmax(0, 2fr)",
      },
      {
        id: "amount",
        header: "Amount",
        sortable: true,
        sortValue: (e) => e.amount,
        cell: (e) => <span className="tabular-nums">{fmtCurrency(e.amount)}</span>,
        width: "140px",
        className: "text-right",
        headerClassName: "justify-end",
      },
      {
        id: "category",
        header: "Category",
        sortable: true,
        sortValue: (e) =>
          (e.category?.name || categoryById.get(e.category_id ?? "")?.name || "").toLowerCase(),
        cell: (e) => {
          const cat = e.category || (e.category_id ? categoryById.get(e.category_id) : undefined);
          if (!cat) return <span className="text-muted-foreground">Uncategorized</span>;
          return (
            <span className="inline-flex items-center gap-2 truncate">
              <span
                className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                style={{ background: cat.color }}
              />
              <span className="truncate">{cat.name}</span>
            </span>
          );
        },
        width: "minmax(0, 1fr)",
      },
      {
        id: "date",
        header: "Created",
        sortable: true,
        sortValue: (e) => new Date(e.created_at),
        cell: (e) =>
          new Date(e.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
          }),
        width: "140px",
      },
      {
        id: "status",
        header: "Status",
        sortable: true,
        sortValue: (e) => (e.archived ? "archived" : "active"),
        cell: (e) =>
          e.archived ? (
            <Badge variant="secondary">Archived</Badge>
          ) : (
            <Badge variant="outline">Active</Badge>
          ),
        width: "110px",
      },
      {
        id: "actions",
        header: "Actions",
        cell: (e) => (
          <div className="flex items-center gap-1 justify-end">
            <Button
              size="icon"
              variant="ghost"
              title={e.archived ? "Restore" : "Archive"}
              onClick={() => onArchiveToggle(e.id, !e.archived)}
            >
              {e.archived ? (
                <ArchiveRestore className="h-4 w-4" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              title="Delete"
              onClick={() => setConfirmDelete(e)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
        width: "120px",
        className: "justify-end",
        headerClassName: "justify-end",
      },
    ],
    [categoryById, onArchiveToggle],
  );

  return (
    <div className="border rounded-lg">
      <div className="flex items-center justify-between p-4 border-b bg-muted/50">
        <div>
          <h2 className="text-lg font-semibold">Expenses</h2>
          <p className="text-sm text-muted-foreground">
            {rows.length} entr{rows.length === 1 ? "y" : "ies"}
            {showArchived ? " (including archived)" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="show-archived-expenses" checked={showArchived} onCheckedChange={setShowArchived} />
          <Label htmlFor="show-archived-expenses" className="text-sm cursor-pointer">
            Show archived
          </Label>
        </div>
      </div>
      <div className="p-4">
        <VirtualTable
          rows={rows}
          columns={columns}
          rowKey={(e) => e.id}
          rowHeight={52}
          maxBodyHeight={520}
          defaultSort={{ id: "date", dir: "desc" }}
          getRowClassName={(e) => (e.archived ? "opacity-50 bg-muted/30" : "")}
          empty="No expenses to show"
        />
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "{confirmDelete?.description}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (confirmDelete) await onDelete(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
