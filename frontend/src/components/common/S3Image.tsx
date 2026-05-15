import { useState, useEffect } from 'react';
import { uploadApi } from '@/api/uploadApi';

interface S3ImageProps {
  imageKey: string;
  alt?: string;
  className?: string;
}

/**
 * Component that displays S3 images by converting imageKey to signed URL
 * Handles both S3 keys and legacy signed URLs
 */
const S3Image = ({ imageKey, alt = '', className = '' }: S3ImageProps) => {
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (!imageKey) {
        setLoading(false);
        return;
      }

      // If it's already a full URL (legacy signed URL or external), use it directly
      if (imageKey.startsWith('http://') || imageKey.startsWith('https://')) {
        setSignedUrl(imageKey);
        setLoading(false);
        return;
      }

      // If it's a data URL or blob, use it directly
      if (imageKey.startsWith('data:') || imageKey.startsWith('blob:')) {
        setSignedUrl(imageKey);
        setLoading(false);
        return;
      }

      // Otherwise, it's an S3 key - fetch signed URL
      try {
        const url = await uploadApi.getSignedUrl(imageKey);
        setSignedUrl(url);
      } catch (err) {
        console.error('Failed to get signed URL:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchSignedUrl();
  }, [imageKey]);

  if (!imageKey) {
    return null;
  }

  if (loading) {
    return (
      <div className={`${className} bg-surface-high animate-pulse flex items-center justify-center`}>
        <span className="text-xs text-on-surface-variant">Loading...</span>
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className={`${className} bg-surface-high flex items-center justify-center`}>
        <span className="text-xs text-error">Failed to load image</span>
      </div>
    );
  }

  return (
    <img
      src={signedUrl}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
};

export default S3Image;
