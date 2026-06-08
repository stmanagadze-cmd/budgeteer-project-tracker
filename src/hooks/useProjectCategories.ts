import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProjectCategory } from "@/types/project";
import { useToast } from "@/hooks/use-toast";
import { projectCategorySchema } from "@/lib/validation";
import { ZodError } from "zod";

export const useProjectCategories = (userId: string | undefined) => {
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("project_categories")
        .select("*")
        .eq("user_id", userId)
        .order("name", { ascending: true });
      if (error) throw error;
      setCategories(
        (data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          createdAt: c.created_at,
        })),
      );
    } catch (e: any) {
      toast({ title: "Error loading categories", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    if (!userId) return;
    fetchCategories();
    const debounced = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(fetchCategories, 400);
    };
    const channel = supabase
      .channel("project-categories-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "project_categories" }, debounced)
      .subscribe();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [userId, fetchCategories]);

  const addCategory = useCallback(
    async (name: string) => {
      if (!userId) return;
      try {
        const validated = projectCategorySchema.parse({ name });
        const { data, error } = await supabase
          .from("project_categories")
          .insert({ user_id: userId, name: validated.name })
          .select()
          .single();
        if (error) throw error;
        setCategories((prev) =>
          [...prev, { id: data.id, name: data.name, createdAt: data.created_at }].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        );
        toast({ title: "Category created", description: validated.name });
        return data.id as string;
      } catch (e: any) {
        const msg = e instanceof ZodError ? e.errors[0].message : e.message;
        toast({ title: "Error creating category", description: msg, variant: "destructive" });
      }
    },
    [userId, toast],
  );

  const renameCategory = useCallback(
    async (id: string, name: string) => {
      try {
        const validated = projectCategorySchema.parse({ name });
        setCategories((prev) =>
          prev.map((c) => (c.id === id ? { ...c, name: validated.name } : c)).sort((a, b) => a.name.localeCompare(b.name)),
        );
        const { error } = await supabase.from("project_categories").update({ name: validated.name }).eq("id", id);
        if (error) throw error;
      } catch (e: any) {
        const msg = e instanceof ZodError ? e.errors[0].message : e.message;
        toast({ title: "Error renaming category", description: msg, variant: "destructive" });
        fetchCategories();
      }
    },
    [toast, fetchCategories],
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      const old = categories;
      setCategories((prev) => prev.filter((c) => c.id !== id));
      const { error } = await supabase.from("project_categories").delete().eq("id", id);
      if (error) {
        setCategories(old);
        toast({ title: "Error deleting category", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Category deleted" });
    },
    [categories, toast],
  );

  return { categories, loading, addCategory, renameCategory, deleteCategory };
};
