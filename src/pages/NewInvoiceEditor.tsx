import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompanies } from "@/hooks/useCompanies";
import { useClients } from "@/hooks/useClients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Save, Download, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { InvoiceLineItem } from "@/types/invoice";
import { InvoiceTemplateDialog, TemplateConfig } from "@/components/InvoiceTemplateDialog";
import JSZip from "jszip";

export default function NewInvoiceEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  
  const { companies } = useCompanies(userId || undefined);
  const { clients, reserveNextInvoiceNumber } = useClients(userId || undefined);

  const [formData, setFormData] = useState({
    company_id: "",
    client_id: "",
    invoice_number: "",
    invoice_date: new Date().toISOString().split("T")[0],
    status: "unpaid" as const,
    holdback_enabled: false,
    holdback_percentage: 10,
    tax_rate: 13,
    comments: "",
  });

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [newItem, setNewItem] = useState({
    description: "",
    hours: 0,
    price: 0,
  });
  const [loading, setLoading] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
      }
    });
  }, [navigate]);

  // Load existing invoice data
  useEffect(() => {
    if (!id || !userId) return;

    const loadInvoice = async () => {
      setLoading(true);
      try {
        const { data: invoice, error } = await supabase
          .from("invoices")
          .select(`
            *,
            line_items:invoice_line_items(*)
          `)
          .eq("id", id)
          .eq("user_id", userId)
          .single();

        if (error) throw error;

        if (invoice) {
          setFormData({
            company_id: invoice.company_id || "",
            client_id: invoice.client_id || "",
            invoice_number: invoice.invoice_number,
            invoice_date: invoice.invoice_date,
            status: invoice.status as any,
            holdback_enabled: invoice.holdback_enabled,
            holdback_percentage: invoice.holdback_percentage,
            tax_rate: invoice.tax_rate,
            comments: invoice.comments || "",
          });

          if (invoice.line_items) {
            setLineItems(invoice.line_items as InvoiceLineItem[]);
          }
        }
      } catch (error: any) {
        toast({
          title: "Error loading invoice",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadInvoice();
  }, [id, userId]);

  // Load attachments for the invoice
  useEffect(() => {
    if (!id) return;
    
    const loadAttachments = async () => {
      const { data, error } = await supabase
        .from("invoice_attachments")
        .select("*")
        .eq("invoice_id", id);
      
      if (!error && data) {
        setAttachments(data);
      }
    };
    
    loadAttachments();
  }, [id]);

  useEffect(() => {
    if (formData.client_id && !id) {
      const selectedClient = clients.find((c) => c.id === formData.client_id);
      if (selectedClient) {
        setFormData((prev) => ({
          ...prev,
          invoice_number: selectedClient.next_invoice_number.toString(),
        }));
      }
    }
  }, [formData.client_id, clients, id]);

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.hours * item.price), 0);
    const holdbackAmount = formData.holdback_enabled ? (subtotal * formData.holdback_percentage) / 100 : 0;
    const netAmount = subtotal - holdbackAmount;
    const taxDue = (netAmount * formData.tax_rate) / 100;
    const totalPayable = netAmount + taxDue;

    return { subtotal, holdbackAmount, netAmount, taxDue, totalPayable };
  };

  const handleAddLineItem = () => {
    if (!newItem.description) {
      toast({ title: "Description is required", variant: "destructive" });
      return;
    }
    const item: InvoiceLineItem = {
      id: crypto.randomUUID(),
      invoice_id: id || "",
      item_order: lineItems.length,
      description: newItem.description,
      hours: newItem.hours,
      price: newItem.price,
      amount: newItem.hours * newItem.price,
    };
    setLineItems([...lineItems, item]);
    setNewItem({ description: "", hours: 0, price: 0 });
  };

  const handleDeleteLineItem = (itemId: string) => {
    setLineItems(lineItems.filter((item) => item.id !== itemId));
  };

  const handleSave = async () => {
    if (!formData.company_id || !formData.client_id || !formData.invoice_number) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    const totals = calculateTotals();
    const selectedCompany = companies.find((c) => c.id === formData.company_id);
    const selectedClient = clients.find((c) => c.id === formData.client_id);

    const invoiceData = {
      user_id: userId,
      company_id: formData.company_id,
      client_id: formData.client_id,
      invoice_number: formData.invoice_number,
      invoice_date: formData.invoice_date,
      status: formData.status,
      company_name: selectedCompany?.name || "",
      company_address: selectedCompany?.address,
      company_hst: selectedCompany?.tax_id,
      company_phone: selectedCompany?.phone,
      company_email: selectedCompany?.email,
      company_website: selectedCompany?.website,
      client_name: selectedClient?.name || "",
      client_address: selectedClient?.address,
      holdback_enabled: formData.holdback_enabled,
      holdback_percentage: formData.holdback_percentage,
      holdback_amount: totals.holdbackAmount,
      subtotal_hours: lineItems.reduce((sum, item) => sum + item.hours, 0),
      net_amount: totals.netAmount,
      tax_rate: formData.tax_rate,
      tax_due: totals.taxDue,
      total_payable: totals.totalPayable,
      comments: formData.comments,
    };

    try {
      if (id) {
        const { error } = await supabase
          .from("invoices")
          .update(invoiceData as any)
          .eq("id", id);
        if (error) throw error;

        // Atomic replace of line items via security-definer RPC
        const itemsPayload = lineItems.map((item) => ({
          item_order: item.item_order,
          description: item.description,
          hours: item.hours,
          price: item.price,
          amount: item.amount,
        }));
        const { error: rpcErr } = await supabase.rpc(
          "replace_invoice_line_items" as any,
          { p_invoice_id: id, p_items: itemsPayload }
        );
        if (rpcErr) throw rpcErr;

        toast({ title: "Invoice updated successfully" });
      } else {
        // Reserve invoice number atomically before insert to avoid duplicates
        let invoiceNumber = formData.invoice_number;
        if (formData.client_id) {
          const reserved = await reserveNextInvoiceNumber(formData.client_id);
          if (reserved === null) return;
          invoiceNumber = reserved.toString();
        }

        const { data: newInvoice, error } = await supabase
          .from("invoices")
          .insert([{ ...invoiceData, invoice_number: invoiceNumber }])
          .select()
          .single();

        if (error) throw error;

        if (lineItems.length > 0) {
          const itemsData = lineItems.map((item) => ({
            invoice_id: newInvoice.id,
            item_order: item.item_order,
            description: item.description,
            hours: item.hours,
            price: item.price,
            amount: item.amount,
          }));
          const { error: itemsError } = await supabase
            .from("invoice_line_items")
            .insert(itemsData);
          if (itemsError) throw itemsError;
        }

        toast({ title: "Invoice created successfully" });
        navigate(`/invoices/${newInvoice.id}`);
      }
    } catch (error: any) {
      toast({
        title: "Error saving invoice",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = async (templateConfig: TemplateConfig) => {
    if (!id) {
      toast({
        title: "Please save the invoice first",
        description: "Save the invoice before downloading PDF",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);

    try {
      toast({
        title: "Generating PDF",
        description: attachments.length > 0 ? "Creating ZIP with attachments..." : "Please wait...",
      });

      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoiceId: id, templateConfig },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to generate PDF');
      }

      if (!data) {
        throw new Error('No data received from PDF service');
      }

      // If there are attachments, create a ZIP file
      if (attachments.length > 0) {
        const zip = new JSZip();
        
        // Add the HTML invoice as a file (user can print to PDF)
        zip.file(`Invoice_${formData.invoice_number}.html`, data);
        
        // Add a folder for attachments
        const attachmentsFolder = zip.folder("Attachments");
        
        // Fetch and add each attachment
        for (const attachment of attachments) {
          try {
            const { data: signedUrlData } = await supabase.storage
              .from('invoice-attachments')
              .createSignedUrl(attachment.file_path, 3600);
            
            if (signedUrlData?.signedUrl) {
              const response = await fetch(signedUrlData.signedUrl);
              const blob = await response.blob();
              attachmentsFolder?.file(attachment.file_name, blob);
            }
          } catch (err) {
            console.error('Error fetching attachment:', attachment.file_name, err);
          }
        }
        
        // Generate and download the ZIP
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Invoice_${formData.invoice_number}_Package.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Success",
          description: "ZIP package downloaded with invoice and attachments",
        });
      } else {
        // No attachments, just open the print preview
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (printWindow) {
          printWindow.document.write(data);
          printWindow.document.close();
          
          setTimeout(() => {
            printWindow.focus();
            printWindow.print();
          }, 1000);

          toast({
            title: "Success",
            description: "Use 'Save as PDF' in the print dialog",
          });
        } else {
          toast({
            title: "Popup Blocked",
            description: "Please allow popups for this site and try again",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
      setTemplateDialogOpen(false);
    }
  };

  const totals = calculateTotals();
  const selectedCompany = companies.find((c) => c.id === formData.company_id);
  const selectedClient = clients.find((c) => c.id === formData.client_id);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Top Actions */}
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={() => navigate("/invoices")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Invoices
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
          <Button onClick={() => setTemplateDialogOpen(true)}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Selection Bar */}
      <div className="grid grid-cols-3 gap-4 mb-8 p-4 bg-muted/30 rounded-lg">
        <div>
          <Label>Company Profile</Label>
          <Select value={formData.company_id} onValueChange={(value) => setFormData({ ...formData, company_id: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Client</Label>
          <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="paid_by_holdback">Paid by Holdback</SelectItem>
              <SelectItem value="holdback_remaining">Holdback Remaining</SelectItem>
              <SelectItem value="fully_paid">Fully Paid</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Invoice Preview */}
      <div className="bg-white border rounded-lg p-12 shadow-sm">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-start gap-4">
            {selectedCompany?.logo_url && (
              <img src={selectedCompany.logo_url} alt="Logo" className="h-16 w-16 object-contain" />
            )}
            <div>
              <h2 className="text-2xl font-bold text-foreground">{selectedCompany?.name || "Company Name"}</h2>
              {selectedCompany?.address && (
                <p className="text-sm text-muted-foreground whitespace-pre-line mt-1">{selectedCompany.address}</p>
              )}
              {selectedCompany?.tax_id && <p className="text-sm text-muted-foreground">{selectedCompany.tax_id}</p>}
              {selectedCompany?.phone && <p className="text-sm text-muted-foreground">{selectedCompany.phone}</p>}
              {selectedCompany?.email && <p className="text-sm text-muted-foreground">{selectedCompany.email}</p>}
              {selectedCompany?.website && <p className="text-sm text-muted-foreground">{selectedCompany.website}</p>}
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-5xl font-bold text-[hsl(var(--primary))] mb-4">INVOICE</h1>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="font-medium">DATE</span>
              <Input
                type="date"
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                className="h-8"
              />
              <span className="font-medium">INVOICE #</span>
              <Input
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                className="h-8"
              />
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-8">
          <div className="bg-[hsl(220,50%,45%)] text-white px-3 py-2 font-semibold mb-2">
            BILL TO
          </div>
          <div className="pl-3">
            <p className="font-medium text-foreground">{selectedClient?.name || "Client Name"}</p>
            {selectedClient?.address && (
              <p className="text-sm text-muted-foreground whitespace-pre-line">{selectedClient.address}</p>
            )}
          </div>
        </div>

        {/* Line Items */}
        <div className="mb-8">
          <div className="bg-[hsl(220,50%,45%)] text-white grid grid-cols-[2fr,1fr,1fr,1fr] px-3 py-2 font-semibold">
            <div>DESCRIPTION</div>
            <div className="text-center">HR</div>
            <div className="text-center">Price</div>
            <div className="text-right">AMOUNT</div>
          </div>
          <div className="border-x border-b">
            {lineItems.map((item, idx) => (
              <div key={item.id} className={`grid grid-cols-[2fr,1fr,1fr,1fr] px-3 py-2 ${idx % 2 === 0 ? "bg-muted/20" : ""}`}>
                <div className="text-sm">{item.description}</div>
                <div className="text-center text-sm">{item.hours}</div>
                <div className="text-center text-sm">${item.price.toFixed(2)}</div>
                <div className="text-right text-sm flex justify-between items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleDeleteLineItem(item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  <span>${item.amount.toFixed(2)}</span>
                </div>
              </div>
            ))}
            {/* Add New Line Item */}
            <div className="grid grid-cols-[2fr,1fr,1fr,1fr] px-3 py-2 gap-2 bg-muted/10">
              <Input
                placeholder="Description"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                className="h-8"
              />
              <Input
                type="number"
                placeholder="Hours"
                value={newItem.hours || ""}
                onChange={(e) => setNewItem({ ...newItem, hours: parseFloat(e.target.value) || 0 })}
                className="h-8"
              />
              <Input
                type="number"
                placeholder="Price"
                value={newItem.price || ""}
                onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
                className="h-8"
              />
              <Button onClick={handleAddLineItem} size="sm" className="h-8">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Totals and Comments */}
        <div className="grid grid-cols-2 gap-8">
          {/* Comments */}
          <div>
            <div className="bg-[hsl(220,50%,45%)] text-white px-3 py-2 font-semibold mb-2">
              OTHER COMMENTS
            </div>
            <Textarea
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              placeholder="Thank you for your business..."
              className="min-h-[100px]"
            />
          </div>

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between py-2 border-b">
              <span>Subtotal</span>
              <span className="font-semibold">${totals.subtotal.toFixed(2)}</span>
            </div>
            
            {/* Holdback Toggle */}
            <div className="flex items-center gap-2 py-2">
              <Switch
                checked={formData.holdback_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, holdback_enabled: checked })}
              />
              <Label>Enable Holdback</Label>
              {formData.holdback_enabled && (
                <Input
                  type="number"
                  value={formData.holdback_percentage}
                  onChange={(e) => setFormData({ ...formData, holdback_percentage: parseFloat(e.target.value) || 10 })}
                  className="w-20 h-8"
                  min="0"
                  max="100"
                />
              )}
            </div>

            {formData.holdback_enabled && (
              <div className="flex justify-between py-2 bg-destructive/10 px-3 -mx-3 border-y border-destructive/30">
                <span className="text-destructive font-medium">Holdback Deduction ({formData.holdback_percentage}%)</span>
                <span className="text-destructive font-semibold">-${totals.holdbackAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between py-2 border-b">
              <span className="font-semibold">NET AMOUNT</span>
              <span className="font-bold">${totals.netAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span>Tax rate</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={formData.tax_rate}
                  onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 13 })}
                  className="w-20 h-8"
                  step="0.01"
                />
                <span>%</span>
              </div>
            </div>

            <div className="flex justify-between py-2 border-b">
              <span>Tax due</span>
              <span className="font-semibold">${totals.taxDue.toFixed(2)}</span>
            </div>

            <div className="flex justify-between py-3 bg-primary/10 px-3 -mx-3">
              <span className="font-bold text-lg">Total Payable</span>
              <span className="font-bold text-lg">${totals.totalPayable.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <InvoiceTemplateDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        onDownload={handleDownloadPDF}
        attachmentCount={attachments.length}
        isLoading={isDownloading}
      />
    </div>
  );
}
