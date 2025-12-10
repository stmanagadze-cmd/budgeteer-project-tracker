import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, FileText, LogOut, Filter, X } from "lucide-react";
import { useInvoices } from "@/hooks/useInvoices";
import { useCompanies } from "@/hooks/useCompanies";
import { useClients } from "@/hooks/useClients";
import { Invoice } from "@/types/invoice";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const PAYMENT_STATUS_OPTIONS = [
  { value: "unpaid", label: "Unpaid" },
  { value: "paid_by_holdback", label: "Paid (Holdback)" },
  { value: "holdback_remaining", label: "Holdback Remaining" },
  { value: "fully_paid", label: "Fully Paid" },
];

const HOLDBACK_FILTER_OPTIONS = [
  { value: "all", label: "All Invoices" },
  { value: "has_holdback", label: "Has Holdback" },
  { value: "unpaid_holdback", label: "Unpaid Holdbacks" },
  { value: "paid_holdback", label: "Paid Holdbacks" },
];

const Invoices = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const { invoices, loading } = useInvoices(userId);
  const { companies } = useCompanies(userId);
  const { clients } = useClients(userId);

  // Filter state
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string[]>([]);
  const [holdbackFilter, setHoldbackFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const togglePaymentStatus = (status: string) => {
    setPaymentStatusFilter(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status) 
        : [...prev, status]
    );
  };

  const clearAllFilters = () => {
    setPaymentStatusFilter([]);
    setHoldbackFilter("all");
    setCompanyFilter("all");
    setClientFilter("all");
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (paymentStatusFilter.length > 0) count++;
    if (holdbackFilter !== "all") count++;
    if (companyFilter !== "all") count++;
    if (clientFilter !== "all") count++;
    return count;
  }, [paymentStatusFilter, holdbackFilter, companyFilter, clientFilter]);

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      // Payment Status filter
      if (paymentStatusFilter.length > 0 && !paymentStatusFilter.includes(invoice.status)) {
        return false;
      }

      // Holdback filter
      if (holdbackFilter !== "all") {
        const hasHoldback = invoice.holdback_enabled && (invoice.holdback_amount || 0) > 0;
        
        switch (holdbackFilter) {
          case "has_holdback":
            if (!hasHoldback) return false;
            break;
          case "unpaid_holdback":
            if (!hasHoldback || invoice.status === "fully_paid") return false;
            break;
          case "paid_holdback":
            if (!hasHoldback || invoice.status !== "fully_paid") return false;
            break;
        }
      }

      // Company filter
      if (companyFilter !== "all" && invoice.company_id !== companyFilter) {
        return false;
      }

      // Client filter
      if (clientFilter !== "all" && invoice.client_id !== clientFilter) {
        return false;
      }

      return true;
    });
  }, [invoices, paymentStatusFilter, holdbackFilter, companyFilter, clientFilter]);

  // Calculate summary totals
  const summaryTotals = useMemo(() => {
    return filteredInvoices.reduce(
      (acc, invoice) => {
        acc.totalAmount += invoice.total_payable || 0;
        acc.totalHoldbacks += invoice.holdback_enabled ? (invoice.holdback_amount || 0) : 0;
        
        if (invoice.status === "fully_paid") {
          acc.paidAmount += invoice.total_payable || 0;
        } else if (invoice.status === "holdback_remaining") {
          acc.paidAmount += invoice.net_amount || 0;
        }
        
        return acc;
      },
      { totalAmount: 0, totalHoldbacks: 0, paidAmount: 0 }
    );
  }, [filteredInvoices]);

  const getStatusBadge = (status: Invoice['status']) => {
    const variants: Record<string, { variant: string; label: string }> = {
      unpaid: { variant: "destructive", label: "Unpaid" },
      paid_by_holdback: { variant: "secondary", label: "Paid (Holdback)" },
      holdback_remaining: { variant: "outline", label: "Holdback Remaining" },
      fully_paid: { variant: "default", label: "Fully Paid" },
      draft: { variant: "secondary", label: "Draft" },
    };
    
    const config = variants[status] || { variant: "secondary", label: status };
    return (
      <Badge variant={config.variant as any}>
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
  };

  if (!userId || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading invoices...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/")}>
              Back to Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">All Invoices</h2>
          <Button onClick={() => navigate("/invoices/new")} className="gap-2">
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="bg-card border border-border rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm text-foreground">Filters</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {activeFilterCount} active
                </Badge>
              )}
            </div>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-8 gap-1">
                <X className="h-3 w-3" />
                Clear All
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Payment Status */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Payment Status</label>
              <div className="flex flex-wrap gap-1">
                {PAYMENT_STATUS_OPTIONS.map((option) => (
                  <Badge
                    key={option.value}
                    variant={paymentStatusFilter.includes(option.value) ? "default" : "outline"}
                    className="cursor-pointer text-xs hover:opacity-80"
                    onClick={() => togglePaymentStatus(option.value)}
                  >
                    {option.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Holdback Filter */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Holdback Filter</label>
              <Select value={holdbackFilter} onValueChange={setHoldbackFilter}>
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
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
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
              <Select value={clientFilter} onValueChange={setClientFilter}>
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

        {/* Invoice Table */}
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12 border border-border rounded-lg bg-card">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2 text-foreground">
              {invoices.length === 0 ? "No invoices yet" : "No invoices match your filters"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {invoices.length === 0 
                ? "Create your first invoice to get started"
                : "Try adjusting your filter criteria"
              }
            </p>
            {invoices.length === 0 && (
              <Button onClick={() => navigate("/invoices/new")}>
                Create Invoice
              </Button>
            )}
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Holdback</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invoice.company_name || "-"}
                    </TableCell>
                    <TableCell>{invoice.client_name}</TableCell>
                    <TableCell>
                      {new Date(invoice.invoice_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(invoice.total_payable || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {invoice.holdback_enabled 
                        ? formatCurrency(invoice.holdback_amount || 0) 
                        : "-"
                      }
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                      >
                        View/Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={4} className="font-medium">
                    Summary ({filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''})
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(summaryTotals.totalAmount)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-amber-600">
                    {formatCurrency(summaryTotals.totalHoldbacks)}
                  </TableCell>
                  <TableCell className="font-medium text-green-600">
                    Paid: {formatCurrency(summaryTotals.paidAmount)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
};

export default Invoices;
