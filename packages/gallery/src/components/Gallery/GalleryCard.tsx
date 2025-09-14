import React, { useState } from 'react';
import { motion } from 'framer-motion';
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

interface GalleryCardProps {
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
  className?: string;
}

export const GalleryCard: React.FC<GalleryCardProps> = ({
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
  className = '',
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showActions, setShowActions] = useState(false);

  // Get card styling based on view mode
  const getCardClasses = () => {
    const baseClasses = 'bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-200';
    
    switch (config.viewMode) {
      case 'compact':
        return cn(baseClasses, 'hover:shadow-md');
      case 'spacious':
        return cn(baseClasses, 'hover:shadow-lg hover:-translate-y-1');
      case 'comfortable':
      default:
        return cn(baseClasses, 'hover:shadow-md hover:-translate-y-0.5');
    }
  };

  // Get image aspect ratio based on layout
  const getImageAspectRatio = () => {
    switch (config.layout) {
      case 'masonry':
        return 'aspect-auto'; // Let masonry handle the height
      case 'carousel':
        return 'aspect-[4/3]';
      case 'list':
        return 'aspect-square';
      default:
        return config.viewMode === 'compact' ? 'aspect-square' : 'aspect-[4/3]';
    }
  };

  // Handle action clicks
  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <motion.div
      className={cn(getCardClasses(), className)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      whileHover={config.animations.enabled ? { y: -2 } : undefined}
      transition={{ duration: 0.2 }}
    >
      {/* Selection Checkbox */}
      {config.selectable && (
        <div className="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect(e.target.checked);
            }}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white/90"
          />
        </div>
      )}

      {/* Image Container */}
      <div 
        className={cn('relative cursor-pointer', getImageAspectRatio())}
        onClick={onClick}
      >
        {/* Loading State */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
            <div className="w-8 h-8 text-gray-400">
              <Eye className="w-full h-full" />
            </div>
          </div>
        )}

        {/* Error State */}
        {imageError && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="w-8 h-8 mx-auto mb-2">
                <Eye className="w-full h-full" />
              </div>
              <div className="text-xs">Image unavailable</div>
            </div>
          </div>
        )}

        {/* Main Image */}
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

        {/* Overlay Actions */}
        <motion.div
          className="absolute inset-0 bg-black/50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: showActions ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex space-x-2">
            <button
              onClick={(e) => handleActionClick(e, () => onLike(!item.liked))}
              className={cn(
                'p-2 rounded-full transition-colors',
                item.liked 
                  ? 'bg-red-500 text-white' 
                  : 'bg-white/90 text-gray-700 hover:bg-white'
              )}
            >
              <Heart className={cn('w-4 h-4', { 'fill-current': item.liked })} />
            </button>
            
            <button
              onClick={(e) => handleActionClick(e, onShare)}
              className="p-2 rounded-full bg-white/90 text-gray-700 hover:bg-white transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
            
            <button
              onClick={(e) => handleActionClick(e, onDownload)}
              className="p-2 rounded-full bg-white/90 text-gray-700 hover:bg-white transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* Type Badge */}
        {item.type && item.type !== 'image' && (
          <div className="absolute top-2 right-2">
            <span className={cn(
              'px-2 py-1 text-xs font-medium rounded-full',
              {
                'bg-purple-100 text-purple-800': item.type === 'inspiration',
                'bg-blue-100 text-blue-800': item.type === 'instruction',
                'bg-green-100 text-green-800': item.type === 'wishlist',
                'bg-gray-100 text-gray-800': item.type === 'custom',
              }
            )}>
              {item.type}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={cn(
        'p-3',
        {
          'p-2': config.viewMode === 'compact',
          'p-4': config.viewMode === 'spacious',
        }
      )}>
        {/* Title and Description */}
        <div className="mb-2">
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
            <p className="text-sm text-gray-600 line-clamp-2 mt-1">
              {item.description}
            </p>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-3">
            {item.author && (
              <div className="flex items-center space-x-1">
                <User className="w-3 h-3" />
                <span className="truncate max-w-20">{item.author}</span>
              </div>
            )}
            
            <div className="flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>{item.createdAt.toLocaleDateString()}</span>
            </div>
          </div>

          {/* Action Menu */}
          <div className="relative">
            <button
              onClick={(e) => handleActionClick(e, () => {})}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && config.viewMode !== 'compact' && (
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
    </motion.div>
  );
};
