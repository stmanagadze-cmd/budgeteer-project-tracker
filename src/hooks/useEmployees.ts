import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Employee, SalaryPayment } from "@/types/employee";
import { useToast } from "@/hooks/use-toast";

export const useEmployees = (userId?: string) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      try {
        const [employeesRes, paymentsRes] = await Promise.all([
          supabase
            .from("employees")
            .select("*")
            .eq("user_id", userId)
            .order("name"),
          supabase
            .from("salary_payments")
            .select("*")
            .eq("user_id", userId)
            .order("payment_date", { ascending: false }),
        ]);

        if (employeesRes.error) throw employeesRes.error;
        if (paymentsRes.error) throw paymentsRes.error;

        setEmployees(employeesRes.data as Employee[]);
        setSalaryPayments(paymentsRes.data as SalaryPayment[]);
      } catch (error) {
        console.error("Error fetching employee data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const channel = supabase
      .channel("employee_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employees", filter: `user_id=eq.${userId}` },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "salary_payments", filter: `user_id=eq.${userId}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const createEmployee = async (employee: Omit<Employee, "id" | "user_id" | "created_at" | "updated_at">) => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("employees")
        .insert({ ...employee, user_id: userId })
        .select()
        .single();

      if (error) throw error;
      setEmployees([...employees, data as Employee]);
      toast({ title: "Employee added successfully" });
      return data as Employee;
    } catch (error) {
      console.error("Error creating employee:", error);
      toast({ title: "Failed to add employee", variant: "destructive" });
    }
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    try {
      const { error } = await supabase
        .from("employees")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      setEmployees(employees.map(e => (e.id === id ? { ...e, ...updates } : e)));
      toast({ title: "Employee updated" });
    } catch (error) {
      console.error("Error updating employee:", error);
      toast({ title: "Failed to update employee", variant: "destructive" });
    }
  };

  const deleteEmployee = async (id: string) => {
    try {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
      setEmployees(employees.filter(e => e.id !== id));
      toast({ title: "Employee deleted" });
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast({ title: "Failed to delete employee", variant: "destructive" });
    }
  };

  const createSalaryPayment = async (
    payment: Omit<SalaryPayment, "id" | "user_id" | "expense_id" | "created_at" | "updated_at">
  ) => {
    if (!userId) return;

    try {
      // First, create an expense entry for payroll
      const employee = employees.find(e => e.id === payment.employee_id);
      const { data: expenseData, error: expenseError } = await supabase
        .from("expenses")
        .insert({
          user_id: userId,
          company_id: payment.company_id,
          amount: payment.amount,
          description: `Salary payment: ${employee?.name || "Employee"}`,
          expense_date: payment.payment_date,
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      // Then create the salary payment with expense reference
      const { data, error } = await supabase
        .from("salary_payments")
        .insert({
          ...payment,
          user_id: userId,
          expense_id: expenseData.id,
        })
        .select()
        .single();

      if (error) throw error;
      setSalaryPayments([data as SalaryPayment, ...salaryPayments]);
      toast({ title: "Salary payment recorded" });
    } catch (error) {
      console.error("Error creating salary payment:", error);
      toast({ title: "Failed to record salary payment", variant: "destructive" });
    }
  };

  const deleteSalaryPayment = async (id: string) => {
    try {
      const payment = salaryPayments.find(p => p.id === id);
      
      // Delete the payment first
      const { error } = await supabase.from("salary_payments").delete().eq("id", id);
      if (error) throw error;

      // Also delete the associated expense if it exists
      if (payment?.expense_id) {
        await supabase.from("expenses").delete().eq("id", payment.expense_id);
      }

      setSalaryPayments(salaryPayments.filter(p => p.id !== id));
      toast({ title: "Salary payment deleted" });
    } catch (error) {
      console.error("Error deleting salary payment:", error);
      toast({ title: "Failed to delete salary payment", variant: "destructive" });
    }
  };

  return {
    employees,
    salaryPayments,
    loading,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    createSalaryPayment,
    deleteSalaryPayment,
  };
};
