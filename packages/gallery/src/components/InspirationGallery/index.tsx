import React, { useRef, useCallback } from 'react';
import { useGetImagesQuery, GalleryImage } from '../../store/galleryApi.js';
import GalleryImageCard from '../GalleryImageCard/index.js';

interface InspirationGalleryProps {
  // Infinite scroll props (optional, for future use)
  loadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}

const InspirationGallery: React.FC<InspirationGalleryProps> = ({ loadMore, hasMore, isLoading }) => {
  const { data, error, isLoading: apiLoading } = useGetImagesQuery();
  // Infinite scroll logic can be added here in the future

  if (apiLoading || isLoading) {
    return <div style={{ textAlign: 'center', padding: 32 }}>Loading images...</div>;
  }
  if (error) {
    return <div style={{ color: '#dc2626', textAlign: 'center', padding: 32 }}>Failed to load images.</div>;
  }
  if (!data || !data.data || data.data.length === 0) {
    return <div style={{ textAlign: 'center', padding: 32 }}>No images found.</div>;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 24,
        width: '100%',
        margin: '0 auto',
        padding: 24,
      }}
    >
      {data.data.map((img: GalleryImage) => (
        <GalleryImageCard
          key={img.id}
          src={img.url}
          title={img.title}
          description={img.description ?? ''}
          author={img.author ?? ''}
          uploadDate={img.uploadDate}
        />
      ))}
    </div>
  );
};

export default InspirationGallery; 