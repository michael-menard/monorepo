import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import WishlistItemCard from '../WishlistItemCard/index.js';
import BatchOperationsToolbar from '../BatchOperationsToolbar/index.js';
import { useGetWishlistItemsQuery } from '../../store/wishlistApi.js';
import type { WishlistItem } from '../../schemas';

export interface WishlistProps {
  wishlistId: string;
  className?: string;
  onItemEdit?: (item: WishlistItem) => void;
  onItemDelete?: (id: string) => void;
  onItemTogglePurchased?: (id: string) => void;
  onItemsDeleted?: (deletedIds: string[]) => void;
  onItemsUpdated?: (updatedIds: string[]) => void;
  onItemsToggled?: (toggledIds: string[], isPurchased: boolean) => void;
  filters?: {
    search?: string;
    category?: string;
    priority?: 'low' | 'medium' | 'high';
    isPurchased?: boolean;
  };
}

const Wishlist: React.FC<WishlistProps> = ({
  wishlistId,
  className = '',
  onItemEdit,
  onItemDelete,
  onItemTogglePurchased,
  onItemsDeleted,
  onItemsUpdated,
  onItemsToggled,
  filters = {},
}) => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Fetch wishlist items
  const { data: items = [], isLoading, error } = useGetWishlistItemsQuery({
    wishlistId,
    filters,
  });

  const handleItemSelect = useCallback((itemId: string, checked: boolean) => {
    setSelectedItems((prev) =>
      checked ? [...prev, itemId] : prev.filter((id) => id !== itemId)
    );
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedItems([]);
  }, []);

  const handleItemsDeleted = useCallback((deletedIds: string[]) => {
    onItemsDeleted?.(deletedIds);
  }, [onItemsDeleted]);

  const handleItemsUpdated = useCallback((updatedIds: string[]) => {
    onItemsUpdated?.(updatedIds);
  }, [onItemsUpdated]);

  const handleItemsToggled = useCallback((toggledIds: string[], isPurchased: boolean) => {
    onItemsToggled?.(toggledIds, isPurchased);
  }, [onItemsToggled]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="flex items-center gap-2 text-gray-600">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Loading wishlist items...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-red-600">
          Error loading wishlist items. Please try again.
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-gray-500 text-center">
          <p className="text-lg font-medium mb-2">No items found</p>
          <p className="text-sm">Add some items to your wishlist to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${className}`}>
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <WishlistItemCard
              item={item}
              onEdit={onItemEdit}
              onDelete={onItemDelete}
              onTogglePurchased={onItemTogglePurchased}
              selected={selectedItems.includes(item.id)}
              onSelect={(checked) => handleItemSelect(item.id, checked)}
              showCheckbox={true}
            />
          </motion.div>
        ))}
      </div>

      {/* Batch Operations Toolbar */}
      <BatchOperationsToolbar
        selectedItems={selectedItems}
        totalItems={items.length}
        wishlistId={wishlistId}
        onClearSelection={handleClearSelection}
        onItemsDeleted={handleItemsDeleted}
        onItemsUpdated={handleItemsUpdated}
        onItemsToggled={handleItemsToggled}
      />
    </>
  );
};

export default Wishlist; 