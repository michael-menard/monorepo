import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@repo/ui';
import { ChevronUp, ChevronDown, MoreHorizontal } from 'lucide-react';
import type { GalleryItem, GalleryConfig, GalleryActions } from '../../../types/index.js';

interface TableLayoutProps {
  items: GalleryItem[];
  config: GalleryConfig;
  selectedItems: string[];
  onItemSelect: (itemId: string, selected: boolean) => void;
  actions: GalleryActions;
  loading?: boolean;
}

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (item: GalleryItem) => React.ReactNode;
}

export const TableLayout: React.FC<TableLayoutProps> = ({
  items,
  config,
  selectedItems,
  onItemSelect,
  actions,
  loading = false,
}) => {
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Define table columns
  const columns: Column[] = [
    {
      key: 'thumbnail',
      label: '',
      width: 'w-16',
      render: (item) => (
        <img
          src={item.thumbnailUrl || item.imageUrl}
          alt={item.title || 'Item'}
          className="w-12 h-12 object-cover rounded"
          loading="lazy"
        />
      ),
    },
    {
      key: 'title',
      label: 'Title',
      sortable: true,
      width: 'flex-1',
      render: (item) => (
        <div>
          <div className="font-medium text-gray-900 truncate">
            {item.title || 'Untitled'}
          </div>
          {item.description && (
            <div className="text-sm text-gray-500 truncate">
              {item.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'author',
      label: 'Author',
      sortable: true,
      width: 'w-32',
      render: (item) => (
        <div className="text-sm text-gray-900 truncate">
          {item.author || '—'}
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      width: 'w-24',
      render: (item) => (
        <div className="text-sm text-gray-900 truncate">
          {item.category || '—'}
        </div>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      width: 'w-32',
      render: (item) => (
        <div className="text-sm text-gray-900">
          {item.createdAt.toLocaleDateString()}
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: 'w-16',
      render: (item) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Show context menu or dropdown
          }}
          className="p-1 rounded hover:bg-gray-100 transition-colors"
        >
          <MoreHorizontal className="w-4 h-4 text-gray-500" />
        </button>
      ),
    },
  ];

  // Handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort items
  const sortedItems = React.useMemo(() => {
    return [...items].sort((a, b) => {
      const aValue = a[sortField as keyof GalleryItem];
      const bValue = b[sortField as keyof GalleryItem];
      
      if (aValue === bValue) return 0;
      
      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [items, sortField, sortDirection]);

  // Animation variants
  const rowVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (index: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: config.animations.duration,
        delay: config.animations.stagger ? index * config.animations.staggerDelay : 0,
      },
    }),
    exit: { opacity: 0, y: -10 },
  };

  return (
    <div className="w-full overflow-hidden bg-white rounded-lg border border-gray-200">
      {/* Table Header */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="flex items-center px-4 py-3">
          {/* Select All Checkbox */}
          {config.selectable && (
            <div className="w-12 flex-shrink-0">
              <input
                type="checkbox"
                checked={selectedItems.length === items.length && items.length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    actions.onItemsSelected?.(items.map(item => item.id));
                  } else {
                    actions.onItemsSelected?.([]);
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Column Headers */}
          {columns.map((column) => (
            <div
              key={column.key}
              className={cn(
                'flex items-center px-3 py-2',
                column.width,
                {
                  'cursor-pointer hover:bg-gray-100 rounded': column.sortable,
                }
              )}
              onClick={() => column.sortable && handleSort(column.key)}
            >
              <span className="text-sm font-medium text-gray-700">
                {column.label}
              </span>
              {column.sortable && sortField === column.key && (
                <div className="ml-1">
                  {sortDirection === 'asc' ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-gray-200">
        {sortedItems.map((item, index) => (
          <motion.div
            key={item.id}
            layoutId={item.id}
            variants={config.animations.enabled ? rowVariants : undefined}
            initial={config.animations.enabled ? "hidden" : undefined}
            animate={config.animations.enabled ? "visible" : undefined}
            exit={config.animations.enabled ? "exit" : undefined}
            custom={index}
            className={cn(
              'flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors',
              {
                'bg-blue-50 border-blue-200': selectedItems.includes(item.id),
              }
            )}
            onClick={() => actions.onItemClick?.(item)}
          >
            {/* Selection Checkbox */}
            {config.selectable && (
              <div className="w-12 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    onItemSelect(item.id, e.target.checked);
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Column Data */}
            {columns.map((column) => (
              <div
                key={column.key}
                className={cn('px-3 py-2', column.width)}
              >
                {column.render ? column.render(item) : item[column.key as keyof GalleryItem]}
              </div>
            ))}
          </motion.div>
        ))}

        {/* Loading Rows */}
        {loading && (
          <>
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={`loading-${index}`}
                className="flex items-center px-4 py-3 animate-pulse"
              >
                {config.selectable && (
                  <div className="w-12 flex-shrink-0">
                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                  </div>
                )}
                {columns.map((column) => (
                  <div
                    key={column.key}
                    className={cn('px-3 py-2', column.width)}
                  >
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Empty State */}
      {!loading && items.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">No items to display</div>
        </div>
      )}
    </div>
  );
};
