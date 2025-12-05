import { useState, useCallback, useEffect, useRef } from 'react'
import { cn } from '@repo/app-component-library'

/**
 * Custom hook for debouncing a value
 */
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Props for the GallerySearch component
 */
export interface GallerySearchProps {
  /** Controlled value */
  value?: string
  /** Default value for uncontrolled usage */
  defaultValue?: string
  /** Called immediately on input change */
  onChange?: (value: string) => void
  /** Called after debounce delay */
  onSearch?: (value: string) => void
  /** Placeholder text */
  placeholder?: string
  /** Debounce delay in milliseconds */
  debounceMs?: number
  /** Additional CSS classes */
  className?: string
  /** Whether the input is disabled */
  disabled?: boolean
  /** Accessible label for the search input */
  'aria-label'?: string
  /** Help text for accessibility */
  helpText?: string
  /** Test ID for testing purposes */
  'data-testid'?: string
}

/**
 * A search input component with debouncing for gallery filtering.
 *
 * @example
 * ```tsx
 * // Controlled usage
 * const [search, setSearch] = useState('')
 * <GallerySearch
 *   value={search}
 *   onChange={setSearch}
 *   onSearch={handleDebouncedSearch}
 *   placeholder="Search instructions..."
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Uncontrolled usage
 * <GallerySearch
 *   onSearch={handleSearch}
 *   placeholder="Search..."
 * />
 * ```
 */
export const GallerySearch = ({
  value,
  defaultValue = '',
  onChange,
  onSearch,
  placeholder = 'Search...',
  debounceMs = 300,
  className,
  disabled = false,
  'aria-label': ariaLabel = 'Search gallery',
  helpText,
  'data-testid': testId = 'gallery-search',
}: GallerySearchProps) => {
  // Internal state for uncontrolled usage
  const [internalValue, setInternalValue] = useState(defaultValue)
  const inputRef = useRef<HTMLInputElement>(null)

  // Determine if controlled
  const isControlled = value !== undefined
  const currentValue = isControlled ? value : internalValue

  // Debounce the current value
  const debouncedValue = useDebounce(currentValue, debounceMs)

  // Track previous debounced value to avoid duplicate calls
  const prevDebouncedRef = useRef(debouncedValue)

  // Generate unique IDs for accessibility
  const inputId = `${testId}-input`
  const helpTextId = helpText ? `${testId}-help` : undefined

  // Call onSearch when debounced value changes
  useEffect(() => {
    if (debouncedValue !== prevDebouncedRef.current) {
      prevDebouncedRef.current = debouncedValue
      onSearch?.(debouncedValue)
    }
  }, [debouncedValue, onSearch])

  // Handle input change
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value

      if (!isControlled) {
        setInternalValue(newValue)
      }

      onChange?.(newValue)
    },
    [isControlled, onChange],
  )

  // Handle clear button click
  const handleClear = useCallback(() => {
    if (!isControlled) {
      setInternalValue('')
    }

    onChange?.('')
    onSearch?.('')

    // Focus input after clearing
    inputRef.current?.focus()
  }, [isControlled, onChange, onSearch])

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape' && currentValue) {
        event.preventDefault()
        handleClear()
      }
    },
    [currentValue, handleClear],
  )

  const showClearButton = currentValue.length > 0 && !disabled

  return (
    <div className={cn('relative', className)} data-testid={testId}>
      {/* Search icon */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"
        aria-hidden="true"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>

      {/* Search input */}
      <input
        ref={inputRef}
        id={inputId}
        type="search"
        role="searchbox"
        value={currentValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={helpTextId}
        data-testid={`${testId}-input`}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background py-2 text-sm',
          'ring-offset-background',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          // Padding for icons
          'pl-9',
          showClearButton ? 'pr-9' : 'pr-3',
        )}
      />

      {/* Clear button */}
      {showClearButton ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          data-testid={`${testId}-clear`}
          className={cn(
            'absolute inset-y-0 right-0 flex items-center pr-3',
            'text-muted-foreground hover:text-foreground',
            'focus-visible:outline-none focus-visible:text-foreground',
            'transition-colors',
          )}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      ) : null}

      {/* Help text for screen readers */}
      {helpText ? (
        <p id={helpTextId} className="sr-only">
          {helpText}
        </p>
      ) : null}
    </div>
  )
}
