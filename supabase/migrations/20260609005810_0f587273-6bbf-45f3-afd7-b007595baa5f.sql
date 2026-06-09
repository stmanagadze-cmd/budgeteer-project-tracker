
-- 1) Storage: restrict listing on company-logos to owner (folder = auth.uid())
DROP POLICY IF EXISTS "Company logos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own company logos" ON storage.objects;

CREATE POLICY "Users can list their own company logos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'company-logos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 2) Realtime: require topic to start with subscriber's auth.uid()
DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON realtime.messages;
DROP POLICY IF EXISTS "authenticated can read messages" ON realtime.messages;
DROP POLICY IF EXISTS "Allow authenticated realtime" ON realtime.messages;

CREATE POLICY "Users can only subscribe to their own topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic()) LIKE ((auth.uid())::text || ':%')
  OR (realtime.topic()) LIKE ((auth.uid())::text || '-%')
);
