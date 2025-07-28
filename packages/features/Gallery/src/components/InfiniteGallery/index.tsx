import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ImageCard from '../ImageCard/index.js';
import { useAlbumDragAndDrop } from '../../hooks/useAlbumDragAndDrop.js';
import { useInfiniteGallery } from '../../hooks/useInfiniteGallery.js';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver.js';
import type { GalleryFilters } from '../../store/galleryApi.js';

export interface InfiniteGalleryProps {
  className?: string;
  initialFilters?: Omit<GalleryFilters, 'cursor' | 'limit'>;
  pageSize?: number;
  onImageClick?: (image: any) => void;
  onImageLike?: (imageId: string, liked: boolean) => void;
  onImageShare?: (imageId: string) => void;
  onImageDelete?: (imageId: string) => void;
  onImageDownload?: (imageId: string) => void;
  onImageAddToAlbum?: (imageId: string) => void;
  onImagesSelected?: (imageIds: string[]) => void;
  selectedImages?: string[];
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
}

const InfiniteGallery: React.FC<InfiniteGalleryProps> = ({
  className = '',
  initialFilters = {},
  pageSize = 20,
  onImageClick,
  onImageLike,
  onImageShare,
  onImageDelete,
  onImageDownload,
  onImageAddToAlbum,
  onImagesSelected,
  selectedImages = [],
  columns = { sm: 2, md: 3, lg: 4, xl: 5 },
  gap = 4,
}) => {
  const { actions: dragActions } = useAlbumDragAndDrop();

  // Use infinite gallery hook
  const { items, isLoading, isFetching, error, hasMore, loadMore, refresh } = useInfiniteGallery({
    initialFilters,
    pageSize,
  });

  // Intersection Observer for infinite scroll
  const handleIntersection = useCallback(
    (isIntersecting: boolean) => {
      if (isIntersecting && hasMore && !isFetching) {
        loadMore();
      }
    },
    [hasMore, isFetching, loadMore],
  );

  const { ref: loadMoreRef } = useIntersectionObserver(handleIntersection, {
    threshold: 0.1,
    rootMargin: '100px',
  });

  // Generate CSS columns based on breakpoints
  const getColumnClasses = () => {
    const { sm, md, lg, xl } = columns;
    return `columns-1 ${sm ? `sm:columns-${sm}` : ''} ${md ? `md:columns-${md}` : ''} ${lg ? `lg:columns-${lg}` : ''} ${xl ? `xl:columns-${xl}` : ''}`;
  };

  const handleDragStart = (e: React.DragEvent, imageId: string) => {
    dragActions.handleDragStart(e, [imageId]);
  };

  const handleImageSelect = (imageId: string, checked: boolean) => {
    if (onImagesSelected) {
      const newSelected = checked
        ? [...selectedImages, imageId]
        : selectedImages.filter((id) => id !== imageId);
      onImagesSelected(newSelected);
    }
  };

  // Handle errors
  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Error loading gallery</h3>
          <p className="text-gray-600 mb-4">Something went wrong while loading your images.</p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Handle empty state
  if (!isLoading && (!items || items.length === 0)) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-8xl mb-6">🎨</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No images yet</h3>
          <p className="text-gray-600 text-lg">Start adding images to your gallery!</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Masonry Gallery */}
      <div className={`${getColumnClasses()} gap-${gap}`} style={{ columnGap: `${gap * 0.25}rem` }}>
        <AnimatePresence>
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              className="break-inside-avoid mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{
                duration: 0.4,
                delay: index * 0.05,
                ease: [0.4, 0, 0.2, 1],
              }}
              layout
            >
              <ImageCard
                src={item.url || ''}
                alt={item.title || item.description || 'Gallery image'}
                title={item.title || 'Untitled'}
                description={item.description}
                author={item.author}
                uploadDate={item.createdAt}
                tags={item.tags}
                onView={() => onImageClick?.(item)}
                onLike={(liked) => onImageLike?.(item.id, liked)}
                onShare={() => onImageShare?.(item.id)}
                onDelete={() => onImageDelete?.(item.id)}
                onDownload={() => onImageDownload?.(item.id)}
                onAddToAlbum={() => onImageAddToAlbum?.(item.id)}
                draggableId={item.id}
                onDragStart={(id) => handleDragStart({} as React.DragEvent, id)}
                selected={selectedImages.includes(item.id)}
                onSelect={(checked) => handleImageSelect(item.id, checked)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Loading gallery...</span>
          </div>
        </div>
      )}

      {/* Load More Trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          {isFetching ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-600">Loading more images...</span>
            </div>
          ) : (
            <div className="h-8" /> // Invisible trigger element
          )}
        </div>
      )}

      {/* End of gallery message */}
      {!hasMore && items.length > 0 && (
        <div className="flex justify-center py-8">
          <div className="text-center">
            <p className="text-gray-600 text-sm">You've reached the end of your gallery!</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfiniteGallery; 