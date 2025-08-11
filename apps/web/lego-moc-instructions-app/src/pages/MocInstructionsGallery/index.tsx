import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@repo/ui';
import { Filter, Plus, Search } from 'lucide-react';
import { useGetInstructionsQuery } from '@repo/moc-instructions';
import type { MockInstruction } from '@repo/moc-instructions';
import { Gallery } from '@repo/gallery';
import type { GalleryImage } from '@repo/gallery';

// Transform MockInstruction to GalleryImage for the gallery component
const transformToGalleryImage = (instruction: MockInstruction): GalleryImage => ({
  id: instruction.id,
  url: instruction.coverImageUrl || 'https://via.placeholder.com/300x200',
  title: instruction.title,
  description: instruction.description,
  author: instruction.author,
  tags: instruction.tags,
  createdAt: instruction.createdAt,
  updatedAt: instruction.updatedAt,
});

const MocInstructionsGallery: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<Array<string>>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch instructions using RTK Query
  const { data: instructions = [], isLoading, error } = useGetInstructionsQuery({
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Transform instructions to gallery format
  const galleryImages = useMemo(() => 
    instructions.map(transformToGalleryImage), 
    [instructions]
  );

  // Filter instructions based on search and tags
  const filteredInstructions = useMemo(() => {
    return galleryImages.filter((instruction) => {
      const matchesSearch = searchQuery === '' || 
        (instruction.title?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (instruction.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (instruction.author?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      const matchesTags = selectedTags.length === 0 || 
        selectedTags.some(tag => instruction.tags?.includes(tag) ?? false);

      return matchesSearch && matchesTags;
    });
  }, [galleryImages, searchQuery, selectedTags]);

  // Get all available tags from instructions
  const allTags = useMemo(() => 
    Array.from(new Set(
      galleryImages.flatMap(instruction => instruction.tags || [])
    )).sort(), 
    [galleryImages]
  );

  const handleInstructionClick = useCallback((instruction: any) => {
    navigate({ to: '/moc-detail/$id', params: { id: instruction.id } });
  }, [navigate]);

  const handleCreateNew = useCallback(() => {
    navigate({ to: '/moc-gallery' });
  }, [navigate]);

  const handleImageLike = useCallback((imageId: string, liked: boolean) => {
    console.log(`Image ${imageId} ${liked ? 'liked' : 'unliked'}`);
    // TODO: Implement like functionality
  }, []);

  const handleImageShare = useCallback((imageId: string) => {
    console.log(`Sharing image ${imageId}`);
    // TODO: Implement share functionality
  }, []);

  const handleImageDownload = useCallback((imageId: string) => {
    console.log(`Downloading image ${imageId}`);
    // TODO: Implement download functionality
  }, []);

  const handleImageDelete = useCallback((imageId: string) => {
    console.log(`Deleting image ${imageId}`);
    // TODO: Implement delete functionality
  }, []);

  const handleImagesSelected = useCallback((selectedIds: Array<string>) => {
    console.log('Selected images:', selectedIds);
    // TODO: Implement selection functionality
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSelectedTags([]);
  }, []);

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8" data-testid="moc-gallery-page">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">MOC Gallery</h1>
              <p className="text-gray-600">Discover amazing LEGO MOC instructions created by the community</p>
            </div>
            <Button onClick={handleCreateNew} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New
            </Button>
          </div>
        </div>
        
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading MOC instructions...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8" data-testid="moc-gallery-page">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">MOC Gallery</h1>
              <p className="text-gray-600">Discover amazing LEGO MOC instructions created by the community</p>
            </div>
            <Button onClick={handleCreateNew} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New
            </Button>
          </div>
        </div>
        
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error loading instructions</h3>
            <p className="text-gray-600 mb-4">Unable to load MOC instructions. Please try again later.</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8" data-testid="moc-gallery-page">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">MOC Gallery</h1>
            <p className="text-gray-600">Discover amazing LEGO MOC instructions created by the community</p>
          </div>
          <Button onClick={handleCreateNew} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New
          </Button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search MOC instructions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="search-input"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
              data-testid="filter-toggle"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>

            {(searchQuery || selectedTags.length > 0) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSearch}
                data-testid="clear-filters"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 bg-gray-50 rounded-lg p-4" data-testid="filter-panel">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Filter by Tags</h3>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    data-testid={`tag-filter-${tag}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-sm text-gray-600" data-testid="results-count">
          {filteredInstructions.length} instruction{filteredInstructions.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Gallery Component */}
      <Gallery
        images={filteredInstructions}
        layout="grid"
        className="mb-8"
        selectedImages={[]}
        onImageClick={handleInstructionClick}
        onImageLike={handleImageLike}
        onImageShare={handleImageShare}
        onImageDownload={handleImageDownload}
        onImageDelete={handleImageDelete}
        onImagesSelected={handleImagesSelected}
        data-testid="moc-gallery"
      />

      {/* Empty State */}
      {filteredInstructions.length === 0 && (
        <div className="text-center py-12" data-testid="empty-state">
          <div className="text-6xl mb-4">🧱</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No instructions found</h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || selectedTags.length > 0 
              ? 'Try adjusting your search or filters'
              : 'Be the first to create a MOC instruction!'
            }
          </p>
          {searchQuery || selectedTags.length > 0 ? (
            <Button onClick={handleClearSearch} variant="outline">
              Clear Filters
            </Button>
          ) : (
            <Button onClick={handleCreateNew} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Your First MOC
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default MocInstructionsGallery; 