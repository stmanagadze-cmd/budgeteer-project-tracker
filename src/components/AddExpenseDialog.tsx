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
import { ExpenseCategory, Expense } from "@/types/expense";
import { Company } from "@/types/company";

interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ExpenseCategory[];
  companies: Company[];
  onCreateExpense: (expense: Omit<Expense, "id" | "user_id" | "created_at" | "updated_at" | "category">) => Promise<Expense | null>;
}

export const AddExpenseDialog = ({
  open,
  onOpenChange,
  categories,
  companies,
  onCreateExpense,
}: AddExpenseDialogProps) => {
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    category_id: null as string | null,
    company_id: null as string | null,
    expense_date: new Date().toISOString().split("T")[0],
    receipt_path: null as string | null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim() || !formData.amount) return;

    await onCreateExpense({
      ...formData,
      amount: parseFloat(formData.amount),
    });

    setFormData({
      amount: "",
      description: "",
      category_id: null,
      company_id: null,
      expense_date: new Date().toISOString().split("T")[0],
      receipt_path: null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
          <DialogDescription>
            Record a new expense with category and details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.expense_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expense_date: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What was this expense for?"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={formData.category_id || "none"}
              onValueChange={(v) => setFormData(prev => ({ ...prev, category_id: v === "none" ? null : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Uncategorized</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Company (Optional)</Label>
            <Select
              value={formData.company_id || "none"}
              onValueChange={(v) => setFormData(prev => ({ ...prev, company_id: v === "none" ? null : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No company</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Expense</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
