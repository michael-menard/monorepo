import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useGetImagesQuery, GalleryImage } from '../../store/galleryApi.js';
import GalleryImageCard from '../GalleryImageCard/index.js';

interface InspirationGalleryProps {
  // Infinite scroll props
  loadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  // Pagination props
  page?: number;
  limit?: number;
  // Filter props
  search?: string;
  tags?: string[];
  albumId?: string;
}

const InspirationGallery: React.FC<InspirationGalleryProps> = ({ 
  loadMore, 
  hasMore = false, 
  isLoading = false,
  page = 1,
  limit = 20,
  search,
  tags,
  albumId
}) => {
  const { data, error, isLoading: apiLoading, isFetching } = useGetImagesQuery();
  const [isIntersecting, setIsIntersecting] = useState(false);
  const observerRef = useRef<IntersectionObserver>();
  const lastElementRef = useRef<HTMLDivElement>(null);

  // Infinite scroll implementation with IntersectionObserver
  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const entry = entries[0];
    if (!entry) return;
    
    setIsIntersecting(entry.isIntersecting);
    
    if (entry.isIntersecting && hasMore && !isLoading && !apiLoading && !isFetching) {
      loadMore?.();
    }
  }, [hasMore, isLoading, apiLoading, isFetching, loadMore]);

  // Set up IntersectionObserver for infinite scroll
  useEffect(() => {
    if (lastElementRef.current) {
      observerRef.current = new IntersectionObserver(handleIntersection, {
        root: null,
        rootMargin: '100px', // Start loading 100px before reaching the end
        threshold: 0.1,
      });
      
      observerRef.current.observe(lastElementRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleIntersection]);

  // Loading state with skeleton
  if (apiLoading && !data) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 lg:gap-8">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-48 mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="text-red-600 text-lg font-medium mb-2">Failed to load images</div>
          <div className="text-gray-500 text-sm">Please try refreshing the page</div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!data || !data.data || data.data.length === 0) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-2">No images found</div>
          <div className="text-gray-400 text-sm">
            {search ? `No results for "${search}"` : 'Start by uploading some images'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Responsive masonry layout with proper breakpoints */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 lg:gap-8">
        {data.data.map((img: GalleryImage, index: number) => (
          <div 
            key={img.id}
            ref={index === data.data.length - 1 ? lastElementRef : null}
            className="break-inside-avoid"
          >
            <GalleryImageCard
              src={img.url}
              title={img.title}
              description={img.description ?? ''}
              author={img.author ?? ''}
              uploadDate={img.uploadDate}
              tags={img.tags}
              onView={() => console.log('View image:', img.id)}
              onShare={() => console.log('Share image:', img.id)}
              onDelete={() => console.log('Delete image:', img.id)}
            />
          </div>
        ))}
      </div>

      {/* Loading more indicator */}
      {(isLoading || isFetching) && hasMore && (
        <div className="flex justify-center py-8">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600 text-sm">Loading more images...</span>
          </div>
        </div>
      )}

      {/* End of content indicator */}
      {!hasMore && data.data.length > 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 text-sm">You've reached the end</div>
        </div>
      )}

      {/* Intersection observer target for infinite scroll */}
      {hasMore && (
        <div 
          ref={lastElementRef}
          className="h-1 w-full"
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default InspirationGallery; 