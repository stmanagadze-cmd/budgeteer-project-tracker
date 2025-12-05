import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExpenseCategory } from "@/types/expense";
import { Plus, Pencil, Trash2, FolderTree } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ManageCategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ExpenseCategory[];
  hierarchicalCategories: ExpenseCategory[];
  onCreateCategory: (category: Omit<ExpenseCategory, "id" | "user_id" | "created_at" | "updated_at">) => Promise<ExpenseCategory | null>;
  onUpdateCategory: (id: string, updates: Partial<ExpenseCategory>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

const COLORS = [
  "#EF4444", "#F97316", "#F59E0B", "#84CC16", "#22C55E",
  "#14B8A6", "#06B6D4", "#3B82F6", "#6366F1", "#8B5CF6",
  "#A855F7", "#EC4899", "#6B7280",
];

export const ManageCategoriesDialog = ({
  open,
  onOpenChange,
  categories,
  hierarchicalCategories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: ManageCategoriesDialogProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#6B7280",
    parent_id: null as string | null,
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", color: "#6B7280", parent_id: null });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    if (editingId) {
      await onUpdateCategory(editingId, formData);
    } else {
      await onCreateCategory(formData);
    }
    resetForm();
  };

  const startEdit = (category: ExpenseCategory) => {
    setFormData({
      name: category.name,
      description: category.description || "",
      color: category.color,
      parent_id: category.parent_id,
    });
    setEditingId(category.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this category? Sub-categories will also be deleted.")) {
      await onDeleteCategory(id);
    }
  };

  const parentCategories = categories.filter(c => !c.parent_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Manage Expense Categories
          </DialogTitle>
          <DialogDescription>
            Create and organize expense categories and sub-categories.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isAdding ? (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="space-y-2">
                <Label>Category Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Software, Travel"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description"
                />
              </div>

              <div className="space-y-2">
                <Label>Parent Category (Optional)</Label>
                <Select
                  value={formData.parent_id || "none"}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, parent_id: v === "none" ? null : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None (Top Level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Top Level)</SelectItem>
                    {parentCategories.filter(c => c.id !== editingId).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        formData.color === color ? "border-foreground scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSubmit} size="sm">
                  {editingId ? "Update" : "Add"} Category
                </Button>
                <Button onClick={resetForm} variant="outline" size="sm">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setIsAdding(true)} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          )}

          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {hierarchicalCategories.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No categories yet. Create your first one!
                </p>
              ) : (
                hierarchicalCategories.map((category) => (
                  <div key={category.id} className="space-y-1">
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-medium">{category.name}</span>
                        {category.description && (
                          <span className="text-sm text-muted-foreground">
                            - {category.description}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => startEdit(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {category.children && category.children.length > 0 && (
                      <div className="ml-6 space-y-1">
                        {category.children.map((child) => (
                          <div
                            key={child.id}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: child.color }}
                              />
                              <span>{child.name}</span>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => startEdit(child)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => handleDelete(child.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
