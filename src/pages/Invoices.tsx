import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, FileText, LogOut } from "lucide-react";
import { useInvoices } from "@/hooks/useInvoices";
import { Invoice } from "@/types/invoice";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const Invoices = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const { invoices, loading } = useInvoices(userId);

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

  const getStatusBadge = (status: Invoice['status']) => {
    const variants = {
      draft: "secondary",
      sent: "default",
      paid: "outline",
    };
    return (
      <Badge variant={variants[status] as any}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
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

        {invoices.length === 0 ? (
          <div className="text-center py-12 border border-border rounded-lg bg-card">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No invoices yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first invoice to get started
            </p>
            <Button onClick={() => navigate("/invoices/new")}>
              Create Invoice
            </Button>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell>{invoice.client_name}</TableCell>
                    <TableCell>
                      {new Date(invoice.invoice_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>${invoice.total_payable.toFixed(2)}</TableCell>
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
            </Table>
          </div>
        )}
      </main>
    </div>
  );
};

export default Invoices;
