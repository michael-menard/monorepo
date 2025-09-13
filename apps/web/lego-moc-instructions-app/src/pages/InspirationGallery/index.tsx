import React, { useState } from 'react';
// import { useNavigate } from '@tanstack/react-router';
import { Button } from '@repo/ui';
import { Plus } from 'lucide-react';
import { Gallery, GalleryAdapters } from '@monorepo/gallery';
import { useGetInspirationItemsQuery, useLikeInspirationItemMutation } from '@repo/gallery';
import type { InspirationFilters } from '@repo/gallery';

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

  const handleInspirationClick = (item: any) => {
    // TODO: Navigate to inspiration detail page when route is created
    console.log('Navigate to inspiration detail:', item.id);
    // navigate({ to: '/inspiration/$id', params: { id: item.id } });
  };

  const handleLike = async (itemId: string, liked: boolean) => {
    try {
      await likeInspirationItem(itemId).unwrap();
    } catch (error) {
      console.error('Failed to like inspiration item:', error);
    }
  };

  const handleShare = (itemId: string) => {
    console.log('Shared inspiration item:', itemId);
    // TODO: Implement share functionality
  };

  const handleCreateNew = () => {
    // TODO: Navigate to create inspiration page when route is created
    console.log('Navigate to create inspiration page');
    // navigate({ to: '/inspiration/create' });
  };

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
      </div>

      {/* Gallery Component */}
      <Gallery
        items={inspirationItems}
        preset="inspiration"
        loading={isLoading}
        error={error ? 'Failed to load inspiration items' : null}
        adapter={GalleryAdapters.inspiration}
        actions={{
          onItemClick: handleInspirationClick,
          onItemLike: handleLike,
          onItemShare: handleShare,
          onRefresh: refetch,
        }}
        className="mb-8"
      />
    </div>
  );
};

export default InspirationGallery;