import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { useExpenses } from "@/hooks/useExpenses";
import { useIncomeCategories } from "@/hooks/useIncomeCategories";
import { useIncome } from "@/hooks/useIncome";
import { CompanyFilter } from "@/components/CompanyFilter";
import { DashboardMetrics } from "@/components/DashboardMetrics";
import { DashboardCharts } from "@/components/DashboardCharts";
import { ExpenseBreakdown } from "@/components/ExpenseBreakdown";
import ManageCategoriesDialog from "@/components/ManageCategoriesDialog";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { ManageIncomeCategoriesDialog } from "@/components/ManageIncomeCategoriesDialog";
import { AddIncomeDialog } from "@/components/AddIncomeDialog";
import { ExpensesTable } from "@/components/ExpensesTable";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Settings, Plus, TrendingUp, TrendingDown } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [categoriesDialogOpen, setCategoriesDialogOpen] = useState(false);
  const [addExpenseDialogOpen, setAddExpenseDialogOpen] = useState(false);
  const [incomeCategoriesDialogOpen, setIncomeCategoriesDialogOpen] = useState(false);
  const [addIncomeDialogOpen, setAddIncomeDialogOpen] = useState(false);
  
  const { companies, dashboardData, loading } = useDashboardData(userId, selectedCompanyIds);
  const { 
    categories, 
    hierarchicalCategories, 
    createCategory, 
    updateCategory, 
    deleteCategory 
  } = useExpenseCategories(userId);
  const { expenses, createExpense, deleteExpense, setExpenseArchived } = useExpenses(userId, selectedCompanyIds);
  const {
    categories: incomeCategories,
    createCategory: createIncomeCategory,
    updateCategory: updateIncomeCategory,
    deleteCategory: deleteIncomeCategory,
  } = useIncomeCategories(userId);
  const { createIncome } = useIncome(userId, selectedCompanyIds);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      unpaid: "destructive",
      paid_by_holdback: "secondary",
      holdback_remaining: "outline",
      fully_paid: "default",
    };
    
    const labels: Record<string, string> = {
      unpaid: "Unpaid",
      paid_by_holdback: "Paid by Holdback",
      holdback_remaining: "Holdback Remaining",
      fully_paid: "Fully Paid",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar with Company Filter */}
      <div className="border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Financial Dashboard</h1>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCategoriesDialogOpen(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Expense Categories
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIncomeCategoriesDialogOpen(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Income Categories
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddExpenseDialogOpen(true)}
              >
                <TrendingDown className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
              <Button
                size="sm"
                onClick={() => setAddIncomeDialogOpen(true)}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Add Income
              </Button>
              <CompanyFilter
                companies={companies}
                selectedIds={selectedCompanyIds}
                onSelectionChange={setSelectedCompanyIds}
              />
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-6 py-8 space-y-6">
        {/* Dashboard Metrics */}
        <DashboardMetrics data={dashboardData} />

        {/* Charts */}
        <DashboardCharts data={dashboardData} />

        {/* Expense Breakdown */}
        <ExpenseBreakdown
          expenses={expenses}
          categories={categories}
          hierarchicalCategories={hierarchicalCategories}
        />

        {/* Expenses Table (sortable + virtualized, supports archive/delete) */}
        <ExpensesTable
          expenses={expenses}
          categories={categories}
          onDelete={deleteExpense}
          onArchiveToggle={setExpenseArchived}
        />


        {/* Unpaid Invoices Table */}
        <div className="border rounded-lg">
          <div className="p-4 border-b bg-muted/50">
            <h2 className="text-lg font-semibold">Unpaid Invoices</h2>
            <p className="text-sm text-muted-foreground">Recent activity and outstanding payments</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Client Name</TableHead>
                <TableHead>Company Name</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboardData.unpaidInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No unpaid invoices found
                  </TableCell>
                </TableRow>
              ) : (
                dashboardData.unpaidInvoices.slice(0, 10).map((invoice) => (
                  <TableRow 
                    key={invoice.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                  >
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.client_name}</TableCell>
                    <TableCell>{invoice.company_name}</TableCell>
                    <TableCell>
                      {invoice.invoice_date ? format(new Date(invoice.invoice_date), "MMM dd, yyyy") : "N/A"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(invoice.total_payable || 0)}
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* Dialogs */}
      <ManageCategoriesDialog
        open={categoriesDialogOpen}
        onOpenChange={setCategoriesDialogOpen}
        categories={categories}
        hierarchicalCategories={hierarchicalCategories}
        onCreateCategory={createCategory}
        onUpdateCategory={updateCategory}
        onDeleteCategory={deleteCategory}
      />

      <AddExpenseDialog
        open={addExpenseDialogOpen}
        onOpenChange={setAddExpenseDialogOpen}
        categories={categories}
        companies={companies}
        onCreateExpense={createExpense}
      />

      <ManageIncomeCategoriesDialog
        open={incomeCategoriesDialogOpen}
        onOpenChange={setIncomeCategoriesDialogOpen}
        categories={incomeCategories}
        onCreateCategory={createIncomeCategory}
        onUpdateCategory={updateIncomeCategory}
        onDeleteCategory={deleteIncomeCategory}
      />

      <AddIncomeDialog
        open={addIncomeDialogOpen}
        onOpenChange={setAddIncomeDialogOpen}
        categories={incomeCategories}
        companies={companies}
        onCreateIncome={createIncome}
      />
    </div>
  );
};

export default Dashboard;
