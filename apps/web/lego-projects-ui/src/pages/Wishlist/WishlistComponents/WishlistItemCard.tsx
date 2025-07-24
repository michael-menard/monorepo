import React from 'react';
import { z } from 'zod';
// @ts-expect-error: TypeScript cannot resolve .js import for WishlistSchemas, but it exists and is correct for NodeNext/ESM
import type { WishlistItemSchema } from '../../WishlistSchemas/index.js';

export type WishlistItem = z.infer<typeof WishlistItemSchema> & { id: string };

export interface WishlistItemCardProps {
  item: WishlistItem;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
  draggable?: boolean;
}

export const WishlistItemCard: React.FC<WishlistItemCardProps> = ({
  item,
  onEdit = () => {},
  onDelete = () => {},
  onDragStart,
  onDragEnd,
  draggable = true,
}) => {
  return (
    <div
      aria-label={item.title}
      role="button"
      tabIndex={0}
      className="relative flex items-center gap-4 bg-white rounded-lg shadow p-4 hover:shadow-lg transition group cursor-pointer"
      draggable={draggable}
      onDragStart={e => { e.dataTransfer.setData('text/plain', item.id); onDragStart?.(item.id); }}
      onDragEnd={onDragEnd}
    >
      {/* Drag handle */}
      <div className="flex-shrink-0 cursor-grab pr-2" title="Drag to reorder">
        <span className="text-gray-400 text-2xl select-none">⋮⋮</span>
      </div>
      {/* Image */}
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={item.title}
          className="w-16 h-16 object-cover rounded-md border border-gray-200"
        />
      )}
      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 text-base truncate">{item.title}</h3>
          {item.category && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full truncate">{item.category}</span>
          )}
        </div>
        {item.description && (
          <p className="text-gray-600 text-sm mt-1 line-clamp-2">{item.description}</p>
        )}
        {item.productLink && (
          <a
            href={item.productLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-xs mt-1 block truncate"
          >
            {item.productLink}
          </a>
        )}
      </div>
      {/* Actions */}
      <div className="flex flex-col gap-2 ml-2">
        <button
          type="button"
          aria-label="Edit item"
          className="p-2 rounded hover:bg-blue-100 text-blue-600"
          onClick={e => { e.stopPropagation(); onEdit?.(item.id); }}
        >
          ✏️
        </button>
        <button
          type="button"
          aria-label="Delete item"
          className="p-2 rounded hover:bg-red-100 text-red-600"
          onClick={e => { e.stopPropagation(); onDelete?.(item.id); }}
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

export default WishlistItemCard; 