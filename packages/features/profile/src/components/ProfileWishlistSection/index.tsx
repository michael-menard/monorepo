import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui';
import { Gallery, featureWishlistAdapter } from '@repo/gallery';
import { Heart, ExternalLink, ArrowRight } from 'lucide-react';

interface WishlistItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  url: string;
  imageUrl: string;
  priority: 'low' | 'medium' | 'high';
  category?: string;
  isPurchased: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ProfileWishlistSectionProps {
  items: WishlistItem[];
  loading?: boolean;
  limit?: number;
  showViewAll?: boolean;
  viewAllHref?: string;
}

export const ProfileWishlistSection: React.FC<ProfileWishlistSectionProps> = ({
  items,
  loading = false,
  limit = 5,
  showViewAll = true,
  viewAllHref = '/wishlist',
}) => {
  const displayItems = limit ? items.slice(0, limit) : items;
  const unpurchasedItems = displayItems.filter(item => !item.isPurchased);

  const galleryConfig = {
    layout: 'list' as const,
    itemsPerPage: limit,
    infiniteScroll: false,
    selectable: false,
    sortable: false,
    filterConfig: {
      searchable: false,
      tagFilter: false,
      categoryFilter: false,
    },
    columns: { xs: 1, sm: 1, md: 1, lg: 1, xl: 1 },
  };

  const renderWishlistItem = (item: any) => {
    const originalItem = item.originalData as WishlistItem;
    
    return (
      <div className="flex items-center space-x-4 p-4 bg-white dark:bg-gray-800 rounded-lg border hover:shadow-md transition-shadow">
        <img 
          src={item.imageUrl} 
          alt={item.title}
          className="w-16 h-16 object-cover rounded-lg"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {item.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {item.description}
          </p>
          <div className="flex items-center space-x-4 mt-2">
            <span className="text-lg font-bold text-green-600">
              ${originalItem.price.toFixed(2)}
            </span>
            <span className={`px-2 py-1 text-xs rounded-full ${
              originalItem.priority === 'high' ? 'bg-red-100 text-red-800' :
              originalItem.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {originalItem.priority} priority
            </span>
            {originalItem.isPurchased && (
              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                Purchased
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <a
            href={originalItem.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="View on LEGO.com"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-red-600" />
              <CardTitle>My Wishlist</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg animate-pulse">
                <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Heart className="h-5 w-5 text-red-600" />
            <CardTitle>My Wishlist</CardTitle>
            <span className="text-sm text-gray-500">
              ({unpurchasedItems.length} items)
            </span>
          </div>
          {showViewAll && (
            <a
              href={viewAllHref}
              className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {displayItems.length === 0 ? (
          <div className="text-center py-8">
            <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No wishlist items yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Start building your wishlist by adding LEGO sets you want to buy.
            </p>
            <a
              href="/sets"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Sets
            </a>
          </div>
        ) : (
          <>
            {/* Temporarily replaced Gallery with simple list due to import issue */}
            <div className="space-y-4">
            {displayItems.map((item) => (
              <div key={item.id} className="border rounded-lg p-4">
                <div className="flex items-start gap-4">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-gray-600">{item.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="font-medium">${item.price}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        item.priority === 'high' ? 'bg-red-100 text-red-800' :
                        item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {item.priority} priority
                      </span>
                      {item.isPurchased && (
                        <span className="text-green-600 text-xs">✓ Purchased</span>
                      )}
                    </div>
                  </div>
                  <Heart className={`h-5 w-5 ${item.isPurchased ? 'text-gray-400' : 'text-red-500'}`} />
                </div>
              </div>
            ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
