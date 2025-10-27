import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { X, Plus, Tag } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button } from '@repo/ui'
import { categoryFilterSchema } from '../../schemas'
import type { CategoryFilterProps } from '../../types'

// Predefined LEGO categories
const LEGO_CATEGORIES = [
  'Speed Champions',
  'Modular',
  'Star Wars',
  'Creator Expert',
  'Technic',
  'Architecture',
  'Ideas',
  'Harry Potter',
  'Marvel',
  'DC',
  'Friends',
  'City',
  'Ninjago',
  'Minecraft',
  'Disney',
  'Super Mario',
  'Avatar',
  'Jurassic World',
  'Batman',
  'Creator 3-in-1',
  'Classic',
  'Duplo',
  'Art',
  'Botanical Collection',
  'Seasonal',
  'Other',
] as const

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  filter,
  onFilterChange,
  categories = [],
  className = '',
}) => {
  const [customCategory, setCustomCategory] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  // Combine predefined categories with custom categories from items
  const allCategories = [...new Set([...LEGO_CATEGORIES, ...categories])].sort()

  const handleCategoryChange = useCallback(
    (category: string) => {
      const newFilter = categoryFilterSchema.parse({
        ...filter,
        category: category === 'all' ? undefined : category,
      })
      onFilterChange(newFilter)
    },
    [filter, onFilterChange],
  )

  const handleCustomCategoryAdd = useCallback(() => {
    if (customCategory.trim()) {
      const newFilter = categoryFilterSchema.parse({
        ...filter,
        category: customCategory.trim(),
      })
      onFilterChange(newFilter)
      setCustomCategory('')
      setShowCustomInput(false)
    }
  }, [customCategory, filter, onFilterChange])

  const handleClearCategory = useCallback(() => {
    const newFilter = categoryFilterSchema.parse({
      ...filter,
      category: undefined,
    })
    onFilterChange(newFilter)
  }, [filter, onFilterChange])

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleCustomCategoryAdd()
      } else if (e.key === 'Escape') {
        setShowCustomInput(false)
        setCustomCategory('')
      }
    },
    [handleCustomCategoryAdd],
  )

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Category Filter</span>
      </div>

      <div className="flex items-center gap-2">
        <Select value={filter.category || 'all'} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-full min-w-[200px]">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {allCategories.map(category => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filter.category && filter.category !== 'all' ? (
          <Button variant="ghost" size="sm" onClick={handleClearCategory} className="h-9 w-9 p-0">
            <X className="h-4 w-4" />
          </Button>
        ) : null}

        {!showCustomInput && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCustomInput(true)}
            className="h-9 px-3"
          >
            <Plus className="h-4 w-4 mr-1" />
            Custom
          </Button>
        )}
      </div>

      {showCustomInput ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={customCategory}
            onChange={e => setCustomCategory(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Enter custom category..."
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            autoFocus
          />
          <Button
            variant="default"
            size="sm"
            onClick={handleCustomCategoryAdd}
            disabled={!customCategory.trim()}
            className="h-9 px-3"
          >
            Add
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowCustomInput(false)
              setCustomCategory('')
            }}
            className="h-9 w-9 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </motion.div>
      ) : null}

      {filter.category ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <span>Filtering by:</span>
          <span className="font-medium text-foreground">{filter.category}</span>
        </motion.div>
      ) : null}
    </div>
  )
}

export default CategoryFilter
