import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Filter, Tag, ChevronDown } from 'lucide-react'
import type { FilterBarProps, FilterState } from '../../schemas'

const FilterBar: React.FC<FilterBarProps> = ({
  onSearchChange,
  onTagsChange,
  onCategoryChange,
  onClearFilters,
  availableTags = [],
  availableCategories = [],
  searchPlaceholder = 'Search images...',
  className = '',
  debounceMs = 300,
}) => {
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    selectedTags: [],
    selectedCategory: '',
  })
  const [isExpanded, setIsExpanded] = useState(false)
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const isInitialRender = useRef(true)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(filters.searchQuery)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [filters.searchQuery, debounceMs])

  // Call search callback when debounced query changes
  useEffect(() => {
    // Skip the initial render to avoid calling onSearchChange with empty string
    if (isInitialRender.current) {
      isInitialRender.current = false
      return
    }

    onSearchChange(debouncedSearchQuery)
  }, [debouncedSearchQuery, onSearchChange])

  const handleSearchChange = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, searchQuery: value }))
  }, [])

  const handleTagToggle = useCallback(
    (tag: string) => {
      setFilters(prev => {
        const newTags = prev.selectedTags.includes(tag)
          ? prev.selectedTags.filter(t => t !== tag)
          : [...prev.selectedTags, tag]

        onTagsChange(newTags)
        return { ...prev, selectedTags: newTags }
      })
    },
    [onTagsChange],
  )

  const handleCategoryChange = useCallback(
    (category: string) => {
      setFilters(prev => ({ ...prev, selectedCategory: category }))
      onCategoryChange(category)
    },
    [onCategoryChange],
  )

  const handleClearFilters = useCallback(() => {
    setFilters({
      searchQuery: '',
      selectedTags: [],
      selectedCategory: '',
    })
    onClearFilters()
  }, [onClearFilters])

  const hasActiveFilters =
    filters.searchQuery || filters.selectedTags.length > 0 || filters.selectedCategory

  return (
    <div
      data-testid="filter-bar"
      className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}
    >
      {/* Main Search Bar */}
      <div className="flex items-center p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {filters.searchQuery ? (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {/* Filter Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`ml-3 p-2 rounded-md transition-colors ${
            hasActiveFilters
              ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          aria-label="Toggle filters"
        >
          <Filter className="h-4 w-4" />
        </button>

        {/* Clear Filters Button */}
        {hasActiveFilters ? (
          <button
            onClick={handleClearFilters}
            className="ml-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Clear
          </button>
        ) : null}
      </div>

      {/* Expanded Filters */}
      <AnimatePresence>
        {isExpanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-200 overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Tags Filter */}
              {availableTags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Tag className="h-4 w-4 mr-1" />
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => handleTagToggle(tag)}
                        className={`px-3 py-1 text-sm rounded-full transition-colors ${
                          filters.selectedTags.includes(tag)
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category Filter */}
              {availableCategories.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Category</h3>
                  <div className="relative">
                    <select
                      value={filters.selectedCategory}
                      onChange={e => handleCategoryChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                    >
                      <option value="">All Categories</option>
                      {availableCategories.map(category => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Active Filters Summary */}
              {hasActiveFilters ? (
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    {filters.searchQuery ? (
                      <span className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                        Search: "{filters.searchQuery}"
                        <button
                          onClick={() => handleSearchChange('')}
                          className="ml-1 text-blue-500 hover:text-blue-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ) : null}
                    {filters.selectedTags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full"
                      >
                        {tag}
                        <button
                          onClick={() => handleTagToggle(tag)}
                          className="ml-1 text-green-500 hover:text-green-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    {filters.selectedCategory ? (
                      <span className="inline-flex items-center px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                        {filters.selectedCategory}
                        <button
                          onClick={() => handleCategoryChange('')}
                          className="ml-1 text-purple-500 hover:text-purple-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default FilterBar
