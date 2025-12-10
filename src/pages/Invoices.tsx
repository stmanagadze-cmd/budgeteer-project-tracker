import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, FileText, LogOut } from "lucide-react";
import { useInvoices } from "@/hooks/useInvoices";
import { useCompanies } from "@/hooks/useCompanies";
import { useClients } from "@/hooks/useClients";
import { Invoice } from "@/types/invoice";
import { InvoiceFilters, InvoiceFiltersState } from "@/components/InvoiceFilters";
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

const Invoices = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const { invoices, loading } = useInvoices(userId);
  const { companies } = useCompanies(userId);
  const { clients } = useClients(userId);

  const [filters, setFilters] = useState<InvoiceFiltersState>({
    paymentStatus: [],
    holdbackFilter: "all",
    companyId: "all",
    clientId: "all",
  });

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

  // Filter invoices based on current filters
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      // Payment Status filter
      if (filters.paymentStatus.length > 0 && !filters.paymentStatus.includes(invoice.status)) {
        return false;
      }

      // Holdback filter
      if (filters.holdbackFilter !== "all") {
        const hasHoldback = invoice.holdback_enabled && invoice.holdback_amount > 0;
        
        switch (filters.holdbackFilter) {
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
      if (filters.companyId !== "all" && invoice.company_id !== filters.companyId) {
        return false;
      }

      // Client filter
      if (filters.clientId !== "all" && invoice.client_id !== filters.clientId) {
        return false;
      }

      return true;
    });
  }, [invoices, filters]);

  // Calculate summary totals for filtered invoices
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        Loading...
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
              Back to Projects
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
        <InvoiceFilters
          filters={filters}
          onFiltersChange={setFilters}
          companies={companies}
          clients={clients}
        />

        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12 border border-border rounded-lg bg-card">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">
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
