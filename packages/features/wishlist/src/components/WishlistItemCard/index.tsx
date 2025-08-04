import React from 'react';
import { GripVertical, ExternalLink, Edit, Trash2, CheckCircle, Circle, Move } from 'lucide-react';
import type { WishlistItem } from '../../schemas';

export interface WishlistItemCardProps {
  item: WishlistItem;
  onEdit: (item: WishlistItem) => void;
  onDelete: (id: string) => void;
  onTogglePurchased: (id: string) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isDragging?: boolean;
  className?: string;
  selected?: boolean;
  onSelect?: (checked: boolean) => void;
  showCheckbox?: boolean;
  // Keyboard accessibility props
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  isKeyboardFocused?: boolean;
  isKeyboardDragging?: boolean;
  showKeyboardInstructions?: boolean;
}

export const WishlistItemCard: React.FC<WishlistItemCardProps> = ({
  item,
  onEdit,
  onDelete,
  onTogglePurchased,
  onDragStart,
  onDragEnd,
  isDragging = false,
  className = '',
  selected = false,
  onSelect,
  showCheckbox = false,
  // Keyboard accessibility props
  onKeyDown,
  onFocus,
  onBlur,
  isKeyboardFocused = false,
  isKeyboardDragging = false,
  showKeyboardInstructions = false,
}) => {
  const priorityColors = {
    low: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    high: 'bg-red-100 text-red-800 border-red-200',
  };

  const priorityLabels = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  };

  return (
    <div
      className={`
        relative bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200
        ${isDragging ? 'opacity-50 scale-95 rotate-2' : ''}
        ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        ${isKeyboardFocused ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
        ${isKeyboardDragging ? 'ring-2 ring-blue-600 ring-offset-2 bg-blue-50' : ''}
        ${className}
      `}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      tabIndex={0}
      role="button"
      aria-label={`Wishlist item: ${item.name}. ${showKeyboardInstructions ? 'Press Enter or Space to start moving this item. Use arrow keys to navigate.' : ''}`}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      {/* Selection Checkbox */}
      {showCheckbox && onSelect && (
        <div className="absolute top-2 right-2 z-10">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Drag Handle */}
      <div className="absolute top-2 left-2 cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4 text-gray-400 hover:text-gray-600" />
        {isKeyboardDragging && (
          <div className="absolute -top-1 -right-1 bg-blue-600 text-white rounded-full p-1">
            <Move className="w-3 h-3" />
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 pt-8">
        {/* Image and Basic Info */}
        <div className="flex gap-4 mb-3">
          {item.imageUrl && (
            <div className="flex-shrink-0">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-16 h-16 object-cover rounded-md border border-gray-200"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
              <button
                type="button"
                onClick={() => onTogglePurchased(item.id)}
                className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-full transition-colors"
                title={item.isPurchased ? 'Mark as not purchased' : 'Mark as purchased'}
              >
                {item.isPurchased ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>

            {item.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
            )}
          </div>
        </div>

        {/* Price and Meta Info */}
        <div className="flex items-center justify-between mb-3">
          {item.price && (
            <span className="text-lg font-semibold text-gray-900">${item.price.toFixed(2)}</span>
          )}

          <div className="flex items-center gap-2">
            <span
              className={`
                px-2 py-1 text-xs font-medium rounded-full border
                ${priorityColors[item.priority]}
              `}
            >
              {priorityLabels[item.priority]}
            </span>

            {item.category && (
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                {item.category}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View Item
            </a>
          )}

          <button
            type="button"
            onClick={() => onEdit(item)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>

          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors ml-auto"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Purchased Overlay */}
      {item.isPurchased && (
        <div className="absolute inset-0 bg-green-50 bg-opacity-50 rounded-lg border-2 border-green-200 flex items-center justify-center">
          <div className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">
            Purchased
          </div>
        </div>
      )}
    </div>
  );
};

export default WishlistItemCard; 