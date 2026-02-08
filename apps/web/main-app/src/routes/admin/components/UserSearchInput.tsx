import React, { useState, useEffect, useCallback } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { Input, Button } from '@repo/app-component-library'

interface UserSearchInputProps {
  value: string
  onChange: (value: string) => void
  isLoading?: boolean
  placeholder?: string
}

/**
 * User Search Input
 *
 * Debounced search input for email prefix search.
 * Uses 300ms debounce to avoid excessive API calls.
 */
export function UserSearchInput({
  value,
  onChange,
  isLoading = false,
  placeholder = 'Search by email...',
}: UserSearchInputProps) {
  const [localValue, setLocalValue] = useState(value)

  // Sync local value with external value
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Debounced onChange
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [localValue, value, onChange])

  const handleClear = useCallback(() => {
    setLocalValue('')
    onChange('')
  }, [onChange])

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        {isLoading ? (
          <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
        ) : (
          <Search className="text-muted-foreground h-4 w-4" />
        )}
      </div>
      <Input
        type="text"
        value={localValue}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9"
      />
      {localValue ? (
        <div className="absolute inset-y-0 right-0 flex items-center pr-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 w-7 p-0"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  )
}
