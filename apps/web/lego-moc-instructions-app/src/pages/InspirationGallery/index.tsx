import React from 'react';
// import { useNavigate } from '@tanstack/react-router';
import { Button } from '@repo/ui';
import { Plus } from 'lucide-react';
import { Gallery } from '@repo/gallery';
// import { useGetInspirationItemsQuery, useLikeInspirationItemMutation } from '@repo/gallery';
// import type { InspirationFilters } from '@repo/gallery';



const InspirationGallery: React.FC = () => {
  // const navigate = useNavigate();
  // const [filters, setFilters] = useState<InspirationFilters>({
  //   limit: 12,
  //   sortBy: 'createdAt',
  //   sortOrder: 'desc',
  // });

  // RTK Query hooks - temporarily commented out due to import issues
  // const {
  //   data: inspirationData,
  //   isLoading,
  //   error,
  //   refetch,
  // } = useGetInspirationItemsQuery(filters);

  // const [likeInspirationItem] = useLikeInspirationItemMutation();

  // Mock data for now
  const inspirationData = { data: [] };
  const isLoading = false;
  const error = null;
  const refetch = () => {};

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
        images={inspirationItems?.map(item => ({
          id: item.id,
          url: item.imageUrl || '/placeholder-inspiration.jpg',
          title: item.title,
          description: item.description,
          author: item.author,
          tags: item.tags || [],
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        })) || []}
        layout="masonry"
        onImageClick={(image) => {
          const item = inspirationItems?.find(i => i.id === image.id);
          if (item) {
            handleInspirationClick(item);
          }
        }}
        className="mb-8"
      />
    </div>
  );
};

export default InspirationGallery;