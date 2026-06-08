
-- 1) Lock down SECURITY DEFINER RPCs
REVOKE EXECUTE ON FUNCTION public.replace_invoice_line_items(uuid, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reserve_next_invoice_number(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_invoice_line_items(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_next_invoice_number(uuid) TO authenticated;

-- 2) Contract documents: add UPDATE policy mirroring INSERT/DELETE ownership
DROP POLICY IF EXISTS "Users update own contract documents" ON storage.objects;
CREATE POLICY "Users update own contract documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'contract-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id::text = (storage.foldername(name))[2]
      AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'contract-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id::text = (storage.foldername(name))[2]
      AND c.user_id = auth.uid()
  )
);

-- 3) company-logos: drop broad SELECT (listing) policy; public URLs still work for public buckets
DROP POLICY IF EXISTS "Public can view company logos" ON storage.objects;

-- 4) Realtime: scope channel access to authenticated users only (default deny for anon)
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can receive realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated users can receive realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);
