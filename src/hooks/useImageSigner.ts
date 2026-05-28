import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Cache for signed URLs to avoid regenerating them
const signedUrlCache = new Map<string, { url: string; expires: number }>();

/**
 * Normalize any stored image reference to the object path inside the
 * `work-period-images` bucket. Accepts:
 *   - "{workPeriodId}/{fileName}"
 *   - "work-period-images/{workPeriodId}/{fileName}"
 *   - full Supabase URL containing "/work-period-images/{workPeriodId}/{fileName}"
 */
export function getWorkPeriodImageObjectPath(imagePath: string): string {
  const parts = imagePath.split('/');
  const bucketIndex = parts.findIndex((part) => part === 'work-period-images');
  if (bucketIndex >= 0) {
    return parts.slice(bucketIndex + 1).join('/');
  }
  return imagePath.replace(/^\/+/, '');
}

export const useImageSigner = (imagePath: string | null) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!imagePath) {
      setSignedUrl(null);
      return;
    }

    let cancelled = false;

    const generateSignedUrl = async () => {
      const cached = signedUrlCache.get(imagePath);
      if (cached && cached.expires > Date.now()) {
        setSignedUrl(cached.url);
        return;
      }

      setLoading(true);
      try {
        const objectPath = getWorkPeriodImageObjectPath(imagePath);
        if (!objectPath) {
          if (!cancelled) setSignedUrl(null);
          return;
        }

        const { data, error } = await supabase.storage
          .from('work-period-images')
          .createSignedUrl(objectPath, 3600);

        if (cancelled) return;

        if (error || !data?.signedUrl) {
          console.error('Error generating signed URL:', error);
          setSignedUrl(null); // fallback handled by consumer
          return;
        }

        setSignedUrl(data.signedUrl);
        signedUrlCache.set(imagePath, {
          url: data.signedUrl,
          expires: Date.now() + 3500000, // ~58 min
        });
      } catch (error) {
        console.error('Error generating signed URL:', error);
        if (!cancelled) setSignedUrl(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    generateSignedUrl();

    return () => {
      cancelled = true;
    };
  }, [imagePath]);

  return { signedUrl, loading };
};
