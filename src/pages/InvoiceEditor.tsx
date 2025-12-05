import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, FileDown, Trash2 } from "lucide-react";
import { useInvoices } from "@/hooks/useInvoices";
import { Invoice } from "@/types/invoice";
import { InvoiceLineItems } from "@/components/InvoiceLineItems";
import { InvoiceAttachments } from "@/components/InvoiceAttachments";
import { useToast } from "@/hooks/use-toast";

const InvoiceEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | undefined>();
  const {
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
  } = useInvoices(userId);

  const isNew = id === "new";
  const invoice = isNew ? null : invoices.find((inv) => inv.id === id);

  const [formData, setFormData] = useState<Partial<Invoice>>({
    invoice_number: "",
    invoice_date: new Date().toISOString().split('T')[0],
    status: "draft",
    company_name: "KickGlassInstallation INC.",
    company_address: "2 Rustwood Rd, Vaughan, On, L4J 9K3",
    company_hst: "759669138 RT0050",
    company_phone: "",
    company_email: "",
    company_website: "",
    client_name: "",
    client_address: "",
    client_contact: "",
    client_email: "",
    client_phone: "",
    total_km: 0,
    fuel_charge: 0,
    tax_rate: 13.0,
    comments: "1. Thank you for putting your trust and confidence in our company.",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (invoice) {
      setFormData(invoice);
    }
  }, [invoice]);

  const handleInputChange = (field: keyof Invoice, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const calculateTotals = () => {
    const lineItems = invoice?.line_items || [];
    const subtotalHours = lineItems.reduce((sum, item) => sum + item.hours, 0);
    const subtotalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const netAmount = subtotalAmount + (formData.fuel_charge || 0);
    const taxDue = netAmount * ((formData.tax_rate || 0) / 100);
    const totalPayable = netAmount + taxDue;

    return {
      subtotal_hours: subtotalHours,
      net_amount: netAmount,
      tax_due: taxDue,
      total_payable: totalPayable,
    };
  };

  const handleSave = async () => {
    if (!formData.invoice_number || !formData.client_name) {
      toast({
        title: "Validation Error",
        description: "Invoice number and client name are required",
        variant: "destructive",
      });
      return;
    }

    const totals = calculateTotals();
    const dataToSave = { ...formData, ...totals };

    if (isNew) {
      const newId = await createInvoice(dataToSave as any);
      if (newId) {
        navigate(`/invoices/${newId}`);
      }
    } else if (invoice) {
      await updateInvoice(invoice.id, dataToSave);
    }
  };

  const handleDelete = async () => {
    if (!invoice || !confirm("Are you sure you want to delete this invoice?")) return;
    
    await deleteInvoice(invoice.id);
    navigate("/invoices");
  };

  const handleExportPDF = async () => {
    if (!invoice) {
      toast({
        title: "Error",
        description: "Please save the invoice first",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Generating PDF",
        description: "Opening print preview...",
      });

      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoiceId: invoice.id },
      });

      if (error) throw error;

      // Open HTML in new window for print-to-PDF
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(data);
        printWindow.document.close();
        
        // Wait for images to load then trigger print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
      } else {
        throw new Error('Could not open print window. Please allow popups.');
      }

      toast({
        title: "Success",
        description: "Use 'Save as PDF' in the print dialog to download",
      });
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  if (loading && !isNew) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate("/invoices")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Invoices
          </Button>
          <div className="flex gap-2">
            {!isNew && (
              <>
                <Button variant="outline" onClick={handleExportPDF} className="gap-2">
                  <FileDown className="h-4 w-4" />
                  Export PDF
                </Button>
                <Button variant="destructive" onClick={handleDelete} className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </>
            )}
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" />
              Save Invoice
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-6xl space-y-6">
        {/* Header Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Company Name</Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => handleInputChange("company_name", e.target.value)}
                />
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={formData.company_address || ""}
                  onChange={(e) => handleInputChange("company_address", e.target.value)}
                />
              </div>
              <div>
                <Label>HST / TAX Number</Label>
                <Input
                  value={formData.company_hst || ""}
                  onChange={(e) => handleInputChange("company_hst", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={formData.company_phone || ""}
                    onChange={(e) => handleInputChange("company_phone", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.company_email || ""}
                    onChange={(e) => handleInputChange("company_email", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>Website</Label>
                <Input
                  value={formData.company_website || ""}
                  onChange={(e) => handleInputChange("company_website", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Invoice Number *</Label>
                <Input
                  value={formData.invoice_number}
                  onChange={(e) => handleInputChange("invoice_number", e.target.value)}
                  placeholder="INV-001"
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => handleInputChange("invoice_date", e.target.value)}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Client Info */}
        <Card>
          <CardHeader>
            <CardTitle>Bill To</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Client / Company Name *</Label>
                <Input
                  value={formData.client_name}
                  onChange={(e) => handleInputChange("client_name", e.target.value)}
                  placeholder="Torvan Contracting"
                />
              </div>
              <div>
                <Label>Contact Person</Label>
                <Input
                  value={formData.client_contact || ""}
                  onChange={(e) => handleInputChange("client_contact", e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={formData.client_address || ""}
                onChange={(e) => handleInputChange("client_address", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.client_email || ""}
                  onChange={(e) => handleInputChange("client_email", e.target.value)}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={formData.client_phone || ""}
                  onChange={(e) => handleInputChange("client_phone", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        {!isNew && invoice && (
          <Card>
            <CardContent className="pt-6">
              <InvoiceLineItems
                items={invoice.line_items || []}
                onAddItem={(item) => addLineItem(invoice.id, item)}
                onUpdateItem={updateLineItem}
                onDeleteItem={deleteLineItem}
              />
            </CardContent>
          </Card>
        )}

        {/* Totals */}
        <Card>
          <CardHeader>
            <CardTitle>Totals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-md ml-auto space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Total KM</Label>
                  <Input
                    type="number"
                    value={formData.total_km}
                    onChange={(e) => handleInputChange("total_km", parseFloat(e.target.value) || 0)}
                    step="0.1"
                  />
                </div>
                <div>
                  <Label>Fuel Charge ($)</Label>
                  <Input
                    type="number"
                    value={formData.fuel_charge}
                    onChange={(e) => handleInputChange("fuel_charge", parseFloat(e.target.value) || 0)}
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <Label>Tax Rate (%)</Label>
                <Input
                  type="number"
                  value={formData.tax_rate}
                  onChange={(e) => handleInputChange("tax_rate", parseFloat(e.target.value) || 0)}
                  step="0.001"
                />
              </div>
              <div className="pt-4 border-t space-y-2">
                {invoice && (
                  <>
                    <div className="flex justify-between">
                      <span>Net Amount:</span>
                      <span className="font-medium">${calculateTotals().net_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax Due:</span>
                      <span className="font-medium">${calculateTotals().tax_due.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Payable:</span>
                      <span>${calculateTotals().total_payable.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments */}
        <Card>
          <CardHeader>
            <CardTitle>Other Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.comments || ""}
              onChange={(e) => handleInputChange("comments", e.target.value)}
              rows={4}
              placeholder="Add any additional comments or notes..."
            />
          </CardContent>
        </Card>

        {/* Attachments */}
        {!isNew && invoice && (
          <Card>
            <CardContent className="pt-6">
              <InvoiceAttachments
                invoiceId={invoice.id}
                attachments={invoice.attachments || []}
                onUpload={(file, desc) => uploadAttachment(invoice.id, file, desc)}
                onDelete={deleteAttachment}
              />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default InvoiceEditor;
