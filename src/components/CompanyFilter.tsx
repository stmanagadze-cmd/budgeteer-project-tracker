import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Company } from "@/types/company";
import { cn } from "@/lib/utils";

interface CompanyFilterProps {
  companies: Company[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function CompanyFilter({ companies, selectedIds, onSelectionChange }: CompanyFilterProps) {
  const [open, setOpen] = useState(false);

  const handleToggle = (companyId: string) => {
    if (selectedIds.includes(companyId)) {
      onSelectionChange(selectedIds.filter(id => id !== companyId));
    } else {
      onSelectionChange([...selectedIds, companyId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === companies.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(companies.map(c => c.id));
    }
  };

  const selectedNames = companies
    .filter(c => selectedIds.includes(c.id))
    .map(c => c.name)
    .join(", ");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[300px] justify-between"
        >
          <span className="truncate">
            {selectedIds.length === 0
              ? "All Companies"
              : selectedIds.length === companies.length
              ? "All Companies"
              : selectedNames || "Select companies..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <div className="p-2">
          <div className="flex items-center space-x-2 p-2 hover:bg-muted rounded-sm cursor-pointer" onClick={handleSelectAll}>
            <Checkbox
              checked={selectedIds.length === companies.length}
              onCheckedChange={handleSelectAll}
            />
            <label className="text-sm font-medium cursor-pointer flex-1">
              Select All
            </label>
          </div>
          <div className="border-t my-2" />
          {companies.map((company) => (
            <div
              key={company.id}
              className="flex items-center space-x-2 p-2 hover:bg-muted rounded-sm cursor-pointer"
              onClick={() => handleToggle(company.id)}
            >
              <Checkbox
                checked={selectedIds.includes(company.id)}
                onCheckedChange={() => handleToggle(company.id)}
              />
              <label className="text-sm cursor-pointer flex-1">
                {company.name}
              </label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
