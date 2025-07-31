import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Grid, List } from 'lucide-react';
import { Button } from '@repo/ui';

import type { MockInstruction, MockInstructionFilter, MockInstructionSortBy, SortOrder } from '../../schemas';
import { InstructionsCard } from '../InstructionsCard';

export interface MocInstructionsGalleryProps {
  instructions: MockInstruction[];
  className?: string;
  onInstructionClick?: (instruction: MockInstruction) => void;
  onInstructionLike?: (instructionId: string, liked: boolean) => void;
  onInstructionShare?: (instructionId: string) => void;
  onInstructionDelete?: (instructionId: string) => void;
  onInstructionDownload?: (instructionId: string) => void;
  onInstructionsSelected?: (instructionIds: string[]) => void;
  selectedInstructions?: string[];
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
  loading?: boolean;
  layout?: 'grid' | 'list';
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
  filters?: MockInstructionFilter;
  onFiltersChange?: (filters: MockInstructionFilter) => void;
  sortBy?: MockInstructionSortBy;
  sortOrder?: SortOrder;
  onSortChange?: (sortBy: MockInstructionSortBy, sortOrder: SortOrder) => void;
  isEditable?: boolean;
}

const MocInstructionsGallery: React.FC<MocInstructionsGalleryProps> = ({
  instructions,
  className = '',
  onInstructionClick,
  onInstructionDelete,
  onInstructionsSelected,
  selectedInstructions = [],
  onLoadMore,
  hasMore = false,
  loading = false,
  layout = 'grid',
  columns = { sm: 1, md: 2, lg: 3, xl: 4 },
  gap = 4,
  filters,
  onFiltersChange,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  onSortChange,
  isEditable = false,
}) => {
  const [searchTerm, setSearchTerm] = useState(filters?.search || '');
  const [showFilters, setShowFilters] = useState(false);
  const [internalSelectedInstructions, setInternalSelectedInstructions] = useState<string[]>(
    selectedInstructions || [],
  );

  // Generate CSS classes based on layout and columns
  const getLayoutClasses = useMemo(() => {
    if (layout === 'list') {
      return 'space-y-4';
    }
    
    const { sm, md, lg, xl } = columns;
    return `grid grid-cols-1 ${sm ? `sm:grid-cols-${sm}` : ''} ${md ? `md:grid-cols-${md}` : ''} ${lg ? `lg:grid-cols-${lg}` : ''} ${xl ? `xl:grid-cols-${xl}` : ''} gap-${gap}`;
  }, [layout, columns, gap]);

  // Filter and sort instructions
  const filteredAndSortedInstructions = useMemo(() => {
    let filtered = instructions;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (instruction) =>
          instruction.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          instruction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          instruction.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
          instruction.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply other filters
    if (filters) {
      if (filters.category) {
        filtered = filtered.filter((instruction) => instruction.category === filters.category);
      }
      if (filters.difficulty) {
        filtered = filtered.filter((instruction) => instruction.difficulty === filters.difficulty);
      }
      if (filters.author) {
        filtered = filtered.filter((instruction) => 
          instruction.author.toLowerCase().includes(filters.author!.toLowerCase())
        );
      }
      if (filters.tags && filters.tags.length > 0) {
        filtered = filtered.filter((instruction) =>
          filters.tags!.some((tag) => instruction.tags.includes(tag))
        );
      }
      if (filters.isPublic !== undefined) {
        filtered = filtered.filter((instruction) => instruction.isPublic === filters.isPublic);
      }
      if (filters.isPublished !== undefined) {
        filtered = filtered.filter((instruction) => instruction.isPublished === filters.isPublished);
      }
    }

    // Sort instructions
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'createdAt':
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case 'updatedAt':
          aValue = a.updatedAt;
          bValue = b.updatedAt;
          break;
        case 'rating':
          aValue = a.rating || 0;
          bValue = b.rating || 0;
          break;
        case 'downloadCount':
          aValue = a.downloadCount;
          bValue = b.downloadCount;
          break;
        default:
          aValue = a.createdAt;
          bValue = b.createdAt;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [instructions, searchTerm, filters, sortBy, sortOrder]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    if (onFiltersChange) {
      onFiltersChange({ 
        ...filters, 
        search: value,
        sortBy: filters?.sortBy || 'createdAt',
        sortOrder: filters?.sortOrder || 'desc'
      });
    }
  }, [filters, onFiltersChange]);



  const handleClearSelection = useCallback(() => {
    setInternalSelectedInstructions([]);
    onInstructionsSelected?.([]);
  }, [onInstructionsSelected]);

  const handleSortChange = useCallback((newSortBy: MockInstructionSortBy) => {
    const newSortOrder = sortBy === newSortBy && sortOrder === 'asc' ? 'desc' : 'asc';
    onSortChange?.(newSortBy, newSortOrder);
  }, [sortBy, sortOrder, onSortChange]);

  if (!instructions || instructions.length === 0) {
    return (
      <div className={`flex items-center justify-center min-h-[200px] ${className}`}>
        <div className="text-center">
          <div className="text-6xl mb-4">🧱</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No instructions yet</h3>
          <p className="text-gray-600">Create your first MOC instruction to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search instructions..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>

          <div className="flex items-center border border-gray-300 rounded-lg">
            <Button
              variant={layout === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {/* TODO: Implement layout toggle */}}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={layout === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {/* TODO: Implement layout toggle */}}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gray-50 rounded-lg p-4 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={filters?.category || ''}
                  onChange={(e) => onFiltersChange?.({ 
                    ...filters, 
                    category: e.target.value || undefined,
                    sortBy: filters?.sortBy || 'createdAt',
                    sortOrder: filters?.sortOrder || 'desc'
                  })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">All Categories</option>
                  <option value="vehicles">Vehicles</option>
                  <option value="buildings">Buildings</option>
                  <option value="characters">Characters</option>
                  <option value="scenes">Scenes</option>
                  <option value="machines">Machines</option>
                  <option value="art">Art</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                <select
                  value={filters?.difficulty || ''}
                  onChange={(e) => onFiltersChange?.({ 
                    ...filters, 
                    difficulty: e.target.value as any || undefined,
                    sortBy: filters?.sortBy || 'createdAt',
                    sortOrder: filters?.sortOrder || 'desc'
                  })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">All Difficulties</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as MockInstructionSortBy)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="createdAt">Date Created</option>
                  <option value="updatedAt">Date Updated</option>
                  <option value="title">Title</option>
                  <option value="rating">Rating</option>
                  <option value="downloadCount">Downloads</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {filteredAndSortedInstructions.length} instruction{filteredAndSortedInstructions.length !== 1 ? 's' : ''} found
        </p>
        
        {internalSelectedInstructions.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {internalSelectedInstructions.length} selected
            </span>
            <Button variant="outline" size="sm" onClick={handleClearSelection}>
              Clear Selection
            </Button>
          </div>
        )}
      </div>

      {/* Instructions Grid */}
      <div className={getLayoutClasses}>
        <AnimatePresence>
          {filteredAndSortedInstructions.map((instruction, index) => (
            <motion.div
              key={instruction.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
            >
                             <InstructionsCard
                 instruction={instruction}
                 onView={() => onInstructionClick?.(instruction)}
                 onEdit={isEditable ? () => {/* TODO: Implement edit */} : undefined}
                 onDelete={isEditable ? () => onInstructionDelete?.(instruction.id) : undefined}
                 isEditable={isEditable}
                 className="h-full"
               />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center pt-6">
          <Button
            onClick={onLoadMore}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default MocInstructionsGallery; 