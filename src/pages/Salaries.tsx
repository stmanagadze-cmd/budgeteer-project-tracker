import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEmployees } from "@/hooks/useEmployees";
import { useCompanies } from "@/hooks/useCompanies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, DollarSign, Users } from "lucide-react";
import { format } from "date-fns";

const Salaries = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);

  // Employee form state
  const [employeeName, setEmployeeName] = useState("");
  const [employeeRole, setEmployeeRole] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [employeeCompanyId, setEmployeeCompanyId] = useState("");

  // Payment form state
  const [paymentEmployeeId, setPaymentEmployeeId] = useState("");
  const [paymentCompanyId, setPaymentCompanyId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentNotes, setPaymentNotes] = useState("");

  const { companies } = useCompanies(userId);
  const {
    employees,
    salaryPayments,
    loading,
    createEmployee,
    deleteEmployee,
    createSalaryPayment,
    deleteSalaryPayment,
  } = useEmployees(userId);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
      }
    });
  }, [navigate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeName || !baseSalary) return;

    await createEmployee({
      name: employeeName,
      role: employeeRole || null,
      base_salary: parseFloat(baseSalary),
      company_id: employeeCompanyId || null,
    });

    setEmployeeName("");
    setEmployeeRole("");
    setBaseSalary("");
    setEmployeeCompanyId("");
    setAddEmployeeOpen(false);
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentEmployeeId || !paymentCompanyId || !paymentAmount) return;

    await createSalaryPayment({
      employee_id: paymentEmployeeId,
      company_id: paymentCompanyId,
      amount: parseFloat(paymentAmount),
      payment_date: paymentDate,
      notes: paymentNotes || null,
    });

    setPaymentEmployeeId("");
    setPaymentCompanyId("");
    setPaymentAmount("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentNotes("");
    setAddPaymentOpen(false);
  };

  // Auto-fill payment amount when employee is selected
  const handlePaymentEmployeeChange = (employeeId: string) => {
    setPaymentEmployeeId(employeeId);
    const employee = employees.find((e) => e.id === employeeId);
    if (employee) {
      setPaymentAmount(employee.base_salary.toString());
      if (employee.company_id) {
        setPaymentCompanyId(employee.company_id);
      }
    }
  };

  const totalPayroll = salaryPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalEmployees = employees.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">Loading salaries...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Salaries & Employees</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAddEmployeeOpen(true)}>
                <Users className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
              <Button onClick={() => setAddPaymentOpen(true)}>
                <DollarSign className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-6 py-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEmployees}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Payroll (All Time)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(totalPayroll)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employees Table */}
        <Card>
          <CardHeader>
            <CardTitle>Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Base Salary</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No employees added yet
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((employee) => {
                    const company = companies.find((c) => c.id === employee.company_id);
                    return (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.name}</TableCell>
                        <TableCell>{employee.role || "-"}</TableCell>
                        <TableCell>
                          {company ? (
                            <Badge variant="outline">{company.name}</Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(employee.base_salary)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteEmployee(employee.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Salary Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salaryPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No salary payments recorded yet
                    </TableCell>
                  </TableRow>
                ) : (
                  salaryPayments.map((payment) => {
                    const employee = employees.find((e) => e.id === payment.employee_id);
                    const company = companies.find((c) => c.id === payment.company_id);
                    return (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(new Date(payment.payment_date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {employee?.name || "Unknown"}
                        </TableCell>
                        <TableCell>
                          {company ? (
                            <Badge variant="outline">{company.name}</Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {payment.notes || "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium text-destructive">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteSalaryPayment(payment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {/* Add Employee Dialog */}
      <Dialog open={addEmployeeOpen} onOpenChange={setAddEmployeeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddEmployee} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employeeName">Name</Label>
              <Input
                id="employeeName"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employeeRole">Role</Label>
              <Input
                id="employeeRole"
                value={employeeRole}
                onChange={(e) => setEmployeeRole(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="baseSalary">Base Salary</Label>
              <Input
                id="baseSalary"
                type="number"
                step="0.01"
                min="0"
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employeeCompany">Company</Label>
              <Select value={employeeCompanyId} onValueChange={setEmployeeCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddEmployeeOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Employee</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={addPaymentOpen} onOpenChange={setAddPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Salary Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddPayment} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentEmployee">Employee</Label>
              <Select value={paymentEmployeeId} onValueChange={handlePaymentEmployeeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentCompany">Company</Label>
              <Select value={paymentCompanyId} onValueChange={setPaymentCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentAmount">Amount</Label>
              <Input
                id="paymentAmount"
                type="number"
                step="0.01"
                min="0"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Payment Date</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentNotes">Notes</Label>
              <Input
                id="paymentNotes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Optional notes"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddPaymentOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Record Payment</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Salaries;
