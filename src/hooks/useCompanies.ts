import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Company } from "@/types/company";
import { toast } from "@/hooks/use-toast";

export function useCompanies(userId?: string) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchCompanies = async () => {
      try {
        const { data, error } = await supabase
          .from("companies")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setCompanies(data || []);
      } catch (error: any) {
        toast({
          title: "Error loading companies",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();

    const channel = supabase
      .channel("companies-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "companies",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchCompanies();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const createCompany = async (company: Omit<Company, "id" | "user_id" | "created_at" | "updated_at">) => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .insert([{ ...company, user_id: userId }])
        .select()
        .single();

      if (error) throw error;
      toast({ title: "Company created successfully" });
      return data.id;
    } catch (error: any) {
      toast({
        title: "Error creating company",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const updateCompany = async (id: string, updates: Partial<Company>) => {
    try {
      const { error } = await supabase
        .from("companies")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Company updated successfully" });
    } catch (error: any) {
      toast({
        title: "Error updating company",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteCompany = async (id: string) => {
    try {
      const { error } = await supabase
        .from("companies")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Company deleted successfully" });
    } catch (error: any) {
      toast({
        title: "Error deleting company",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const uploadLogo = async (companyId: string, file: File): Promise<string | null> => {
    try {
      const allowedMime: Record<string, string> = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
      };
      const ext = allowedMime[file.type];
      if (!ext) {
        throw new Error('Invalid file type. Only PNG and JPEG images are allowed.');
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image is too large. Maximum size is 5 MB.');
      }

      const fileName = `${userId}/${companyId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(fileName, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("company-logos")
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error: any) {
      toast({
        title: "Error uploading logo",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  return {
    companies,
    loading,
    createCompany,
    updateCompany,
    deleteCompany,
    uploadLogo,
  };
}
