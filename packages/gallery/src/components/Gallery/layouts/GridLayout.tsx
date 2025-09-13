import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@repo/ui';
import type { GalleryItem, GalleryConfig, GalleryActions } from '../../../types/index.js';
import { GalleryCard } from '../GalleryCard.js';

interface GridLayoutProps {
  items: GalleryItem[];
  config: GalleryConfig;
  selectedItems: string[];
  onItemSelect: (itemId: string, selected: boolean) => void;
  actions: GalleryActions;
  loading?: boolean;
}

export const GridLayout: React.FC<GridLayoutProps> = ({
  items,
  config,
  selectedItems,
  onItemSelect,
  actions,
  loading = false,
}) => {
  // Generate responsive grid classes based on config
  const getGridClasses = () => {
    const { columns, gap } = config;
    return cn(
      'grid w-full',
      `gap-${gap}`,
      // Responsive columns
      `grid-cols-${columns.xs}`,
      `sm:grid-cols-${columns.sm}`,
      `md:grid-cols-${columns.md}`,
      `lg:grid-cols-${columns.lg}`,
      `xl:grid-cols-${columns.xl}`,
      // View mode spacing
      {
        'gap-2': config.viewMode === 'compact',
        'gap-4': config.viewMode === 'comfortable',
        'gap-6': config.viewMode === 'spacious',
      }
    );
  };

  // Animation variants for grid items
  const itemVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
      y: 20 
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        duration: config.animations.duration,
        ease: "easeOut"
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8,
      y: -20,
      transition: {
        duration: config.animations.duration * 0.5
      }
    }
  };

  const hoverVariants = {
    hover: {
      scale: 1.02,
      y: -4,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className={getGridClasses()}>
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
          className="gallery-grid-item"
        >
          <GalleryCard
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
            className={cn(
              'h-full transition-all duration-200',
              {
                'ring-2 ring-blue-500 ring-offset-2': selectedItems.includes(item.id),
              }
            )}
          />
        </motion.div>
      ))}
      
      {/* Loading placeholders for infinite scroll */}
      {loading && (
        <>
          {Array.from({ length: config.itemsPerPage }).map((_, index) => (
            <div
              key={`loading-${index}`}
              className={cn(
                'animate-pulse bg-gray-200 rounded-lg',
                {
                  'aspect-square': config.viewMode === 'compact',
                  'aspect-[4/3]': config.viewMode === 'comfortable',
                  'aspect-[3/2]': config.viewMode === 'spacious',
                }
              )}
            />
          ))}
        </>
      )}
    </div>
  );
};
