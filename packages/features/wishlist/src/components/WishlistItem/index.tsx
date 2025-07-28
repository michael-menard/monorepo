import React from 'react';
import type { WishlistItemProps } from '../../types';

export const WishlistItem: React.FC<WishlistItemProps> = ({
  item,
  onEdit,
  onDelete,
  onTogglePurchased,
  onDragStart,
  onDragEnd,
  isDragging = false,
}) => {
  return (
    <div
      className={`wishlist-item ${isDragging ? 'dragging' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="wishlist-item-content">
        <h3 className="wishlist-item-name">{item.name}</h3>
        {item.description && (
          <p className="wishlist-item-description">{item.description}</p>
        )}
        {item.price && (
          <p className="wishlist-item-price">${item.price.toFixed(2)}</p>
        )}
        <div className="wishlist-item-meta">
          <span className={`priority priority-${item.priority}`}>
            {item.priority}
          </span>
          {item.category && (
            <span className="category">{item.category}</span>
          )}
        </div>
        <div className="wishlist-item-actions">
          <button
            type="button"
            onClick={() => onTogglePurchased(item.id)}
            className={`toggle-purchased ${item.isPurchased ? 'purchased' : ''}`}
          >
            {item.isPurchased ? 'Purchased' : 'Mark as Purchased'}
          </button>
          <button type="button" onClick={() => onEdit(item)}>
            Edit
          </button>
          <button type="button" onClick={() => onDelete(item.id)}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default WishlistItem; 