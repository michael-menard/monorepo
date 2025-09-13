import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@repo/ui';
import type { GalleryItem, GalleryConfig, GalleryActions } from '../../../types/index.js';
import { GalleryListItem } from '../GalleryListItem.js';

interface ListLayoutProps {
  items: GalleryItem[];
  config: GalleryConfig;
  selectedItems: string[];
  onItemSelect: (itemId: string, selected: boolean) => void;
  actions: GalleryActions;
  loading?: boolean;
}

export const ListLayout: React.FC<ListLayoutProps> = ({
  items,
  config,
  selectedItems,
  onItemSelect,
  actions,
  loading = false,
}) => {
  // Animation variants for list items
  const itemVariants = {
    hidden: { 
      opacity: 0, 
      x: -20,
      scale: 0.95
    },
    visible: (index: number) => ({ 
      opacity: 1, 
      x: 0,
      scale: 1,
      transition: {
        duration: config.animations.duration,
        delay: config.animations.stagger ? index * config.animations.staggerDelay : 0,
        ease: "easeOut"
      }
    }),
    exit: { 
      opacity: 0, 
      x: 20,
      scale: 0.95,
      transition: {
        duration: config.animations.duration * 0.5
      }
    }
  };

  const hoverVariants = {
    hover: {
      x: 4,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    }
  };

  // Get spacing based on view mode
  const getSpacing = () => {
    switch (config.viewMode) {
      case 'compact':
        return 'space-y-1';
      case 'spacious':
        return 'space-y-4';
      case 'comfortable':
      default:
        return 'space-y-2';
    }
  };

  return (
    <div className={cn('w-full', getSpacing())}>
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          layoutId={item.id}
          variants={config.animations.enabled ? itemVariants : undefined}
          whileHover={config.animations.enabled ? hoverVariants.hover : undefined}
          initial={config.animations.enabled ? "hidden" : undefined}
          animate={config.animations.enabled ? "visible" : undefined}
          exit={config.animations.enabled ? "exit" : undefined}
          custom={index}
          className={cn(
            'gallery-list-item transition-all duration-200',
            {
              'ring-2 ring-blue-500 ring-offset-2 rounded-lg': selectedItems.includes(item.id),
            }
          )}
        >
          <GalleryListItem
            item={item}
            config={config}
            selected={selectedItems.includes(item.id)}
            onSelect={(selected) => onItemSelect(item.id, selected)}
            onClick={() => actions.onItemClick?.(item)}
            onLike={(liked) => actions.onItemLike?.(item.id, liked)}
            onShare={() => actions.onItemShare?.(item.id)}
            onDelete={() => actions.onItemDelete?.(item.id)}
            onDownload={() => actions.onItemDownload?.(item.id)}
            onEdit={() => actions.onItemEdit?.(item)}
          />
        </motion.div>
      ))}
      
      {/* Loading placeholders */}
      {loading && (
        <div className={cn('w-full', getSpacing())}>
          {Array.from({ length: Math.min(config.itemsPerPage, 10) }).map((_, index) => (
            <div
              key={`loading-${index}`}
              className={cn(
                'animate-pulse bg-gray-200 rounded-lg flex items-center p-4 space-x-4',
                {
                  'h-16': config.viewMode === 'compact',
                  'h-20': config.viewMode === 'comfortable',
                  'h-24': config.viewMode === 'spacious',
                }
              )}
            >
              {/* Image placeholder */}
              <div className={cn(
                'bg-gray-300 rounded flex-shrink-0',
                {
                  'w-12 h-12': config.viewMode === 'compact',
                  'w-16 h-16': config.viewMode === 'comfortable',
                  'w-20 h-20': config.viewMode === 'spacious',
                }
              )} />
              
              {/* Content placeholder */}
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
              
              {/* Actions placeholder */}
              <div className="flex space-x-2">
                <div className="w-8 h-8 bg-gray-300 rounded"></div>
                <div className="w-8 h-8 bg-gray-300 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
