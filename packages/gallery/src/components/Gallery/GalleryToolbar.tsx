import React from 'react';
import { cn } from '@repo/ui';
import { 
  Grid, 
  List, 
  Table, 
  MoreHorizontal, 
  Download, 
  Trash2, 
  Share2,
  CheckSquare,
  Square
} from 'lucide-react';
import type { GalleryConfig, GalleryActions } from '../../types/index';

interface GalleryToolbarProps {
  config: GalleryConfig;
  selectedItems: string[];
  totalItems: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  actions: GalleryActions;
  className?: string;
}

export const GalleryToolbar: React.FC<GalleryToolbarProps> = ({
  config,
  selectedItems,
  totalItems,
  onSelectAll,
  onClearSelection,
  actions,
  className = '',
}) => {
  const hasSelection = selectedItems.length > 0;
  const isAllSelected = selectedItems.length === totalItems && totalItems > 0;

  return (
    <div className={cn('flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3', className)}>
      {/* Left Side - Selection Controls */}
      <div className="flex items-center space-x-4">
        {config.selectable && (
          <div className="flex items-center space-x-2">
            <button
              onClick={isAllSelected ? onClearSelection : onSelectAll}
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span>
                {hasSelection 
                  ? `${selectedItems.length} selected`
                  : 'Select all'
                }
              </span>
            </button>
          </div>
        )}

        {/* Batch Actions */}
        {hasSelection && (
          <div className="flex items-center space-x-2 border-l border-gray-200 pl-4">
            <button
              onClick={() => actions.onBatchDownload?.(selectedItems)}
              className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </button>
            
            <button
              onClick={() => actions.onBatchShare?.(selectedItems)}
              className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
            >
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </button>
            
            <button
              onClick={() => actions.onBatchDelete?.(selectedItems)}
              className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Right Side - View Controls and Sort */}
      <div className="flex items-center space-x-4">
        {/* Sort Dropdown */}
        {config.sortable && config.sortOptions.length > 0 && (
          <div className="relative">
            <select 
              className="text-sm border border-gray-300 rounded px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              defaultValue={`${config.sortOptions[0]?.field}-${config.sortOptions[0]?.direction}`}
            >
              {config.sortOptions.map((option) => (
                <option 
                  key={`${option.field}-${option.direction}`}
                  value={`${option.field}-${option.direction}`}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Layout Switcher */}
        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
          <button
            className={cn(
              'p-2 text-sm transition-colors',
              config.layout === 'grid'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50'
            )}
            title="Grid View"
          >
            <Grid className="w-4 h-4" />
          </button>
          
          <button
            className={cn(
              'p-2 text-sm transition-colors border-l border-gray-300',
              config.layout === 'list'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50'
            )}
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
          
          <button
            className={cn(
              'p-2 text-sm transition-colors border-l border-gray-300',
              config.layout === 'table'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50'
            )}
            title="Table View"
          >
            <Table className="w-4 h-4" />
          </button>
        </div>

        {/* More Options */}
        <div className="relative">
          <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
