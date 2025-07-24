import React from 'react';
import type { WishlistItem } from './WishlistItemCard.js';
export interface WishlistListProps {
    items: WishlistItem[];
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    onReorder?: (items: WishlistItem[]) => void;
    persistKey?: string;
    categoryFilter?: string | null;
}
export declare const reorder: (list: WishlistItem[], startIndex: number, endIndex: number) => WishlistItem[];
export declare const WishlistList: React.FC<WishlistListProps>;
export declare const filterWishlistByCategory: (items: WishlistItem[], category: string | null) => any[];
export default WishlistList;
