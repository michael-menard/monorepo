import React from 'react';
import { z } from 'zod';
import type { WishlistItemSchema } from '../../WishlistSchemas/index.js';
export type WishlistItem = z.infer<typeof WishlistItemSchema> & {
    id: string;
};
export interface WishlistItemCardProps {
    item: WishlistItem;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onDragStart?: (id: string) => void;
    onDragEnd?: () => void;
    draggable?: boolean;
}
export declare const WishlistItemCard: React.FC<WishlistItemCardProps>;
export default WishlistItemCard;
