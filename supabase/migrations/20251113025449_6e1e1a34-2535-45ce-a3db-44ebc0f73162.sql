-- Create storage bucket for work period images
INSERT INTO storage.buckets (id, name, public)
VALUES ('work-period-images', 'work-period-images', true);

-- Add RLS policies for work period images
CREATE POLICY "Users can view images for their work periods"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'work-period-images' AND
  EXISTS (
    SELECT 1 FROM work_periods wp
    JOIN projects p ON wp.project_id = p.id
    WHERE p.user_id = auth.uid()
    AND (storage.foldername(name))[1] = wp.id::text
  )
);

CREATE POLICY "Users can upload images for their work periods"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'work-period-images' AND
  EXISTS (
    SELECT 1 FROM work_periods wp
    JOIN projects p ON wp.project_id = p.id
    WHERE p.user_id = auth.uid()
    AND (storage.foldername(name))[1] = wp.id::text
  )
);

CREATE POLICY "Users can delete images for their work periods"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'work-period-images' AND
  EXISTS (
    SELECT 1 FROM work_periods wp
    JOIN projects p ON wp.project_id = p.id
    WHERE p.user_id = auth.uid()
    AND (storage.foldername(name))[1] = wp.id::text
  )
);

-- Add images column to work_periods table
ALTER TABLE work_periods
ADD COLUMN images text[] DEFAULT '{}';