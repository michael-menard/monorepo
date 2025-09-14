import React, { useState } from 'react';
import { cn } from '@repo/ui';
import { 
  Heart, 
  Share2, 
  Download, 
  Trash2, 
  Edit, 
  MoreHorizontal,
  Eye,
  Calendar,
  User,
  Tag
} from 'lucide-react';
import type { GalleryItem, GalleryConfig } from '../../types/index';

interface GalleryListItemProps {
  item: GalleryItem;
  config: GalleryConfig;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onClick: () => void;
  onLike: (liked: boolean) => void;
  onShare: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onEdit: () => void;
}

export const GalleryListItem: React.FC<GalleryListItemProps> = ({
  item,
  config,
  selected,
  onSelect,
  onClick,
  onLike,
  onShare,
  onDelete,
  onDownload,
  onEdit,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Get item styling based on view mode
  const getItemClasses = () => {
    const baseClasses = 'flex items-center bg-white rounded-lg border border-gray-200 transition-all duration-200 hover:shadow-md cursor-pointer';
    
    switch (config.viewMode) {
      case 'compact':
        return cn(baseClasses, 'p-2 space-x-3');
      case 'spacious':
        return cn(baseClasses, 'p-4 space-x-4');
      case 'comfortable':
      default:
        return cn(baseClasses, 'p-3 space-x-3');
    }
  };

  // Get image size based on view mode
  const getImageSize = () => {
    switch (config.viewMode) {
      case 'compact':
        return 'w-12 h-12';
      case 'spacious':
        return 'w-20 h-20';
      case 'comfortable':
      default:
        return 'w-16 h-16';
    }
  };

  // Handle action clicks
  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <div className={cn(getItemClasses(), { 'ring-2 ring-blue-500': selected })}>
      {/* Selection Checkbox */}
      {config.selectable && (
        <div className="flex-shrink-0">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect(e.target.checked);
            }}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Thumbnail */}
      <div className={cn('relative flex-shrink-0 rounded overflow-hidden bg-gray-100', getImageSize())}>
        {/* Loading State */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
            <Eye className="w-4 h-4 text-gray-400" />
          </div>
        )}

        {/* Error State */}
        {imageError && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <Eye className="w-4 h-4 text-gray-400" />
          </div>
        )}

        {/* Image */}
        <img
          src={item.thumbnailUrl || item.imageUrl}
          alt={item.title || 'Gallery item'}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-200',
            {
              'opacity-0': !imageLoaded,
              'opacity-100': imageLoaded,
            }
          )}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          loading="lazy"
        />

        {/* Type Badge */}
        {item.type && item.type !== 'image' && (
          <div className="absolute top-1 right-1">
            <span className={cn(
              'px-1 py-0.5 text-xs font-medium rounded',
              {
                'bg-purple-100 text-purple-800': item.type === 'inspiration',
                'bg-blue-100 text-blue-800': item.type === 'instruction',
                'bg-green-100 text-green-800': item.type === 'wishlist',
                'bg-gray-100 text-gray-800': item.type === 'custom',
              }
            )}>
              {item.type.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0" onClick={onClick}>
        {/* Title and Description */}
        <div className="mb-1">
          <h3 className={cn(
            'font-medium text-gray-900 truncate',
            {
              'text-sm': config.viewMode === 'compact',
              'text-base': config.viewMode === 'comfortable',
              'text-lg': config.viewMode === 'spacious',
            }
          )}>
            {item.title || 'Untitled'}
          </h3>
          
          {item.description && config.viewMode !== 'compact' && (
            <p className={cn(
              'text-gray-600 line-clamp-1',
              {
                'text-sm': config.viewMode === 'comfortable',
                'text-base': config.viewMode === 'spacious',
              }
            )}>
              {item.description}
            </p>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center space-x-4 text-xs text-gray-500">
          {item.author && (
            <div className="flex items-center space-x-1">
              <User className="w-3 h-3" />
              <span className="truncate max-w-24">{item.author}</span>
            </div>
          )}
          
          <div className="flex items-center space-x-1">
            <Calendar className="w-3 h-3" />
            <span>{item.createdAt.toLocaleDateString()}</span>
          </div>

          {item.category && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
              {item.category}
            </span>
          )}
        </div>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && config.viewMode === 'spacious' && (
          <div className="flex items-center mt-2 space-x-1">
            <Tag className="w-3 h-3 text-gray-400" />
            <div className="flex flex-wrap gap-1">
              {item.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full"
                >
                  {tag}
                </span>
              ))}
              {item.tags.length > 3 && (
                <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                  +{item.tags.length - 3}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-1 flex-shrink-0">
        <button
          onClick={(e) => handleActionClick(e, () => onLike(!item.liked))}
          className={cn(
            'p-2 rounded-full transition-colors',
            item.liked 
              ? 'text-red-500 hover:bg-red-50' 
              : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
          )}
        >
          <Heart className={cn('w-4 h-4', { 'fill-current': item.liked })} />
        </button>
        
        <button
          onClick={(e) => handleActionClick(e, onShare)}
          className="p-2 rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
        >
          <Share2 className="w-4 h-4" />
        </button>
        
        <button
          onClick={(e) => handleActionClick(e, onDownload)}
          className="p-2 rounded-full text-gray-400 hover:text-green-500 hover:bg-green-50 transition-colors"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* More Actions Menu */}
        <div className="relative">
          <button
            onClick={(e) => handleActionClick(e, () => {})}
            className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
