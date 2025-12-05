import * as React from 'react'
import { ChevronDown, X } from 'lucide-react'
import { Badge } from '../_primitives/badge'
import { Button } from '../_primitives/button'
import { Checkbox } from '../_primitives/checkbox'
import { cn } from '../_lib/utils'
import {
  getAriaAttributes,
  useUniqueId,
  useFocusTrap,
  KEYBOARD_KEYS,
} from '../_lib/keyboard-navigation'

export interface MultiSelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface MultiSelectProps {
  options: MultiSelectOption[]
  selectedValues: string[]
  onSelectionChange: (values: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  maxDisplayed?: number
  showClearButton?: boolean
  searchable?: boolean
  label?: string
  description?: string
  error?: string
  required?: boolean
  invalid?: boolean
}

const MultiSelect = React.forwardRef<HTMLDivElement, MultiSelectProps>(
  (
    {
      options,
      selectedValues,
      onSelectionChange,
      placeholder = 'Select options...',
      disabled = false,
      className,
      maxDisplayed = 3,
      showClearButton = true,
      searchable = false,
      label,
      description,
      error,
      required = false,
      invalid = false,
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = React.useState(false)
    const [searchTerm, setSearchTerm] = React.useState('')
    const [focusedIndex, setFocusedIndex] = React.useState(-1)
    const containerRef = React.useRef<HTMLDivElement>(null)
    const searchInputRef = React.useRef<HTMLInputElement>(null)
    const optionsListRef = React.useRef<HTMLDivElement>(null)

    const uniqueId = useUniqueId('multiselect')
    const triggerId = `${uniqueId}-trigger`
    const dropdownId = `${uniqueId}-dropdown`
    const errorId = `${uniqueId}-error`
    const descriptionId = `${uniqueId}-description`

    const { containerRef: focusTrapRef } = useFocusTrap(isOpen)

    // Filter options based on search term
    const filteredOptions = React.useMemo(() => {
      if (!searchable || !searchTerm) return options
      return options.filter(option => option.label.toLowerCase().includes(searchTerm.toLowerCase()))
    }, [options, searchTerm, searchable])

    // Handle option selection/deselection
    const handleOptionToggle = (value: string) => {
      const newSelection = selectedValues.includes(value)
        ? selectedValues.filter(v => v !== value)
        : [...selectedValues, value]
      onSelectionChange(newSelection)
    }

    // Handle select all/none
    const handleSelectAll = () => {
      const selectableOptions = filteredOptions.filter(option => !option.disabled)
      const allSelected = selectableOptions.every(option => selectedValues.includes(option.value))

      if (allSelected) {
        // Deselect all filtered options
        const newSelection = selectedValues.filter(
          value => !selectableOptions.some(option => option.value === value),
        )
        onSelectionChange(newSelection)
      } else {
        // Select all filtered options
        const newSelection = [
          ...new Set([...selectedValues, ...selectableOptions.map(option => option.value)]),
        ]
        onSelectionChange(newSelection)
      }
    }

    // Handle clear all
    const handleClearAll = () => {
      onSelectionChange([])
    }

    // Handle keyboard navigation
    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (!isOpen) {
        if (event.key === KEYBOARD_KEYS.ENTER || event.key === KEYBOARD_KEYS.SPACE) {
          event.preventDefault()
          setIsOpen(true)
          setFocusedIndex(-1)
        }
        return
      }

      switch (event.key) {
        case KEYBOARD_KEYS.ESCAPE:
          event.preventDefault()
          setIsOpen(false)
          setSearchTerm('')
          setFocusedIndex(-1)
          break
        case KEYBOARD_KEYS.ARROW_DOWN:
          event.preventDefault()
          setFocusedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0))
          break
        case KEYBOARD_KEYS.ARROW_UP:
          event.preventDefault()
          setFocusedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1))
          break
        case KEYBOARD_KEYS.HOME:
          event.preventDefault()
          setFocusedIndex(0)
          break
        case KEYBOARD_KEYS.END:
          event.preventDefault()
          setFocusedIndex(filteredOptions.length - 1)
          break
        case KEYBOARD_KEYS.ENTER:
          event.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
            const option = filteredOptions[focusedIndex]
            if (!option.disabled) {
              handleOptionToggle(option.value)
            }
          }
          break
        case KEYBOARD_KEYS.SPACE:
          event.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
            const option = filteredOptions[focusedIndex]
            if (!option.disabled) {
              handleOptionToggle(option.value)
            }
          }
          break
      }
    }

    // Close dropdown when clicking outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false)
          setSearchTerm('')
          setFocusedIndex(-1)
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Focus search input when dropdown opens
    React.useEffect(() => {
      if (isOpen && searchable && searchInputRef.current) {
        searchInputRef.current.focus()
      }
    }, [isOpen, searchable])

    // Get display text for trigger
    const getDisplayText = () => {
      if (selectedValues.length === 0) return placeholder

      const selectedOptions = options.filter(option => selectedValues.includes(option.value))
      const displayedOptions = selectedOptions.slice(0, maxDisplayed)

      if (selectedValues.length <= maxDisplayed) {
        return displayedOptions.map(option => option.label).join(', ')
      }

      return `${displayedOptions.map(option => option.label).join(', ')} +${selectedValues.length - maxDisplayed} more`
    }

    // Check if all filtered options are selected
    const selectableOptions = filteredOptions.filter(option => !option.disabled)
    const allFilteredSelected =
      selectableOptions.length > 0 &&
      selectableOptions.every(option => selectedValues.includes(option.value))

    const ariaAttributes = getAriaAttributes({
      expanded: isOpen,
      disabled,
      invalid: invalid || !!error,
      required,
      hasPopup: true,
      popup: 'listbox',
      multiselectable: true,
      describedBy: [descriptionId, errorId].filter(Boolean).join(' ') || undefined,
    })

    return (
      <div ref={containerRef} className={cn('relative', className)}>
        {label ? (
          <label htmlFor={triggerId} className="block text-sm font-medium text-foreground mb-1">
            {label}
            {required ? (
              <span className="text-destructive ml-1" aria-hidden="true">
                *
              </span>
            ) : null}
          </label>
        ) : null}

        {/* Trigger Button */}
        <Button
          ref={ref}
          id={triggerId}
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-multiselectable={true}
          aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
          aria-invalid={invalid || !!error}
          aria-required={required}
          className={cn(
            'w-full justify-between',
            selectedValues.length > 0 && 'border-primary',
            (error || invalid) && 'border-destructive focus-visible:ring-destructive',
          )}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          {...ariaAttributes}
        >
          <span className="truncate">{getDisplayText()}</span>
          <ChevronDown className={cn('ml-2 h-4 w-4 shrink-0 opacity-50', isOpen && 'rotate-180')} />
        </Button>

        {/* Dropdown */}
        {isOpen ? (
          <div
            ref={node => {
              focusTrapRef.current = node
              optionsListRef.current = node
            }}
            id={dropdownId}
            role="listbox"
            aria-multiselectable={true}
            className="absolute z-50 w-full mt-1 bg-popover border border-gray-200 rounded-md shadow-lg"
          >
            {/* Search Input */}
            {searchable ? (
              <div className="p-2 border-b border-gray-200">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search options..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="Search options"
                />
              </div>
            ) : null}

            {/* Select All/None Button */}
            {filteredOptions.length > 0 && (
              <div className="p-2 border-b border-gray-200">
                <div
                  className="flex items-center w-full px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded-md"
                  onClick={handleSelectAll}
                  role="option"
                  aria-selected={allFilteredSelected}
                >
                  <Checkbox checked={allFilteredSelected} className="mr-2" />
                  {allFilteredSelected ? 'Deselect All' : 'Select All'}
                </div>
              </div>
            )}

            {/* Clear All Button */}
            {showClearButton && selectedValues.length > 0 ? (
              <div className="p-2 border-b border-gray-200">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="w-full justify-start text-sm text-destructive hover:text-destructive"
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear All
                </Button>
              </div>
            ) : null}

            {/* Options List */}
            <div className="max-h-60 overflow-auto">
              {filteredOptions.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  {searchable && searchTerm ? 'No options found' : 'No options available'}
                </div>
              ) : (
                filteredOptions.map((option, index) => (
                  <div
                    key={option.value}
                    className={cn(
                      'flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-accent',
                      option.disabled && 'opacity-50 cursor-not-allowed',
                      focusedIndex === index && 'bg-accent',
                    )}
                    onClick={() => !option.disabled && handleOptionToggle(option.value)}
                    role="option"
                    aria-selected={selectedValues.includes(option.value)}
                    aria-disabled={option.disabled}
                    tabIndex={focusedIndex === index ? 0 : -1}
                  >
                    <Checkbox
                      checked={selectedValues.includes(option.value)}
                      disabled={option.disabled}
                      className="mr-2"
                    />
                    <span className={cn(option.disabled && 'text-muted-foreground')}>
                      {option.label}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        {/* Selected Values Display */}
        {selectedValues.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2" role="list" aria-label="Selected options">
            {selectedValues.slice(0, maxDisplayed).map(value => {
              const option = options.find(opt => opt.value === value)
              return (
                <Badge key={value} variant="secondary" className="text-xs" role="listitem">
                  {option?.label || value}
                  <button
                    onClick={() => handleOptionToggle(value)}
                    className="ml-1 hover:text-destructive"
                    aria-label={`Remove ${option?.label || value}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )
            })}
            {selectedValues.length > maxDisplayed && (
              <Badge variant="secondary" className="text-xs" role="listitem">
                +{selectedValues.length - maxDisplayed} more
              </Badge>
            )}
          </div>
        )}

        {description ? (
          <p id={descriptionId} className="text-sm text-muted-foreground mt-1">
            {description}
          </p>
        ) : null}

        {error ? (
          <p id={errorId} className="text-sm text-destructive mt-1" role="alert" aria-live="polite">
            {error}
          </p>
        ) : null}
      </div>
    )
  },
)

MultiSelect.displayName = 'MultiSelect'

export { MultiSelect }
