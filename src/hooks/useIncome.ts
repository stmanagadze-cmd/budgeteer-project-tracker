import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Income } from "@/types/income";
import { useToast } from "@/hooks/use-toast";

export const useIncome = (userId?: string, selectedCompanyIds: string[] = []) => {
  const [income, setIncome] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    const fetchIncome = async () => {
      try {
        let query = supabase
          .from("income")
          .select("*")
          .eq("user_id", userId)
          .order("income_date", { ascending: false });

        if (selectedCompanyIds.length > 0) {
          query = query.in("company_id", selectedCompanyIds);
        }

        const { data, error } = await query;
        if (error) throw error;
        setIncome(data as Income[]);
      } catch (error) {
        console.error("Error fetching income:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchIncome();

    const channel = supabase
      .channel(`${userId}:income_changes`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "income", filter: `user_id=eq.${userId}` },
        () => fetchIncome()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, selectedCompanyIds]);

  const createIncome = async (incomeData: Omit<Income, "id" | "user_id" | "created_at" | "updated_at">) => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("income")
        .insert({ ...incomeData, user_id: userId } as any)
        .select()
        .single();

      if (error) throw error;
      setIncome([data as Income, ...income]);
      toast({ title: "Income added successfully" });
    } catch (error) {
      console.error("Error creating income:", error);
      toast({ title: "Failed to add income", variant: "destructive" });
    }
  };

  const deleteIncome = async (id: string) => {
    try {
      const { error } = await supabase.from("income").delete().eq("id", id);
      if (error) throw error;
      setIncome(income.filter(i => i.id !== id));
      toast({ title: "Income deleted" });
    } catch (error) {
      console.error("Error deleting income:", error);
      toast({ title: "Failed to delete income", variant: "destructive" });
    }
  };

  return {
    income,
    loading,
    createIncome,
    deleteIncome,
  };
};
