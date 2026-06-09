import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Contract, ChangeOrder, ContractDocument } from "@/types/contract";
import { toast } from "@/hooks/use-toast";

export function useContracts(userId?: string) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchContracts = async () => {
      try {
        const { data, error } = await supabase
          .from("contracts")
          .select(`
            *,
            change_orders(*),
            documents:contract_documents(*)
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setContracts((data || []) as Contract[]);
      } catch (error: any) {
        toast({ title: "Error loading contracts", description: error.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();

    const channel = supabase
      .channel(`${userId}:contracts-changes`)
      .on("postgres_changes", { event: "*", schema: "public", table: "contracts", filter: `user_id=eq.${userId}` }, () => fetchContracts())
      .on("postgres_changes", { event: "*", schema: "public", table: "change_orders" }, () => fetchContracts())
      .on("postgres_changes", { event: "*", schema: "public", table: "contract_documents" }, () => fetchContracts())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const createContract = async (contract: Pick<Contract, "project_title" | "original_amount" | "status" | "client_id" | "company_id" | "notes">) => {
    try {
      const { data, error } = await supabase
        .from("contracts")
        .insert([{ ...contract, user_id: userId }])
        .select()
        .single();
      if (error) throw error;
      toast({ title: "Contract created successfully" });
      return data.id;
    } catch (error: any) {
      toast({ title: "Error creating contract", description: error.message, variant: "destructive" });
      return null;
    }
  };

  const updateContract = async (id: string, updates: Partial<Contract>) => {
    try {
      const { error } = await supabase.from("contracts").update(updates as any).eq("id", id);
      if (error) throw error;
      toast({ title: "Contract updated successfully" });
    } catch (error: any) {
      toast({ title: "Error updating contract", description: error.message, variant: "destructive" });
    }
  };

  const deleteContract = async (id: string) => {
    try {
      const { error } = await supabase.from("contracts").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Contract deleted successfully" });
    } catch (error: any) {
      toast({ title: "Error deleting contract", description: error.message, variant: "destructive" });
    }
  };

  const addChangeOrder = async (contractId: string, description: string, amount: number) => {
    try {
      const { error } = await supabase
        .from("change_orders")
        .insert([{ contract_id: contractId, description, amount }]);
      if (error) throw error;
      toast({ title: "Change order added" });
    } catch (error: any) {
      toast({ title: "Error adding change order", description: error.message, variant: "destructive" });
    }
  };

  const deleteChangeOrder = async (id: string) => {
    try {
      const { error } = await supabase.from("change_orders").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Change order removed" });
    } catch (error: any) {
      toast({ title: "Error removing change order", description: error.message, variant: "destructive" });
    }
  };

  const uploadDocument = async (contractId: string, file: File, description?: string) => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${userId}/${contractId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("contract-documents")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from("contract_documents")
        .insert([{ contract_id: contractId, file_path: filePath, file_name: file.name, file_type: file.type, description }]);
      if (dbError) throw dbError;

      toast({ title: "Document uploaded successfully" });
    } catch (error: any) {
      toast({ title: "Error uploading document", description: error.message, variant: "destructive" });
    }
  };

  const deleteDocument = async (doc: ContractDocument) => {
    try {
      await supabase.storage.from("contract-documents").remove([doc.file_path]);
      const { error } = await supabase.from("contract_documents").delete().eq("id", doc.id);
      if (error) throw error;
      toast({ title: "Document deleted" });
    } catch (error: any) {
      toast({ title: "Error deleting document", description: error.message, variant: "destructive" });
    }
  };

  const getDocumentUrl = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from("contract-documents")
      .createSignedUrl(filePath, 3600);
    if (error) return null;
    return data.signedUrl;
  };

  return {
    contracts, loading,
    createContract, updateContract, deleteContract,
    addChangeOrder, deleteChangeOrder,
    uploadDocument, deleteDocument, getDocumentUrl,
  };
}
