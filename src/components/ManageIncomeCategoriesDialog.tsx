import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IncomeCategory } from "@/types/income";
import { Trash2, Edit2, Plus, Check, X } from "lucide-react";

interface ManageIncomeCategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: IncomeCategory[];
  onCreateCategory: (category: { name: string; description: string | null; color: string }) => void;
  onUpdateCategory: (id: string, updates: Partial<IncomeCategory>) => void;
  onDeleteCategory: (id: string) => void;
}

export const ManageIncomeCategoriesDialog = ({
  open,
  onOpenChange,
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: ManageIncomeCategoriesDialogProps) => {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#10B981");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreateCategory({ name: newName.trim(), description: null, color: newColor });
    setNewName("");
    setNewColor("#10B981");
  };

  const startEdit = (category: IncomeCategory) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditColor(category.color);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditColor("");
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    onUpdateCategory(editingId, { name: editName.trim(), color: editColor });
    cancelEdit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Income Categories</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new category */}
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-2">
              <Label>New Category</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Category name"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="w-14 h-10 p-1"
              />
            </div>
            <Button onClick={handleCreate} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Category list */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No income categories yet
              </p>
            ) : (
              categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center gap-2 p-2 rounded-md border"
                >
                  {editingId === category.id ? (
                    <>
                      <Input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="w-10 h-8 p-1"
                      />
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1"
                      />
                      <Button size="icon" variant="ghost" onClick={saveEdit}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={cancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="flex-1">{category.name}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEdit(category)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onDeleteCategory(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
