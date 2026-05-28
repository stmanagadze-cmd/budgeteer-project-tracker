
-- Tighten work-period-images storage policies
DROP POLICY IF EXISTS "Authenticated users can upload work period images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own work period images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete work period images" ON storage.objects;

CREATE POLICY "Users select own work period images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'work-period-images'
  AND EXISTS (
    SELECT 1 FROM public.work_periods wp
    JOIN public.projects p ON p.id = wp.project_id
    WHERE wp.id::text = (storage.foldername(name))[1]
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users insert own work period images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'work-period-images'
  AND EXISTS (
    SELECT 1 FROM public.work_periods wp
    JOIN public.projects p ON p.id = wp.project_id
    WHERE wp.id::text = (storage.foldername(name))[1]
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users delete own work period images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'work-period-images'
  AND EXISTS (
    SELECT 1 FROM public.work_periods wp
    JOIN public.projects p ON p.id = wp.project_id
    WHERE wp.id::text = (storage.foldername(name))[1]
      AND p.user_id = auth.uid()
  )
);

-- Tighten contract-documents storage policies
-- Path convention: {user_id}/{contract_id}/{file_name}
DROP POLICY IF EXISTS "Users can upload contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete contract documents" ON storage.objects;

CREATE POLICY "Users select own contract documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'contract-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id::text = (storage.foldername(name))[2]
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users insert own contract documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'contract-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id::text = (storage.foldername(name))[2]
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users delete own contract documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'contract-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id::text = (storage.foldername(name))[2]
      AND c.user_id = auth.uid()
  )
);

-- Atomic invoice line item replacement
CREATE OR REPLACE FUNCTION public.replace_invoice_line_items(p_invoice_id uuid, p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner FROM public.invoices WHERE id = p_invoice_id;
  IF v_owner IS NULL OR v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM public.invoice_line_items WHERE invoice_id = p_invoice_id;

  IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    INSERT INTO public.invoice_line_items (invoice_id, item_order, description, hours, price, amount)
    SELECT
      p_invoice_id,
      COALESCE((item->>'item_order')::int, 0),
      COALESCE(item->>'description', ''),
      COALESCE((item->>'hours')::numeric, 0),
      COALESCE((item->>'price')::numeric, 0),
      COALESCE((item->>'amount')::numeric, 0)
    FROM jsonb_array_elements(p_items) AS item;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.replace_invoice_line_items(uuid, jsonb) TO authenticated;

-- Atomic invoice number reservation
CREATE OR REPLACE FUNCTION public.reserve_next_invoice_number(p_client_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_number integer;
BEGIN
  UPDATE public.clients
     SET next_invoice_number = next_invoice_number + 1
   WHERE id = p_client_id AND user_id = auth.uid()
  RETURNING next_invoice_number - 1 INTO v_number;

  IF v_number IS NULL THEN
    RAISE EXCEPTION 'Client not found or not authorized';
  END IF;

  RETURN v_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reserve_next_invoice_number(uuid) TO authenticated;
