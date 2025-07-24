import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import FilterBar from '../FilterBar/index';
import GalleryCard from '../GalleryCard/index';
import CreateAlbumDialog from '../CreateAlbumDialog/index';
import { 
  useSearchImagesQuery, 
  useGetAvailableTagsQuery, 
  useGetAvailableCategoriesQuery,
  SearchFilters, 
  GalleryImage
} from '../../store/galleryApi';

export interface FilteredGalleryProps {
  className?: string;
  pageSize?: number;
  onImageClick?: (image: GalleryImage) => void;
  onImageShare?: (imageId: string) => void;
  onImageDownload?: (imageId: string) => void;
  onImageDelete?: (imageId: string) => void;
}

const FilteredGallery: React.FC<FilteredGalleryProps> = ({
  className = '',
  pageSize = 20,
  onImageClick,
  onImageShare,
  onImageDownload,
  onImageDelete,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    tags: [],
    category: '',
    from: 0,
    size: pageSize,
  });

  // Drag-and-drop state
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [dragOverImageId, setDragOverImageId] = useState<string | null>(null);
  const [albumDialogImages, setAlbumDialogImages] = useState<GalleryImage[] | null>(null);
  const [isAlbumDialogOpen, setIsAlbumDialogOpen] = useState(false);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Fetch available tags and categories for filter options
  const { data: availableTags = [] } = useGetAvailableTagsQuery();
  const { data: availableCategories = [] } = useGetAvailableCategoriesQuery();

  // Search images with current filters
  const { 
    data: searchResults, 
    isLoading, 
    error, 
    isFetching 
  } = useSearchImagesQuery(filters, {
    refetchOnMountOrArgChange: true,
  });

  const handleSearchChange = useCallback((query: string) => {
    setFilters(prev => ({
      ...prev,
      query,
      from: 0, // Reset to first page when search changes
    }));
    setCurrentPage(0);
  }, []);

  const handleTagsChange = useCallback((tags: string[]) => {
    setFilters(prev => ({
      ...prev,
      tags,
      from: 0, // Reset to first page when filters change
    }));
    setCurrentPage(0);
  }, []);

  const handleCategoryChange = useCallback((category: string) => {
    setFilters(prev => ({
      ...prev,
      category,
      from: 0, // Reset to first page when filters change
    }));
    setCurrentPage(0);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      query: '',
      tags: [],
      category: '',
      from: 0,
      size: pageSize,
    });
    setCurrentPage(0);
  }, [pageSize]);

  const handleLoadMore = useCallback(() => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    setFilters(prev => ({
      ...prev,
      from: nextPage * pageSize,
    }));
  }, [currentPage, pageSize]);

  const handleImageClick = useCallback((image: GalleryImage) => {
    onImageClick?.(image);
  }, [onImageClick]);

  const handleImageShare = useCallback((imageId: string) => {
    onImageShare?.(imageId);
  }, [onImageShare]);

  const handleImageDownload = useCallback((imageId: string) => {
    onImageDownload?.(imageId);
  }, [onImageDownload]);

  const handleImageDelete = useCallback((imageId: string) => {
    onImageDelete?.(imageId);
  }, [onImageDelete]);

  const handleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(sel => sel !== id));
  }, []);

  const images = searchResults?.data || [];
  const total = searchResults?.total || 0;
  const hasMore = images.length < total;
  const isSearching = filters.query || (filters.tags && filters.tags.length > 0) || filters.category;

  const handleSelectAll = useCallback(() => {
    setSelectedIds(images.map(img => img.id));
  }, [images]);

  const handleBatchAddToAlbum = useCallback(() => {
    const selectedImages = images.filter(img => selectedIds.includes(img.id));
    if (selectedImages.length > 0) {
      setAlbumDialogImages(selectedImages);
      setIsAlbumDialogOpen(true);
    }
  }, [images, selectedIds]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const handleBatchDelete = useCallback(() => {
    if (!handleImageDelete) return;
    selectedIds.forEach(id => handleImageDelete(id));
    setSelectedIds([]);
  }, [selectedIds, handleImageDelete]);

  // Drag-and-drop handlers
  const handleDragStart = (id: string) => {
    setDraggedImageId(id);
  };
  const handleDragEnd = () => {
    setDraggedImageId(null);
    setDragOverImageId(null);
  };
  const handleDragOver = (id: string) => {
    setDragOverImageId(id);
  };
  const handleDragLeave = () => {
    setDragOverImageId(null);
  };
  const handleDropImage = (sourceId: string, targetId: string) => {
    if (!searchResults?.data) return;
    const source = searchResults.data.find(img => img.id === sourceId);
    const target = searchResults.data.find(img => img.id === targetId);
    if (source && target) {
      setAlbumDialogImages([source, target]);
      setIsAlbumDialogOpen(true);
    }
    setDraggedImageId(null);
    setDragOverImageId(null);
  };
  const handleAlbumDialogClose = () => {
    setIsAlbumDialogOpen(false);
    setAlbumDialogImages(null);
  };

  // Infinite scroll sentinel ref
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore || isFetching) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    if (typeof window === 'undefined' || !window.IntersectionObserver) return;
    const observer = new window.IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        if (entries.length > 0 && entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { root: null, rootMargin: '200px', threshold: 0.01 }
    );
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [hasMore, isFetching, handleLoadMore]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Filter Bar */}
      <FilterBar
        onSearchChange={handleSearchChange}
        onTagsChange={handleTagsChange}
        onCategoryChange={handleCategoryChange}
        onClearFilters={handleClearFilters}
        availableTags={availableTags}
        availableCategories={availableCategories}
        searchPlaceholder="Search images by title, description, or tags..."
        debounceMs={300}
      />

      {/* Search Results Info */}
      {isSearching && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {isLoading ? 'Searching...' : `Found ${total} image${total !== 1 ? 's' : ''}`}
            {searchResults?.source && (
              <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                via {searchResults.source}
              </span>
            )}
          </span>
          {error && (
            <span className="text-red-600">
              Search failed. Please try again.
            </span>
          )}
        </div>
      )}

      {/* Batch Actions Toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mb-2 sticky top-0 z-30 shadow">
          <span className="font-medium text-blue-700">{selectedIds.length} selected</span>
          <button onClick={handleBatchDelete} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">Delete Selected</button>
          <button onClick={handleBatchAddToAlbum} className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600">Add to Album</button>
          <button onClick={handleClearSelection} className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">Clear Selection</button>
          <button onClick={handleSelectAll} className="px-3 py-1 bg-blue-200 text-blue-700 rounded hover:bg-blue-300">Select All</button>
        </div>
      )}

      {/* Gallery Grid */}
      {images.length > 0 ? (
        <>
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
            layout
          >
            {images.map((image) => (
              <motion.div
                key={image.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <GalleryCard
                  src={image.url}
                  title={image.title}
                  description={image.description ?? ''}
                  author={image.author ?? ''}
                  uploadDate={image.uploadDate}
                  tags={image.tags ?? []}
                  onView={() => handleImageClick(image)}
                  onShare={() => handleImageShare(image.id)}
                  onDownload={() => handleImageDownload(image.id)}
                  onDelete={() => handleImageDelete(image.id)}
                  draggableId={image.id}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDropImage={handleDropImage}
                  isDragOver={dragOverImageId === image.id}
                  // Visual feedback for drag-over
                  onDragOver={() => handleDragOver(image.id)}
                  onDragLeave={handleDragLeave}
                  selected={selectedIds.includes(image.id)}
                  onSelect={checked => handleSelect(image.id, checked)}
                />
              </motion.div>
            ))}
          </motion.div>

          {/* Infinite Scroll Sentinel */}
          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center pt-6" data-testid="infinite-scroll-sentinel">
              {isFetching ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              ) : (
                <span className="text-gray-400">Scroll to load more...</span>
              )}
            </div>
          )}
        </>
      ) : (
        /* Empty State */
        <div className="text-center py-12">
          {isLoading ? (
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600">Searching...</p>
            </div>
          ) : isSearching ? (
            <div className="space-y-4">
              <div className="text-gray-400 text-6xl">🔍</div>
              <h3 className="text-lg font-medium text-gray-900">No images found</h3>
              <p className="text-gray-600">
                Try adjusting your search terms or filters
              </p>
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 text-blue-600 hover:text-blue-700 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-gray-400 text-6xl">📷</div>
              <h3 className="text-lg font-medium text-gray-900">No images yet</h3>
              <p className="text-gray-600">
                Upload some images to get started
              </p>
            </div>
          )}
        </div>
      )}

      {/* Loading Overlay for Subsequent Pages */}
      {isFetching && currentPage > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Loading more images...</span>
          </div>
        </div>
      )}

      {/* Create Album Dialog for Drag-and-Drop */}
      <CreateAlbumDialog
        isOpen={isAlbumDialogOpen}
        onClose={handleAlbumDialogClose}
        selectedImages={albumDialogImages || []}
      />
    </div>
  );
};

export default FilteredGallery; 