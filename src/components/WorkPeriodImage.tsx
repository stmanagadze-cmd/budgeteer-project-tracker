import { memo } from 'react';
import { useImageSigner } from '@/hooks/useImageSigner';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageOff } from 'lucide-react';

interface WorkPeriodImageProps {
  imagePath: string;
  alt: string;
  className?: string;
}

const WorkPeriodImage = memo(({ imagePath, alt, className }: WorkPeriodImageProps) => {
  const { signedUrl, loading } = useImageSigner(imagePath);
  const baseClass = className || 'w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity';

  if (loading) {
    return <Skeleton className={className || 'w-16 h-16 rounded'} />;
  }

  if (!signedUrl) {
    return (
      <div
        className={`${baseClass} flex items-center justify-center bg-muted text-muted-foreground`}
        title="Image unavailable"
      >
        <ImageOff className="h-5 w-5" />
      </div>
    );
  }

  return <img src={signedUrl} alt={alt} className={baseClass} loading="lazy" />;
});

WorkPeriodImage.displayName = 'WorkPeriodImage';

export default WorkPeriodImage;
