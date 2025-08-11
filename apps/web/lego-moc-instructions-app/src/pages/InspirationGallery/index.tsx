import React, { useState } from 'react';
// import { useNavigate } from '@tanstack/react-router';
import { Button } from '@repo/ui';
import { Plus, Heart, Share2, Loader2, AlertCircle } from 'lucide-react';
import { useGetInspirationItemsQuery, useLikeInspirationItemMutation } from '@repo/gallery';
import type { InspirationFilters, InspirationItem } from '@repo/gallery';

const InspirationGallery: React.FC = () => {
  // const navigate = useNavigate();
  const [filters, setFilters] = useState<InspirationFilters>({
    limit: 12,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // RTK Query hooks
  const {
    data: inspirationData,
    isLoading,
    error,
    refetch,
  } = useGetInspirationItemsQuery(filters);

  const [likeInspirationItem] = useLikeInspirationItemMutation();

  const handleInspirationClick = (item: InspirationItem) => {
    // TODO: Navigate to inspiration detail page when route is created
    console.log('Navigate to inspiration detail:', item.id);
    // navigate({ to: '/inspiration/$id', params: { id: item.id } });
  };

  const handleLike = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await likeInspirationItem(itemId).unwrap();
    } catch (error) {
      console.error('Failed to like inspiration item:', error);
    }
  };

  const handleShare = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Shared inspiration item:', itemId);
    // TODO: Implement share functionality
  };

  const handleCreateNew = () => {
    // TODO: Navigate to create inspiration page when route is created
    console.log('Navigate to create inspiration page');
    // navigate({ to: '/inspiration/create' });
  };

  const handleSearch = (searchTerm: string) => {
    setFilters((prev: InspirationFilters) => ({
      ...prev,
      search: searchTerm || undefined,
    }));
  };

  const handleCategoryFilter = (category: string) => {
    setFilters((prev: InspirationFilters) => ({
      ...prev,
      category: category || undefined,
    }));
  };

  const handleSort = (sortBy: 'likes' | 'createdAt' | 'title', sortOrder: 'asc' | 'desc') => {
    setFilters((prev: InspirationFilters) => ({
      ...prev,
      sortBy,
      sortOrder,
    }));
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8" data-testid="inspiration-gallery-page">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Inspiration Gallery</h1>
              <p className="text-gray-600">Discover amazing LEGO creations that will inspire your next build</p>
            </div>
            <Button disabled className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Share Inspiration
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Loading inspiration items...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8" data-testid="inspiration-gallery-page">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Inspiration Gallery</h1>
              <p className="text-gray-600">Discover amazing LEGO creations that will inspire your next build</p>
            </div>
            <Button onClick={handleCreateNew} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Share Inspiration
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load inspiration items</h3>
            <p className="text-gray-600 mb-4">There was an error loading the inspiration gallery.</p>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const inspirationItems = inspirationData?.data || [];

  return (
    <div className="container mx-auto px-4 py-8" data-testid="inspiration-gallery-page">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Inspiration Gallery</h1>
            <p className="text-gray-600">Discover amazing LEGO creations that will inspire your next build</p>
          </div>
          <Button onClick={handleCreateNew} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Share Inspiration
          </Button>
        </div>

        {/* Search and Filter Controls */}
        <div className="mt-6 flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Search inspiration..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onChange={(e) => handleCategoryFilter(e.target.value)}
            value={filters.category || ''}
          >
            <option value="">All Categories</option>
            <option value="Space">Space</option>
            <option value="Vehicles">Vehicles</option>
            <option value="Architecture">Architecture</option>
            <option value="Nature">Nature</option>
          </select>
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-');
              handleSort(sortBy as 'likes' | 'createdAt' | 'title', sortOrder as 'asc' | 'desc');
            }}
            value={`${filters.sortBy}-${filters.sortOrder}`}
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="likes-desc">Most Liked</option>
            <option value="title-asc">A-Z</option>
            <option value="title-desc">Z-A</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      {inspirationData && (
        <div className="mb-6">
          <p className="text-gray-600">
            Showing {inspirationItems.length} of {inspirationData.total} inspiration items
          </p>
        </div>
      )}

      {/* Empty state */}
      {inspirationItems.length === 0 && !isLoading && !error && (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No inspiration found</h3>
            <p className="text-gray-600 mb-4">
              {filters.search || filters.category 
                ? 'Try adjusting your search or filter criteria.'
                : 'Be the first to share some inspiration!'
              }
            </p>
            {!filters.search && !filters.category && (
              <Button onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Share Inspiration
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Inspiration Grid */}
      {inspirationItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {inspirationItems.map((item: InspirationItem) => (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleInspirationClick(item)}
              data-testid="inspiration-item"
            >
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-48 object-cover"
                onError={(e) => {
                  // Fallback to placeholder if image fails to load
                  e.currentTarget.src = `https://via.placeholder.com/300x200/6B7280/FFFFFF?text=${encodeURIComponent(item.title)}`;
                }}
              />
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                  <span className="author">By {item.author}</span>
                  <span className="category inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                    {item.category}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleLike(item.id, e)}
                      className={`flex items-center gap-1 text-sm ${
                        item.isLiked ? 'text-red-500' : 'text-gray-500'
                      } hover:text-red-500`}
                    >
                      <Heart className={`h-4 w-4 ${item.isLiked ? 'fill-current' : ''}`} />
                      {item.likes}
                    </button>
                    <button
                      onClick={(e) => handleShare(item.id, e)}
                      className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-500"
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </button>
                  </div>
                  <div className="tags flex gap-1">
                    {item.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="tag inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InspirationGallery;