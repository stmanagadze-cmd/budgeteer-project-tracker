import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { IncomeCategory } from "@/types/income";
import { useToast } from "@/hooks/use-toast";

export const useIncomeCategories = (userId?: string) => {
  const [categories, setCategories] = useState<IncomeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("income_categories")
          .select("*")
          .eq("user_id", userId)
          .order("name");

        if (error) throw error;
        setCategories(data as IncomeCategory[]);
      } catch (error) {
        console.error("Error fetching income categories:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [userId]);

  const createCategory = async (category: Omit<IncomeCategory, "id" | "user_id" | "created_at" | "updated_at">) => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("income_categories")
        .insert({ ...category, user_id: userId })
        .select()
        .single();

      if (error) throw error;
      setCategories([...categories, data as IncomeCategory]);
      toast({ title: "Income category created" });
    } catch (error) {
      console.error("Error creating income category:", error);
      toast({ title: "Failed to create category", variant: "destructive" });
    }
  };

  const updateCategory = async (id: string, updates: Partial<IncomeCategory>) => {
    try {
      const { error } = await supabase
        .from("income_categories")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      setCategories(categories.map(c => (c.id === id ? { ...c, ...updates } : c)));
      toast({ title: "Income category updated" });
    } catch (error) {
      console.error("Error updating income category:", error);
      toast({ title: "Failed to update category", variant: "destructive" });
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from("income_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setCategories(categories.filter(c => c.id !== id));
      toast({ title: "Income category deleted" });
    } catch (error) {
      console.error("Error deleting income category:", error);
      toast({ title: "Failed to delete category", variant: "destructive" });
    }
  };

  return {
    categories,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
  };
};
