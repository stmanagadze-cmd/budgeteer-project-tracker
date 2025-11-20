import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Cache for signed URLs to avoid regenerating them
const signedUrlCache = new Map<string, { url: string; expires: number }>();

export const useImageSigner = (imagePath: string | null) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!imagePath) {
      setSignedUrl(null);
      return;
    }

    const generateSignedUrl = async () => {
      // Check cache first
      const cached = signedUrlCache.get(imagePath);
      if (cached && cached.expires > Date.now()) {
        setSignedUrl(cached.url);
        return;
      }

      setLoading(true);
      try {
        // Extract the file path from the stored path or URL
        const urlParts = imagePath.split('/');
        const bucketIndex = urlParts.findIndex(part => part === 'work-period-images');
        if (bucketIndex === -1) {
          setSignedUrl(imagePath);
          return;
        }
        
        const filePath = urlParts.slice(bucketIndex + 1).join('/');
        
        const { data, error } = await supabase.storage
          .from('work-period-images')
          .createSignedUrl(filePath, 3600); // 1 hour expiry
        
        if (error) {
          console.error('Error generating signed URL:', error);
          setSignedUrl(imagePath);
        } else {
          setSignedUrl(data.signedUrl);
          // Cache the signed URL
          signedUrlCache.set(imagePath, {
            url: data.signedUrl,
            expires: Date.now() + 3500000 // 58 minutes (slightly less than 1 hour)
          });
        }
      } catch (error) {
        console.error('Error generating signed URL:', error);
        setSignedUrl(imagePath);
      } finally {
        setLoading(false);
      }
    };

    generateSignedUrl();
  }, [imagePath]);

  return { signedUrl, loading };
};
