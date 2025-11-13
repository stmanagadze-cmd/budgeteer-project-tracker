-- Drop existing policies for work-period-images
DROP POLICY IF EXISTS "Users can view images for their work periods" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload images for their work periods" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete images for their work periods" ON storage.objects;

-- Create simpler, more permissive policies for work-period-images bucket
CREATE POLICY "Authenticated users can upload work period images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'work-period-images'
);

CREATE POLICY "Users can view their own work period images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'work-period-images'
);

CREATE POLICY "Authenticated users can delete work period images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'work-period-images'
);