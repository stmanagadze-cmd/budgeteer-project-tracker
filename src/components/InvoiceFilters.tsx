import { useMemo } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Company } from "@/types/company";
import { Client } from "@/types/client";

export interface InvoiceFiltersState {
  paymentStatus: string[];
  holdbackFilter: string;
  companyId: string;
  clientId: string;
}

interface InvoiceFiltersProps {
  filters: InvoiceFiltersState;
  onFiltersChange: (filters: InvoiceFiltersState) => void;
  companies: Company[];
  clients: Client[];
}

const PAYMENT_STATUS_OPTIONS = [
  { value: "unpaid", label: "Unpaid" },
  { value: "paid_by_holdback", label: "Paid (Holdback Pending)" },
  { value: "holdback_remaining", label: "Holdback Remaining" },
  { value: "fully_paid", label: "Fully Paid" },
];

const HOLDBACK_FILTER_OPTIONS = [
  { value: "all", label: "All Invoices" },
  { value: "has_holdback", label: "Has Holdback" },
  { value: "unpaid_holdback", label: "Unpaid Holdbacks" },
  { value: "paid_holdback", label: "Paid Holdbacks" },
];

export const InvoiceFilters = ({
  filters,
  onFiltersChange,
  companies,
  clients,
}: InvoiceFiltersProps) => {
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.paymentStatus.length > 0) count++;
    if (filters.holdbackFilter !== "all") count++;
    if (filters.companyId !== "all") count++;
    if (filters.clientId !== "all") count++;
    return count;
  }, [filters]);

  const handlePaymentStatusToggle = (status: string) => {
    const current = filters.paymentStatus;
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    onFiltersChange({ ...filters, paymentStatus: updated });
  };

  const clearFilters = () => {
    onFiltersChange({
      paymentStatus: [],
      holdbackFilter: "all",
      companyId: "all",
      clientId: "all",
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Filters</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFilterCount} active
            </Badge>
          )}
        </div>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1">
            <X className="h-3 w-3" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Payment Status Multi-Select */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Payment Status</label>
          <div className="flex flex-wrap gap-1">
            {PAYMENT_STATUS_OPTIONS.map((option) => (
              <Badge
                key={option.value}
                variant={filters.paymentStatus.includes(option.value) ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => handlePaymentStatusToggle(option.value)}
              >
                {option.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Holdback Filter */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Holdback Filter</label>
          <Select
            value={filters.holdbackFilter}
            onValueChange={(value) => onFiltersChange({ ...filters, holdbackFilter: value })}
          >
            <SelectTrigger className="h-9 bg-background">
              <SelectValue placeholder="All Invoices" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {HOLDBACK_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Company Filter */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Company</label>
          <Select
            value={filters.companyId}
            onValueChange={(value) => onFiltersChange({ ...filters, companyId: value })}
          >
            <SelectTrigger className="h-9 bg-background">
              <SelectValue placeholder="All Companies" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Client Filter */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Client</label>
          <Select
            value={filters.clientId}
            onValueChange={(value) => onFiltersChange({ ...filters, clientId: value })}
          >
            <SelectTrigger className="h-9 bg-background">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
