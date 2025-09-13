import React, { useState } from 'react';
import { cn } from '@repo/ui';
import { Search, Filter, X } from 'lucide-react';
import type { GalleryConfig, GalleryActions } from '../../types/index.js';

interface GalleryHeaderProps {
  config: GalleryConfig;
  actions: GalleryActions;
  className?: string;
}

export const GalleryHeader: React.FC<GalleryHeaderProps> = ({
  config,
  actions,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    // Debounce search - you might want to implement proper debouncing
    // actions.onSearch?.(value);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    // actions.onSearch?.('');
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search Bar */}
      {config.filterConfig.searchable && (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search gallery..."
            className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
      )}

      {/* Filter Toggle */}
      {(config.filterConfig.tagFilter || config.filterConfig.categoryFilter || config.filterConfig.customFilters.length > 0) && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium transition-colors',
              showFilters
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            )}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          {/* Tag Filter */}
          {config.filterConfig.tagFilter && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {/* This would be populated with actual tags */}
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm cursor-pointer hover:bg-gray-200">
                  Example Tag
                </span>
              </div>
            </div>
          )}

          {/* Category Filter */}
          {config.filterConfig.categoryFilter && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="">All Categories</option>
                <option value="inspiration">Inspiration</option>
                <option value="instruction">Instructions</option>
                <option value="wishlist">Wishlist</option>
              </select>
            </div>
          )}

          {/* Custom Filters */}
          {config.filterConfig.customFilters.map((filter) => (
            <div key={filter.key}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {filter.label}
              </label>
              {filter.type === 'select' && (
                <select className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">All</option>
                  {filter.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
              {filter.type === 'multiselect' && (
                <div className="space-y-2">
                  {filter.options?.map((option) => (
                    <label key={option.value} className="flex items-center">
                      <input
                        type="checkbox"
                        value={option.value}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Filter Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                // Clear all filters
              }}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear All
            </button>
            <button
              onClick={() => setShowFilters(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
