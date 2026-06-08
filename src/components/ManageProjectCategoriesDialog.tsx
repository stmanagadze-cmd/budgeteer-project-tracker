import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Edit2, Plus, Trash2, X } from "lucide-react";
import { ProjectCategory } from "@/types/project";

interface ManageProjectCategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ProjectCategory[];
  onAdd: (name: string) => Promise<string | undefined>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const ManageProjectCategoriesDialog = ({
  open,
  onOpenChange,
  categories,
  onAdd,
  onRename,
  onDelete,
}: ManageProjectCategoriesDialogProps) => {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<ProjectCategory | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    await onAdd(trimmed);
    setNewName("");
  };

  const startEdit = (c: ProjectCategory) => {
    setEditingId(c.id);
    setEditingName(c.name);
  };

  const saveEdit = async () => {
    if (editingId && editingName.trim()) {
      await onRename(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName("");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Project Categories</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAdd} className="flex gap-2">
            <Input
              placeholder="New category name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={60}
            />
            <Button type="submit" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </form>

          <div className="max-h-72 overflow-y-auto space-y-1 mt-2">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No categories yet. Add one above.
              </p>
            ) : (
              categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/60"
                >
                  {editingId === c.id ? (
                    <>
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-8"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <Button size="icon" variant="ghost" onClick={saveEdit}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm">{c.name}</span>
                      <Button size="icon" variant="ghost" onClick={() => startEdit(c)} title="Rename">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setConfirmDelete(c)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDelete?.name}" will be removed. Projects assigned to it will become uncategorized.
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
    </>
  );
};

export default ManageProjectCategoriesDialog;
