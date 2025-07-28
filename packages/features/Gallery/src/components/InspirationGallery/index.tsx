import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ImageCard from '../ImageCard/index.js';
import type { GalleryImage } from '../../types/index.js';

export interface InspirationGalleryProps {
  images: GalleryImage[];
  className?: string;
  onImageClick?: (image: GalleryImage) => void;
  onImageLike?: (imageId: string, liked: boolean) => void;
  onImageShare?: (imageId: string) => void;
  onImageDelete?: (imageId: string) => void;
  onImageDownload?: (imageId: string) => void;
  onImageAddToAlbum?: (imageId: string) => void;
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
  loading?: boolean;
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
}

const InspirationGallery: React.FC<InspirationGalleryProps> = ({
  images,
  className = '',
  onImageClick,
  onImageLike,
  onImageShare,
  onImageDelete,
  onImageDownload,
  onImageAddToAlbum,
  onLoadMore,
  hasMore = false,
  loading = false,
  columns = { sm: 2, md: 3, lg: 4, xl: 5 },
  gap = 4,
}) => {
  const [organizedImages, setOrganizedImages] = useState<GalleryImage[][]>([]);
  const [imageHeights, setImageHeights] = useState<{ [key: string]: number }>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Generate CSS columns based on breakpoints
  const getColumnClasses = () => {
    const { sm, md, lg, xl } = columns;
    return `columns-1 ${sm ? `sm:columns-${sm}` : ''} ${md ? `md:columns-${md}` : ''} ${lg ? `lg:columns-${lg}` : ''} ${xl ? `xl:columns-${xl}` : ''}`;
  };

  // Organize images into columns for masonry layout
  const organizeImagesIntoColumns = useCallback((images: GalleryImage[]) => {
    const { sm = 2, md = 3, lg = 4, xl = 5 } = columns;
    const maxColumns = Math.max(sm, md, lg, xl);

    const imageColumns: GalleryImage[][] = Array.from({ length: maxColumns }, () => []);
    const columnHeights = Array.from({ length: maxColumns }, () => 0);

    images.forEach((image) => {
      // Find the shortest column
      const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
      imageColumns[shortestColumnIndex].push(image);

      // Estimate height (you could make this more sophisticated)
      const estimatedHeight = imageHeights[image.id] || 300;
      columnHeights[shortestColumnIndex] += estimatedHeight + gap;
    });

    return imageColumns;
  }, [columns, imageHeights, gap]);

  // Handle image load to get actual heights
  const handleImageLoad = useCallback((imageId: string, height: number) => {
    setImageHeights(prev => ({
      ...prev,
      [imageId]: height,
    }));
  }, []);

  // Simple scroll listener for infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!loadMoreRef.current || !hasMore || loading || !onLoadMore) return;

      const rect = loadMoreRef.current.getBoundingClientRect();
      const isVisible = rect.top <= window.innerHeight + 100; // 100px threshold

      if (isVisible) {
        onLoadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loading, onLoadMore]);

  // Reorganize images when images array or columns change
  useEffect(() => {
    setOrganizedImages(organizeImagesIntoColumns(images));
  }, [images, organizeImagesIntoColumns]);

  if (!images || images.length === 0) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-8xl mb-6">🎨</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No inspiration yet</h3>
          <p className="text-gray-600 text-lg">Start adding images to your inspiration gallery!</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Masonry Gallery */}
      <div 
        ref={containerRef}
        className={`${getColumnClasses()} gap-${gap}`}
        style={{ columnGap: `${gap * 0.25}rem` }}
      >
        <AnimatePresence>
          {images.map((image, index) => (
            <motion.div
              key={image.id}
              className="break-inside-avoid mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ 
                duration: 0.4, 
                delay: index * 0.05,
                ease: [0.4, 0, 0.2, 1]
              }}
              layout
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
        </AnimatePresence>
      </div>

      {/* Load More Trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center mt-8">
          <motion.div
            className="w-full max-w-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {loading ? (
              <div className="flex items-center justify-center p-6">
                <motion.div
                  className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span className="ml-3 text-gray-600">Loading more inspiration...</span>
              </div>
            ) : (
              <div className="h-4" /> // Invisible trigger for scroll detection
            )}
          </motion.div>
        </div>
      )}

      {/* End of Gallery */}
      {!hasMore && images.length > 0 && (
        <motion.div 
          className="text-center mt-12 py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="text-4xl mb-4">✨</div>
          <p className="text-gray-600 text-lg">You've reached the end of your inspiration gallery!</p>
        </motion.div>
      )}
    </div>
  );
};

export default InspirationGallery; 