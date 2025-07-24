import React, { useState, useEffect } from 'react';
import CategoryFilter from '../../../../packages/wishlist/src/components/CategoryFilter';
import WishlistList from '../../../../packages/wishlist/src/components/WishlistList';
import { WishlistItem } from '../../../../packages/wishlist/src/components/WishlistItemCard';

const persistKey = 'wishlist-items';

const WishlistPage = () => {
  const [category, setCategory] = useState<string | null>(null);
  const [items, setItems] = useState<WishlistItem[]>([]);

  useEffect(() => {
    const persisted = localStorage.getItem(persistKey);
    if (persisted) {
      try {
        setItems(JSON.parse(persisted));
      } catch {
        setItems([]);
      }
    }
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Wishlist</h1>
      <CategoryFilter value={category} onChange={setCategory} />
      <WishlistList items={items} persistKey={persistKey} categoryFilter={category} />
    </div>
  );
};

export default WishlistPage; 