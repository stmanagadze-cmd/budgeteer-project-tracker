import { useState } from "react";
import { InvoiceLineItem } from "@/types/invoice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface InvoiceLineItemsProps {
  items: InvoiceLineItem[];
  onAddItem: (item: Omit<InvoiceLineItem, "id" | "invoice_id">) => void;
  onUpdateItem: (id: string, updates: Partial<InvoiceLineItem>) => void;
  onDeleteItem: (id: string) => void;
}

export const InvoiceLineItems = ({
  items,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}: InvoiceLineItemsProps) => {
  const [newItem, setNewItem] = useState({
    description: "",
    hours: 0,
    price: 0,
  });

  const handleAddItem = () => {
    if (!newItem.description) return;
    
    onAddItem({
      ...newItem,
      item_order: items.length + 1,
      amount: newItem.hours * newItem.price,
    });
    
    setNewItem({ description: "", hours: 0, price: 0 });
  };

  const handleUpdateItem = (item: InvoiceLineItem, field: keyof InvoiceLineItem, value: any) => {
    const updates: Partial<InvoiceLineItem> = { [field]: value };
    
    if (field === "hours" || field === "price") {
      const hours = field === "hours" ? value : item.hours;
      const price = field === "price" ? value : item.price;
      updates.amount = hours * price;
    }
    
    onUpdateItem(item.id, updates);
  };

  const totalHours = items.reduce((sum, item) => sum + item.hours, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Line Items</h3>
      
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[100px]">HR</TableHead>
              <TableHead className="w-[120px]">Price</TableHead>
              <TableHead className="w-[120px]">Amount</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={item.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                  <Input
                    value={item.description}
                    onChange={(e) => handleUpdateItem(item, "description", e.target.value)}
                    className="min-w-[300px]"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={item.hours}
                    onChange={(e) => handleUpdateItem(item, "hours", parseFloat(e.target.value) || 0)}
                    step="0.5"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={item.price}
                    onChange={(e) => handleUpdateItem(item, "price", parseFloat(e.target.value) || 0)}
                    step="0.01"
                  />
                </TableCell>
                <TableCell className="font-medium">
                  ${item.amount.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            
            {/* Add new item row */}
            <TableRow className="bg-muted/50">
              <TableCell>{items.length + 1}</TableCell>
              <TableCell>
                <Input
                  placeholder="Description..."
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  className="min-w-[300px]"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  placeholder="0"
                  value={newItem.hours || ""}
                  onChange={(e) => setNewItem({ ...newItem, hours: parseFloat(e.target.value) || 0 })}
                  step="0.5"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newItem.price || ""}
                  onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
                  step="0.01"
                />
              </TableCell>
              <TableCell className="font-medium">
                ${(newItem.hours * newItem.price).toFixed(2)}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddItem}
                  disabled={!newItem.description}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Subtotals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Subtotal HR:</span>
            <span>{totalHours.toFixed(1)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Subtotal Amount:</span>
            <span>${totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
