import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@repo/ui';
import type { GalleryItem, GalleryConfig, GalleryActions } from '../../../types/index.js';
import { GalleryCard } from '../GalleryCard.js';

interface MasonryLayoutProps {
  items: GalleryItem[];
  config: GalleryConfig;
  selectedItems: string[];
  onItemSelect: (itemId: string, selected: boolean) => void;
  actions: GalleryActions;
  loading?: boolean;
}

export const MasonryLayout: React.FC<MasonryLayoutProps> = ({
  items,
  config,
  selectedItems,
  onItemSelect,
  actions,
  loading = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columnHeights, setColumnHeights] = useState<number[]>([]);
  const [itemPositions, setItemPositions] = useState<Map<string, { x: number; y: number; column: number }>>(new Map());

  // Calculate number of columns based on screen size and config
  const getColumnCount = () => {
    if (typeof window === 'undefined') return config.columns.md;
    
    const width = window.innerWidth;
    if (width >= 1280) return config.columns.xl;
    if (width >= 1024) return config.columns.lg;
    if (width >= 768) return config.columns.md;
    if (width >= 640) return config.columns.sm;
    return config.columns.xs;
  };

  const [columnCount, setColumnCount] = useState(getColumnCount);

  // Update column count on resize
  useEffect(() => {
    const handleResize = () => {
      setColumnCount(getColumnCount());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [config.columns]);

  // Calculate masonry layout
  useEffect(() => {
    if (!containerRef.current || items.length === 0) return;

    const container = containerRef.current;
    const containerWidth = container.offsetWidth;
    const gap = config.gap * 4; // Convert Tailwind gap to pixels (gap-4 = 16px)
    const columnWidth = (containerWidth - gap * (columnCount - 1)) / columnCount;

    // Initialize column heights
    const heights = new Array(columnCount).fill(0);
    const positions = new Map<string, { x: number; y: number; column: number }>();

    items.forEach((item, index) => {
      // Find the shortest column
      const shortestColumnIndex = heights.indexOf(Math.min(...heights));
      
      // Calculate position
      const x = shortestColumnIndex * (columnWidth + gap);
      const y = heights[shortestColumnIndex];
      
      // Estimate item height (you might want to make this more sophisticated)
      const estimatedHeight = 200 + Math.random() * 100; // Random height for demo
      
      positions.set(item.id, { x, y, column: shortestColumnIndex });
      heights[shortestColumnIndex] += estimatedHeight + gap;
    });

    setColumnHeights(heights);
    setItemPositions(positions);
  }, [items, columnCount, config.gap]);

  // Animation variants
  const itemVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
      y: 50 
    },
    visible: (custom: { delay: number }) => ({ 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        duration: config.animations.duration,
        delay: custom.delay,
        ease: "easeOut"
      }
    }),
    exit: { 
      opacity: 0, 
      scale: 0.8,
      transition: {
        duration: config.animations.duration * 0.5
      }
    }
  };

  const containerHeight = Math.max(...columnHeights);

  return (
    <div 
      ref={containerRef}
      className="relative w-full"
      style={{ height: containerHeight }}
    >
      {items.map((item, index) => {
        const position = itemPositions.get(item.id);
        if (!position) return null;

        const delay = config.animations.stagger ? index * config.animations.staggerDelay : 0;

        return (
          <motion.div
            key={item.id}
            layoutId={item.id}
            variants={config.animations.enabled ? itemVariants : undefined}
            initial={config.animations.enabled ? "hidden" : undefined}
            animate={config.animations.enabled ? "visible" : undefined}
            exit={config.animations.enabled ? "exit" : undefined}
            custom={{ delay }}
            className="absolute"
            style={{
              left: position.x,
              top: position.y,
              width: `calc((100% - ${(columnCount - 1) * config.gap * 4}px) / ${columnCount})`,
            }}
            whileHover={config.animations.enabled ? {
              scale: 1.02,
              zIndex: 10,
              transition: { duration: 0.2 }
            } : undefined}
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
                'w-full transition-all duration-200',
                {
                  'ring-2 ring-blue-500 ring-offset-2': selectedItems.includes(item.id),
                }
              )}
            />
          </motion.div>
        );
      })}

      {/* Loading indicators */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
};
