import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Invoice, InvoiceLineItem, InvoiceAttachment } from "@/types/invoice";
import { useToast } from "@/hooks/use-toast";

export const useInvoices = (userId?: string) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    const fetchInvoices = async () => {
      try {
        const { data, error } = await supabase
          .from("invoices")
          .select(`
            *,
            line_items:invoice_line_items(*),
            attachments:invoice_attachments(*)
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        
        const formattedInvoices = (data || []).map(inv => ({
          ...inv,
          line_items: (inv.line_items || []).sort((a: InvoiceLineItem, b: InvoiceLineItem) => 
            a.item_order - b.item_order
          )
        }));
        
        setInvoices(formattedInvoices as Invoice[]);
      } catch (error: any) {
        console.error("Error fetching invoices:", error);
        toast({
          title: "Error",
          description: "Failed to load invoices",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();

    // Set up real-time subscription
    const channel = supabase
      .channel("invoices_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "invoices",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchInvoices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, toast]);

  const createInvoice = async (invoice: Omit<Invoice, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'line_items' | 'attachments'>) => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .insert([{ 
          ...invoice,
          user_id: userId,
          invoice_number: invoice.invoice_number,
          client_name: invoice.client_name,
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invoice created successfully",
      });

      return data.id;
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      toast({
        title: "Error",
        description: "Failed to create invoice",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateInvoice = async (id: string, updates: Partial<Invoice>) => {
    try {
      // Get current invoice to check for status changes
      const currentInvoice = invoices.find(inv => inv.id === id);
      
      const { error } = await supabase
        .from("invoices")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      // Handle automatic income creation based on status changes
      if (updates.status && currentInvoice && updates.status !== currentInvoice.status) {
        await handleInvoiceStatusChange(currentInvoice, updates.status, updates);
      }

      toast({
        title: "Success",
        description: "Invoice updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating invoice:", error);
      toast({
        title: "Error",
        description: "Failed to update invoice",
        variant: "destructive",
      });
    }
  };

  const handleInvoiceStatusChange = async (
    invoice: Invoice, 
    newStatus: string,
    updates: Partial<Invoice>
  ) => {
    try {
      const oldStatus = invoice.status;
      const companyId = updates.company_id ?? invoice.company_id;
      const invoiceTotal = updates.total_payable ?? invoice.total_payable ?? 0;
      const holdbackAmount = updates.holdback_amount ?? invoice.holdback_amount ?? 0;
      const netAmount = updates.net_amount ?? invoice.net_amount ?? 0;
      const holdbackEnabled = updates.holdback_enabled ?? invoice.holdback_enabled;

      // Scenario A: Standard Paid (no holdback) - add full amount
      if (newStatus === 'fully_paid' && !holdbackEnabled) {
        await createIncomeFromInvoice(
          invoiceTotal,
          companyId,
          `Invoice ${invoice.invoice_number} - Full Payment`
        );
      }
      
      // Scenario B: Holdback Remaining - add net amount (total - holdback)
      else if (newStatus === 'holdback_remaining' && oldStatus === 'unpaid') {
        await createIncomeFromInvoice(
          netAmount,
          companyId,
          `Invoice ${invoice.invoice_number} - Partial Payment (Holdback Retained)`
        );
      }
      
      // Scenario C: Fully Paid after Holdback - add the holdback amount
      else if (newStatus === 'fully_paid' && oldStatus === 'holdback_remaining') {
        await createIncomeFromInvoice(
          holdbackAmount,
          companyId,
          `Invoice ${invoice.invoice_number} - Holdback Released`
        );
      }
      
      // Scenario: Direct fully paid with holdback (from unpaid) - add full amount
      else if (newStatus === 'fully_paid' && holdbackEnabled && oldStatus === 'unpaid') {
        await createIncomeFromInvoice(
          invoiceTotal,
          companyId,
          `Invoice ${invoice.invoice_number} - Full Payment (Including Holdback)`
        );
      }
    } catch (error) {
      console.error("Error handling invoice status change:", error);
    }
  };

  const createIncomeFromInvoice = async (
    amount: number,
    companyId: string | undefined,
    description: string
  ) => {
    if (amount <= 0) return;
    
    try {
      const { error } = await supabase
        .from("income")
        .insert([{
          user_id: userId,
          amount,
          company_id: companyId,
          description,
          income_date: new Date().toISOString().split('T')[0],
        }]);

      if (error) throw error;
    } catch (error) {
      console.error("Error creating income from invoice:", error);
      throw error;
    }
  };

  const deleteInvoice = async (id: string) => {
    try {
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting invoice:", error);
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      });
    }
  };

  const addLineItem = async (invoiceId: string, lineItem: Omit<InvoiceLineItem, "id" | "invoice_id">) => {
    try {
      const { error } = await supabase
        .from("invoice_line_items")
        .insert([{ ...lineItem, invoice_id: invoiceId }]);

      if (error) throw error;
    } catch (error: any) {
      console.error("Error adding line item:", error);
      toast({
        title: "Error",
        description: "Failed to add line item",
        variant: "destructive",
      });
    }
  };

  const updateLineItem = async (id: string, updates: Partial<InvoiceLineItem>) => {
    try {
      const { error } = await supabase
        .from("invoice_line_items")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    } catch (error: any) {
      console.error("Error updating line item:", error);
      toast({
        title: "Error",
        description: "Failed to update line item",
        variant: "destructive",
      });
    }
  };

  const deleteLineItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from("invoice_line_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
    } catch (error: any) {
      console.error("Error deleting line item:", error);
      toast({
        title: "Error",
        description: "Failed to delete line item",
        variant: "destructive",
      });
    }
  };

  const uploadAttachment = async (invoiceId: string, file: File, description?: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('invoice-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('invoice_attachments')
        .insert([{
          invoice_id: invoiceId,
          file_path: filePath,
          file_name: file.name,
          file_type: file.type,
          description
        }]);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Attachment uploaded successfully",
      });
    } catch (error: any) {
      console.error("Error uploading attachment:", error);
      toast({
        title: "Error",
        description: "Failed to upload attachment",
        variant: "destructive",
      });
    }
  };

  const deleteAttachment = async (attachment: InvoiceAttachment) => {
    try {
      const { error: storageError } = await supabase.storage
        .from('invoice-attachments')
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('invoice_attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Attachment deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting attachment:", error);
      toast({
        title: "Error",
        description: "Failed to delete attachment",
        variant: "destructive",
      });
    }
  };

  return {
    invoices,
    loading,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    addLineItem,
    updateLineItem,
    deleteLineItem,
    uploadAttachment,
    deleteAttachment,
  };
};
