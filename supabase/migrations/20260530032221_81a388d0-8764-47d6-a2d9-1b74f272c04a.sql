DROP POLICY IF EXISTS "Authenticated users can upload work period images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own work period images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete work period images" ON storage.objects;
DROP POLICY IF EXISTS "Users can access their own work period images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own work period images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own work period images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own work period images" ON storage.objects;
DROP POLICY IF EXISTS "Users select own work period images" ON storage.objects;
DROP POLICY IF EXISTS "Users insert own work period images" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own work period images" ON storage.objects;
DROP POLICY IF EXISTS "Users update own work period images" ON storage.objects;

CREATE POLICY "Users can view their own work period images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'work-period-images'
  AND EXISTS (
    SELECT 1
    FROM public.work_periods wp
    JOIN public.projects p ON p.id = wp.project_id
    WHERE p.user_id = auth.uid()
      AND (storage.foldername(storage.objects.name))[1] = wp.id::text
  )
);

CREATE POLICY "Users can upload their own work period images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'work-period-images'
  AND EXISTS (
    SELECT 1
    FROM public.work_periods wp
    JOIN public.projects p ON p.id = wp.project_id
    WHERE p.user_id = auth.uid()
      AND (storage.foldername(storage.objects.name))[1] = wp.id::text
  )
);

CREATE POLICY "Users can update their own work period images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'work-period-images'
  AND EXISTS (
    SELECT 1
    FROM public.work_periods wp
    JOIN public.projects p ON p.id = wp.project_id
    WHERE p.user_id = auth.uid()
      AND (storage.foldername(storage.objects.name))[1] = wp.id::text
  )
)
WITH CHECK (
  bucket_id = 'work-period-images'
  AND EXISTS (
    SELECT 1
    FROM public.work_periods wp
    JOIN public.projects p ON p.id = wp.project_id
    WHERE p.user_id = auth.uid()
      AND (storage.foldername(storage.objects.name))[1] = wp.id::text
  )
);

CREATE POLICY "Users can delete their own work period images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'work-period-images'
  AND EXISTS (
    SELECT 1
    FROM public.work_periods wp
    JOIN public.projects p ON p.id = wp.project_id
    WHERE p.user_id = auth.uid()
      AND (storage.foldername(storage.objects.name))[1] = wp.id::text
  )
);