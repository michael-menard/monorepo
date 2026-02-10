/**
 * FilterPanel Component
 *
 * Advanced filtering UI for wishlist gallery with:
 * - Multi-select store filter (checkboxes)
 * - Priority range slider (0-5)
 * - Price range inputs (min/max)
 * - Apply/Clear actions
 *
 * Story WISH-20172: Frontend Filter Panel UI
 * AC7: All filter controls render
 * AC8: Uses design system primitives
 * AC19: Keyboard navigable
 * AC20: Screen reader accessible
 */

import { useState, useCallback, useId } from 'react'
import { Filter, X } from 'lucide-react'
import {
  Button,
  Checkbox,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@repo/app-component-library'
import { logger } from '@repo/logger'
import type { FilterPanelState, FilterPanelProps, PriorityRange, PriceRange } from './__types__'
import type { WishlistStore } from '@repo/api-client/schemas/wishlist'

export type { FilterPanelProps }

/**
 * Available store options for multi-select filter
 */
const STORE_OPTIONS: WishlistStore[] = ['LEGO', 'BrickLink', 'Barweer', 'Cata', 'Other']

/**
 * FilterPanel component for advanced wishlist filtering
 *
 * Provides UI for:
 * - Store multi-select (checkboxes)
 * - Priority range (dual inputs 0-5)
 * - Price range (min/max number inputs)
 *
 * @example
 * ```tsx
 * <FilterPanel
 *   onApplyFilters={(state) => console.log('Apply:', state)}
 *   onClearFilters={() => console.log('Clear')}
 *   initialState={{ stores: ['LEGO'], priorityRange: null, priceRange: null }}
 * />
 * ```
 */
export function FilterPanel({
  onApplyFilters,
  onClearFilters,
  initialState = { stores: [], priorityRange: null, priceRange: null },
  className,
}: FilterPanelProps) {
  // Local state for filter values (controlled)
  const [stores, setStores] = useState<WishlistStore[]>(initialState.stores)
  const [priorityRange, setPriorityRange] = useState<PriorityRange | null>(
    initialState.priorityRange,
  )
  const [priceRange, setPriceRange] = useState<PriceRange | null>(initialState.priceRange)

  // Popover open state
  const [isOpen, setIsOpen] = useState(false)

  // Generate unique IDs for form controls (accessibility)
  const storeGroupId = useId()
  const priorityMinId = useId()
  const priorityMaxId = useId()
  const priceMinId = useId()
  const priceMaxId = useId()

  // Note: If parent needs to reset state, they can change the component key prop
  // Local state initialized from initialState, not continuously synced

  // Handle store checkbox toggle
  const handleStoreToggle = useCallback((store: WishlistStore) => {
    setStores(prev =>
      prev.includes(store) ? prev.filter(s => s !== store) : [...prev, store],
    )
  }, [])

  // Handle priority range change
  const handlePriorityMinChange = useCallback((value: string) => {
    if (value === '') {
      // Keep max if it exists, otherwise null
      setPriorityRange(prev => (prev?.max !== undefined && prev.max !== null) ? { min: 0, max: prev.max } : null)
      return
    }

    const numValue = parseInt(value, 10)
    if (Number.isNaN(numValue) || numValue < 0 || numValue > 5) return

    setPriorityRange(prev => ({
      min: numValue,
      max: prev?.max ?? numValue, // If no max yet, use min value as default max
    }))
  }, [])

  const handlePriorityMaxChange = useCallback((value: string) => {
    if (value === '') {
      // Keep min if it exists, otherwise null
      setPriorityRange(prev => (prev?.min !== undefined && prev.min !== null) ? { min: prev.min, max: 5 } : null)
      return
    }

    const numValue = parseInt(value, 10)
    if (Number.isNaN(numValue) || numValue < 0 || numValue > 5) return

    setPriorityRange(prev => ({
      min: prev?.min ?? 0, // If no min yet, use 0 as default min
      max: numValue,
    }))
  }, [])

  // Handle price range change
  const handlePriceMinChange = useCallback((value: string) => {
    if (value === '') {
      // Keep max if it exists, otherwise null
      setPriceRange(prev => (prev?.max !== undefined && prev.max !== null) ? { min: 0, max: prev.max } : null)
      return
    }

    const numValue = parseFloat(value)
    if (Number.isNaN(numValue) || numValue < 0) return

    setPriceRange(prev => ({
      min: numValue,
      max: prev?.max ?? numValue * 2, // If no max yet, use 2x min as reasonable default
    }))
  }, [])

  const handlePriceMaxChange = useCallback((value: string) => {
    if (value === '') {
      // Keep min if it exists, otherwise null
      setPriceRange(prev => (prev?.min !== undefined && prev.min !== null) ? { min: prev.min, max: 1000 } : null)
      return
    }

    const numValue = parseFloat(value)
    if (Number.isNaN(numValue) || numValue < 0) return

    setPriceRange(prev => ({
      min: prev?.min ?? 0, // If no min yet, use 0 as default min
      max: numValue,
    }))
  }, [])

  // Apply filters
  const handleApply = useCallback(() => {
    const state: FilterPanelState = {
      stores,
      priorityRange,
      priceRange,
    }

    logger.info('FilterPanel: Applying filters', { state })
    onApplyFilters(state)
    setIsOpen(false)
  }, [stores, priorityRange, priceRange, onApplyFilters])

  // Clear all filters
  const handleClear = useCallback(() => {
    setStores([])
    setPriorityRange(null)
    setPriceRange(null)
    logger.info('FilterPanel: Clearing all filters')
    onClearFilters()
    setIsOpen(false)
  }, [onClearFilters])

  // Keyboard handling for popover
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleApply()
      } else if (e.key === 'Escape') {
        setIsOpen(false)
      }
    },
    [handleApply],
  )

  return (
    <div className={className}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            aria-label="Open filter panel"
            data-testid="filter-panel-trigger"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-80 p-4 space-y-4"
          align="start"
          onKeyDown={handleKeyDown}
          data-testid="filter-panel-content"
          aria-label="Filter panel"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="font-semibold text-sm">Filters</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              aria-label="Close filter panel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Store Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium" id={storeGroupId}>
              Store
            </Label>
            <div
              role="group"
              aria-labelledby={storeGroupId}
              className="space-y-2"
              data-testid="store-filter-group"
            >
              {STORE_OPTIONS.map(store => (
                <div key={store} className="flex items-center space-x-2">
                  <Checkbox
                    id={`store-${store}`}
                    checked={stores.includes(store)}
                    onCheckedChange={() => handleStoreToggle(store)}
                    aria-label={`Filter by ${store} store`}
                    data-testid={`store-checkbox-${store}`}
                  />
                  <Label
                    htmlFor={`store-${store}`}
                    className="text-sm cursor-pointer"
                  >
                    {store}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Priority Range */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Priority Range (0-5)</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label htmlFor={priorityMinId} className="sr-only">
                  Minimum priority
                </Label>
                <Input
                  id={priorityMinId}
                  type="number"
                  min="0"
                  max="5"
                  step="1"
                  placeholder="Min"
                  value={priorityRange?.min ?? ''}
                  onChange={e => handlePriorityMinChange(e.target.value)}
                  aria-label="Minimum priority"
                  data-testid="priority-min-input"
                />
              </div>
              <span className="text-muted-foreground">to</span>
              <div className="flex-1">
                <Label htmlFor={priorityMaxId} className="sr-only">
                  Maximum priority
                </Label>
                <Input
                  id={priorityMaxId}
                  type="number"
                  min="0"
                  max="5"
                  step="1"
                  placeholder="Max"
                  value={priorityRange?.max ?? ''}
                  onChange={e => handlePriorityMaxChange(e.target.value)}
                  aria-label="Maximum priority"
                  data-testid="priority-max-input"
                />
              </div>
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Price Range ($)</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label htmlFor={priceMinId} className="sr-only">
                  Minimum price
                </Label>
                <Input
                  id={priceMinId}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Min"
                  value={priceRange?.min ?? ''}
                  onChange={e => handlePriceMinChange(e.target.value)}
                  aria-label="Minimum price in dollars"
                  data-testid="price-min-input"
                />
              </div>
              <span className="text-muted-foreground">to</span>
              <div className="flex-1">
                <Label htmlFor={priceMaxId} className="sr-only">
                  Maximum price
                </Label>
                <Input
                  id={priceMaxId}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Max"
                  value={priceRange?.max ?? ''}
                  onChange={e => handlePriceMaxChange(e.target.value)}
                  aria-label="Maximum price in dollars"
                  data-testid="price-max-input"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button
              onClick={handleApply}
              size="sm"
              className="flex-1"
              data-testid="apply-filters-button"
            >
              Apply Filters
            </Button>
            <Button
              onClick={handleClear}
              variant="secondary"
              size="sm"
              className="flex-1"
              data-testid="clear-filters-button"
            >
              Clear All
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
