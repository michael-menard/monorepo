import React from 'react';
import { motion } from 'framer-motion';
import ImageCard from './components/ImageCard/index.js';
import InspirationGallery from './components/InspirationGallery/index.js';
import type { GalleryImage } from './types/index.js';

export type GalleryLayout = 'grid' | 'masonry';

export interface GalleryProps {
  images: GalleryImage[];
  layout?: GalleryLayout;
  className?: string;
  onImageClick?: (image: GalleryImage) => void;
  onImageLike?: (imageId: string, liked: boolean) => void;
  onImageShare?: (imageId: string) => void;
  onImageDelete?: (imageId: string) => void;
  onImageDownload?: (imageId: string) => void;
  onImageAddToAlbum?: (imageId: string) => void;
}

const Gallery: React.FC<GalleryProps> = ({
  images,
  layout = 'grid',
  className = '',
  onImageClick,
  onImageLike,
  onImageShare,
  onImageDelete,
  onImageDownload,
  onImageAddToAlbum,
}) => {
  const getLayoutClasses = () => {
    switch (layout) {
      case 'grid':
        return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4';
      case 'masonry':
        return 'columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4';
      default:
        return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4';
    }
  };

  const getItemClasses = () => {
    return layout === 'masonry' ? 'break-inside-avoid mb-4' : '';
  };

  if (!images || images.length === 0) {
    return (
      <div className={`flex items-center justify-center min-h-[200px] ${className}`}>
        <div className="text-center">
          <div className="text-6xl mb-4">🖼️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No images yet</h3>
          <p className="text-gray-600">Add some images to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${getLayoutClasses()} ${className}`}>
      {images.map((image, index) => (
        <motion.div
          key={image.id}
          className={getItemClasses()}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <ImageCard
            src={image.url}
            alt={image.title || image.description || 'Gallery image'}
            title={image.title || 'Untitled'}
            description={image.description}
            author={image.author}
            uploadDate={image.createdAt}
            tags={image.tags}
            onView={() => onImageClick?.(image)}
            onLike={(liked) => onImageLike?.(image.id, liked)}
            onShare={() => onImageShare?.(image.id)}
            onDelete={() => onImageDelete?.(image.id)}
            onDownload={() => onImageDownload?.(image.id)}
            onAddToAlbum={() => onImageAddToAlbum?.(image.id)}
          />
        </motion.div>
      ))}
    </div>
  );
};

// Gallery package exports
export default Gallery;
export { InspirationGallery };
export { Lightbox } from './components/Lightbox/index.js';
export * from './types/index.js';
export * from './schemas/index.js';
