import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Client } from "@/types/client";
import { toast } from "@/hooks/use-toast";

export function useClients(userId?: string) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchClients = async () => {
      try {
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .eq("user_id", userId)
          .order("name", { ascending: true });

        if (error) throw error;
        setClients(data || []);
      } catch (error: any) {
        toast({
          title: "Error loading clients",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchClients();

    const channel = supabase
      .channel("clients-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clients",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchClients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const createClient = async (client: Omit<Client, "id" | "user_id" | "created_at" | "updated_at" | "next_invoice_number">) => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .insert([{ ...client, user_id: userId, next_invoice_number: 1 }])
        .select()
        .single();

      if (error) throw error;
      toast({ title: "Client created successfully" });
      return data.id;
    } catch (error: any) {
      toast({
        title: "Error creating client",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    try {
      const { error } = await supabase
        .from("clients")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Client updated successfully" });
    } catch (error: any) {
      toast({
        title: "Error updating client",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Client deleted successfully" });
    } catch (error: any) {
      toast({
        title: "Error deleting client",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const reserveNextInvoiceNumber = async (clientId: string): Promise<number | null> => {
    try {
      const { data, error } = await supabase.rpc("reserve_next_invoice_number" as any, {
        p_client_id: clientId,
      });
      if (error) throw error;
      return typeof data === "number" ? data : Number(data);
    } catch (error: any) {
      toast({
        title: "Error reserving invoice number",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  return {
    clients,
    loading,
    createClient,
    updateClient,
    deleteClient,
    reserveNextInvoiceNumber,
  };
}
