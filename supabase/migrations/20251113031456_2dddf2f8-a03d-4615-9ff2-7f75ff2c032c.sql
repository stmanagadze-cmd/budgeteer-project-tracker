-- Make work-period-images bucket private for better security
UPDATE storage.buckets 
SET public = false 
WHERE name = 'work-period-images';