import React, { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { cn } from '@repo/ui';
import type { GalleryProps, GalleryItem, GalleryConfig } from '../../types/index';
import { GalleryConfigSchema } from '../../types/index';
import { getPreset, mergePresetConfig } from '../../presets/index';
import { GridLayout } from './layouts/GridLayout';
import { MasonryLayout } from './layouts/MasonryLayout';
import { ListLayout } from './layouts/ListLayout';
import { TableLayout } from './layouts/TableLayout';
import { CarouselLayout } from './layouts/CarouselLayout';
import { GalleryHeader } from './GalleryHeader';
import { GalleryToolbar } from './GalleryToolbar';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { EmptyState } from './EmptyState';

export const Gallery: React.FC<GalleryProps> = ({
  items: rawItems = [],
  config: customConfig = {},
  actions = {},
  className = '',
  loading = false,
  error = null,
  selectedItems: externalSelectedItems,
  adapter,
  preset,
}) => {
  // Internal state for selection when not controlled externally
  const [internalSelectedItems, setInternalSelectedItems] = useState<string[]>([]);
  
  // Determine if selection is controlled externally
  const isSelectionControlled = externalSelectedItems !== undefined;
  const selectedItems = isSelectionControlled ? externalSelectedItems : internalSelectedItems;

  // Resolve preset configuration
  const resolvedConfig = useMemo(() => {
    let baseConfig = customConfig;
    
    if (preset) {
      const presetConfig = typeof preset === 'string' ? getPreset(preset) : preset;
      if (presetConfig) {
        baseConfig = mergePresetConfig(presetConfig, customConfig);
      }
    }
    
    // Validate and apply defaults
    return GalleryConfigSchema.parse(baseConfig);
  }, [preset, customConfig]);

  // Transform items using adapter if provided
  const items = useMemo(() => {
    if (!adapter) return rawItems;
    
    return rawItems.map(item => {
      if (adapter.validate && !adapter.validate(item)) {
        console.warn('Gallery: Invalid item data', item);
        return null;
      }
      return adapter.transform(item);
    }).filter((item): item is GalleryItem => item !== null);
  }, [rawItems, adapter]);

  // Selection handlers
  const handleItemSelect = useCallback((itemId: string, selected: boolean) => {
    if (!isSelectionControlled) {
      setInternalSelectedItems(prev => 
        selected 
          ? [...prev, itemId]
          : prev.filter(id => id !== itemId)
      );
    }
    
    const newSelection = selected 
      ? [...selectedItems, itemId]
      : selectedItems.filter(id => id !== itemId);
    
    actions.onItemsSelected?.(newSelection);
  }, [selectedItems, isSelectionControlled, actions]);

  const handleSelectAll = useCallback(() => {
    const allIds = items.map(item => item.id);
    if (!isSelectionControlled) {
      setInternalSelectedItems(allIds);
    }
    actions.onItemsSelected?.(allIds);
  }, [items, isSelectionControlled, actions]);

  const handleClearSelection = useCallback(() => {
    if (!isSelectionControlled) {
      setInternalSelectedItems([]);
    }
    actions.onItemsSelected?.([]);
  }, [isSelectionControlled, actions]);

  // Layout component selection
  const LayoutComponent = useMemo(() => {
    switch (resolvedConfig.layout) {
      case 'masonry':
        return MasonryLayout;
      case 'list':
        return ListLayout;
      case 'table':
        return TableLayout;
      case 'carousel':
        return CarouselLayout;
      case 'grid':
      default:
        return GridLayout;
    }
  }, [resolvedConfig.layout]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: resolvedConfig.animations.duration,
        staggerChildren: resolvedConfig.animations.stagger ? resolvedConfig.animations.staggerDelay : 0,
      },
    },
  };

  // Error state
  if (error) {
    return (
      <div className={cn('gallery-container', className)}>
        <ErrorState 
          error={error} 
          onRetry={actions.onRefresh}
          className="min-h-[400px]"
        />
      </div>
    );
  }

  // Loading state
  if (loading && items.length === 0) {
    return (
      <div className={cn('gallery-container', className)}>
        <LoadingState 
          layout={resolvedConfig.layout}
          itemCount={resolvedConfig.itemsPerPage}
          className="min-h-[400px]"
        />
      </div>
    );
  }

  // Empty state
  if (!loading && items.length === 0) {
    return (
      <div className={cn('gallery-container', className)}>
        <EmptyState 
          title="No items found"
          description="Try adjusting your search or filters"
          className="min-h-[400px]"
        />
      </div>
    );
  }

  return (
    <div className={cn('gallery-container', className)}>
      {/* Gallery Header with Search and Filters */}
      {resolvedConfig.filterConfig.searchable && (
        <GalleryHeader
          config={resolvedConfig}
          actions={actions}
          className="mb-6"
        />
      )}

      {/* Gallery Toolbar with Selection and Actions */}
      {(resolvedConfig.selectable || resolvedConfig.sortable) && (
        <GalleryToolbar
          config={resolvedConfig}
          selectedItems={selectedItems}
          totalItems={items.length}
          onSelectAll={handleSelectAll}
          onClearSelection={handleClearSelection}
          actions={actions}
          className="mb-4"
        />
      )}

      {/* Main Gallery Content */}
      <LayoutGroup>
        <motion.div
          variants={resolvedConfig.animations.enabled ? containerVariants : undefined}
          initial={resolvedConfig.animations.enabled ? "hidden" : undefined}
          animate={resolvedConfig.animations.enabled ? "visible" : undefined}
          className="gallery-content"
        >
          <AnimatePresence mode="popLayout">
            <LayoutComponent
              items={items}
              config={resolvedConfig}
              selectedItems={selectedItems}
              onItemSelect={handleItemSelect}
              actions={actions}
              loading={loading}
            />
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>

      {/* Loading indicator for infinite scroll */}
      {loading && items.length > 0 && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
};

Gallery.displayName = 'Gallery';
