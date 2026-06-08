import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProjectCategory } from "@/types/project";

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialName: string;
  initialCategoryId: string | null;
  categories: ProjectCategory[];
  onSubmit: (values: { name: string; categoryId: string | null }) => void;
}

const UNCATEGORIZED_VALUE = "__none__";

const ProjectFormDialog = ({
  open,
  onOpenChange,
  title,
  initialName,
  initialCategoryId,
  categories,
  onSubmit,
}: ProjectFormDialogProps) => {
  const [name, setName] = useState(initialName);
  const [categoryId, setCategoryId] = useState<string>(initialCategoryId ?? UNCATEGORIZED_VALUE);

  // Reset when dialog reopens with new initial values
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setName(initialName);
      setCategoryId(initialCategoryId ?? UNCATEGORIZED_VALUE);
    }
    onOpenChange(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit({
      name: trimmed,
      categoryId: categoryId === UNCATEGORIZED_VALUE ? null : categoryId,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-category">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="project-category">
                <SelectValue placeholder="Uncategorized" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNCATEGORIZED_VALUE}>Uncategorized</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectFormDialog;
