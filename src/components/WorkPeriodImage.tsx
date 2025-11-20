import { memo } from 'react';
import { useImageSigner } from '@/hooks/useImageSigner';
import { Skeleton } from '@/components/ui/skeleton';

interface WorkPeriodImageProps {
  imagePath: string;
  alt: string;
  className?: string;
}

const WorkPeriodImage = memo(({ imagePath, alt, className }: WorkPeriodImageProps) => {
  const { signedUrl, loading } = useImageSigner(imagePath);

  if (loading || !signedUrl) {
    return <Skeleton className={className || "w-16 h-16 rounded"} />;
  }

  return (
    <img
      src={signedUrl}
      alt={alt}
      className={className || "w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"}
      loading="lazy"
    />
  );
});

WorkPeriodImage.displayName = 'WorkPeriodImage';

export default WorkPeriodImage;
