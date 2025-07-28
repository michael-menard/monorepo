import React from 'react';
import type {
  WishlistItem,
  Wishlist,
  CreateWishlistItem,
  UpdateWishlistItem,
  CreateWishlist,
  UpdateWishlist,
  DragDrop,
  WishlistFilter,
  CategoryFilter,
} from '../schemas';

// Re-export types from schemas
export type {
  WishlistItem,
  Wishlist,
  CreateWishlistItem,
  UpdateWishlistItem,
  CreateWishlist,
  UpdateWishlist,
  DragDrop,
  WishlistFilter,
  CategoryFilter,
} from '../schemas';

// Additional types for components
export interface WishlistItemProps {
  item: WishlistItem;
  onEdit: (item: WishlistItem) => void;
  onDelete: (id: string) => void;
  onTogglePurchased: (id: string) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isDragging?: boolean;
}

export interface WishlistProps {
  items: WishlistItem[];
  onAddItem: (item: CreateWishlistItem) => void;
  onEditItem: (id: string, item: UpdateWishlistItem) => void;
  onDeleteItem: (id: string) => void;
  onTogglePurchased: (id: string) => void;
  onReorderItems: (sourceIndex: number, destinationIndex: number) => void;
  filter?: WishlistFilter;
  onFilterChange?: (filter: WishlistFilter) => void;
  className?: string;
}

export interface WishlistFormProps {
  onSubmit: (data: CreateWishlistItem) => void;
  onCancel: () => void;
  initialData?: Partial<CreateWishlistItem>;
  isEditing?: boolean;
}

export interface WishlistFilterProps {
  filter: WishlistFilter;
  onFilterChange: (filter: WishlistFilter) => void;
  categories: string[];
  className?: string;
}

export interface CategoryFilterProps {
  filter: CategoryFilter;
  onFilterChange: (filter: CategoryFilter) => void;
  categories?: string[];
  className?: string;
}

// API response types
export interface WishlistApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface WishlistListResponse {
  wishlists: Wishlist[];
  total: number;
  page: number;
  limit: number;
}

export interface WishlistItemListResponse {
  items: WishlistItem[];
  total: number;
  page: number;
  limit: number;
} 