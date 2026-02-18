
-- Contracts table
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  project_title TEXT NOT NULL,
  original_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contracts" ON public.contracts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own contracts" ON public.contracts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own contracts" ON public.contracts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own contracts" ON public.contracts FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Change Orders table
CREATE TABLE public.change_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view change orders for their contracts" ON public.change_orders FOR SELECT USING (EXISTS (SELECT 1 FROM contracts WHERE contracts.id = change_orders.contract_id AND contracts.user_id = auth.uid()));
CREATE POLICY "Users can create change orders for their contracts" ON public.change_orders FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM contracts WHERE contracts.id = change_orders.contract_id AND contracts.user_id = auth.uid()));
CREATE POLICY "Users can update change orders for their contracts" ON public.change_orders FOR UPDATE USING (EXISTS (SELECT 1 FROM contracts WHERE contracts.id = change_orders.contract_id AND contracts.user_id = auth.uid()));
CREATE POLICY "Users can delete change orders for their contracts" ON public.change_orders FOR DELETE USING (EXISTS (SELECT 1 FROM contracts WHERE contracts.id = change_orders.contract_id AND contracts.user_id = auth.uid()));

-- Contract Documents table
CREATE TABLE public.contract_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents for their contracts" ON public.contract_documents FOR SELECT USING (EXISTS (SELECT 1 FROM contracts WHERE contracts.id = contract_documents.contract_id AND contracts.user_id = auth.uid()));
CREATE POLICY "Users can create documents for their contracts" ON public.contract_documents FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM contracts WHERE contracts.id = contract_documents.contract_id AND contracts.user_id = auth.uid()));
CREATE POLICY "Users can update documents for their contracts" ON public.contract_documents FOR UPDATE USING (EXISTS (SELECT 1 FROM contracts WHERE contracts.id = contract_documents.contract_id AND contracts.user_id = auth.uid()));
CREATE POLICY "Users can delete documents for their contracts" ON public.contract_documents FOR DELETE USING (EXISTS (SELECT 1 FROM contracts WHERE contracts.id = contract_documents.contract_id AND contracts.user_id = auth.uid()));

-- Storage bucket for contract documents
INSERT INTO storage.buckets (id, name, public) VALUES ('contract-documents', 'contract-documents', false);

CREATE POLICY "Users can upload contract documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'contract-documents' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can view contract documents" ON storage.objects FOR SELECT USING (bucket_id = 'contract-documents' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete contract documents" ON storage.objects FOR DELETE USING (bucket_id = 'contract-documents' AND auth.uid() IS NOT NULL);
