-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid')),
  
  -- Company info
  company_name TEXT NOT NULL DEFAULT 'KickGlassInstallation INC.',
  company_address TEXT,
  company_hst TEXT,
  company_phone TEXT,
  company_email TEXT,
  company_website TEXT,
  
  -- Client info
  client_name TEXT NOT NULL,
  client_address TEXT,
  client_contact TEXT,
  client_email TEXT,
  client_phone TEXT,
  
  -- Totals
  subtotal_hours NUMERIC DEFAULT 0,
  total_km NUMERIC DEFAULT 0,
  fuel_charge NUMERIC DEFAULT 0,
  net_amount NUMERIC DEFAULT 0,
  tax_rate NUMERIC DEFAULT 13.0,
  tax_due NUMERIC DEFAULT 0,
  total_payable NUMERIC DEFAULT 0,
  
  -- Notes
  comments TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoice line items table
CREATE TABLE public.invoice_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  item_order INTEGER NOT NULL,
  description TEXT NOT NULL,
  hours NUMERIC NOT NULL DEFAULT 0,
  price NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoice attachments table
CREATE TABLE public.invoice_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoices
CREATE POLICY "Users can view their own invoices"
ON public.invoices FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own invoices"
ON public.invoices FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices"
ON public.invoices FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices"
ON public.invoices FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for line items
CREATE POLICY "Users can view line items for their invoices"
ON public.invoice_line_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.invoices
  WHERE invoices.id = invoice_line_items.invoice_id
  AND invoices.user_id = auth.uid()
));

CREATE POLICY "Users can create line items for their invoices"
ON public.invoice_line_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.invoices
  WHERE invoices.id = invoice_line_items.invoice_id
  AND invoices.user_id = auth.uid()
));

CREATE POLICY "Users can update line items for their invoices"
ON public.invoice_line_items FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.invoices
  WHERE invoices.id = invoice_line_items.invoice_id
  AND invoices.user_id = auth.uid()
));

CREATE POLICY "Users can delete line items for their invoices"
ON public.invoice_line_items FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.invoices
  WHERE invoices.id = invoice_line_items.invoice_id
  AND invoices.user_id = auth.uid()
));

-- RLS Policies for attachments
CREATE POLICY "Users can view attachments for their invoices"
ON public.invoice_attachments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.invoices
  WHERE invoices.id = invoice_attachments.invoice_id
  AND invoices.user_id = auth.uid()
));

CREATE POLICY "Users can create attachments for their invoices"
ON public.invoice_attachments FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.invoices
  WHERE invoices.id = invoice_attachments.invoice_id
  AND invoices.user_id = auth.uid()
));

CREATE POLICY "Users can update attachments for their invoices"
ON public.invoice_attachments FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.invoices
  WHERE invoices.id = invoice_attachments.invoice_id
  AND invoices.user_id = auth.uid()
));

CREATE POLICY "Users can delete attachments for their invoices"
ON public.invoice_attachments FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.invoices
  WHERE invoices.id = invoice_attachments.invoice_id
  AND invoices.user_id = auth.uid()
));

-- Create storage bucket for invoice attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('invoice-attachments', 'invoice-attachments', false);

-- Storage policies for invoice attachments
CREATE POLICY "Users can view their own invoice attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'invoice-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own invoice attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'invoice-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own invoice attachments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'invoice-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own invoice attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'invoice-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create trigger for updating timestamps
CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();