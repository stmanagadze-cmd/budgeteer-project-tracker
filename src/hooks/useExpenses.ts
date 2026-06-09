import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Expense } from "@/types/expense";
import { toast } from "sonner";

export const useExpenses = (userId?: string, selectedCompanyIds: string[] = []) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = async () => {
    if (!userId) return;

    try {
      let query = supabase
        .from("expenses")
        .select("*, expense_categories(*)")
        .eq("user_id", userId)
        .order("expense_date", { ascending: false });

      if (selectedCompanyIds.length > 0) {
        query = query.in("company_id", selectedCompanyIds);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const formattedData = (data || []).map(exp => ({
        ...exp,
        category: exp.expense_categories || undefined,
      }));
      
      setExpenses(formattedData);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();

    if (!userId) return;

    const channel = supabase
      .channel(`${userId}:expenses_changes`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses", filter: `user_id=eq.${userId}` },
        () => fetchExpenses()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, selectedCompanyIds]);

  const createExpense = async (expense: Omit<Expense, "id" | "user_id" | "created_at" | "updated_at" | "category">) => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from("expenses")
        .insert({ ...expense, user_id: userId })
        .select()
        .single();

      if (error) throw error;
      toast.success("Expense added");
      return data;
    } catch (error) {
      console.error("Error creating expense:", error);
      toast.error("Failed to create expense");
      return null;
    }
  };

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    try {
      const { error } = await supabase
        .from("expenses")
        .update(updates as any)
        .eq("id", id);

      if (error) throw error;
      toast.success("Expense updated");
    } catch (error) {
      console.error("Error updating expense:", error);
      toast.error("Failed to update expense");
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Expense deleted");
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Failed to delete expense");
    }
  };

  const setExpenseArchived = async (id: string, archived: boolean) => {
    try {
      const { error } = await supabase
        .from("expenses")
        .update({ archived } as any)
        .eq("id", id);
      if (error) throw error;
      toast.success(archived ? "Expense archived" : "Expense restored");
    } catch (error) {
      console.error("Error updating expense:", error);
      toast.error("Failed to update expense");
    }
  };

  // Calculate totals by category
  const expensesByCategory = expenses.reduce((acc, exp) => {
    const categoryName = exp.category?.name || "Uncategorized";
    acc[categoryName] = (acc[categoryName] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return {
    expenses,
    expensesByCategory,
    totalExpenses,
    loading,
    createExpense,
    updateExpense,
    deleteExpense,
    setExpenseArchived,
    refetch: fetchExpenses,
  };
};

