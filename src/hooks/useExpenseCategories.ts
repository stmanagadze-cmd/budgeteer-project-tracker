import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ExpenseCategory } from "@/types/expense";
import { toast } from "sonner";

export const useExpenseCategories = (userId?: string) => {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("expense_categories")
        .select("*")
        .eq("user_id", userId)
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [userId]);

  const createCategory = async (category: Omit<ExpenseCategory, "id" | "user_id" | "created_at" | "updated_at">) => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from("expense_categories")
        .insert({ ...category, user_id: userId })
        .select()
        .single();

      if (error) throw error;
      setCategories(prev => [...prev, data]);
      toast.success("Category created");
      return data;
    } catch (error) {
      console.error("Error creating category:", error);
      toast.error("Failed to create category");
      return null;
    }
  };

  const updateCategory = async (id: string, updates: Partial<ExpenseCategory>) => {
    try {
      const { error } = await supabase
        .from("expense_categories")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      toast.success("Category updated");
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Failed to update category");
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from("expense_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setCategories(prev => prev.filter(c => c.id !== id));
      toast.success("Category deleted");
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
    }
  };

  // Build hierarchical structure
  const hierarchicalCategories = categories.reduce((acc, cat) => {
    if (!cat.parent_id) {
      const children = categories.filter(c => c.parent_id === cat.id);
      acc.push({ ...cat, children });
    }
    return acc;
  }, [] as ExpenseCategory[]);

  return {
    categories,
    hierarchicalCategories,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
    refetch: fetchCategories,
  };
};
