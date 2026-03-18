import * as React from 'react'
import { ChevronDown, X } from 'lucide-react'
import { Button } from '../_primitives/button'
import { Checkbox } from '../_primitives/checkbox'
import { Popover, PopoverTrigger, PopoverContent } from '../_primitives/popover'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from '../_primitives/command'
import { cn } from '../_lib/utils'

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

const MultiSelect = React.forwardRef<HTMLButtonElement, MultiSelectProps>(
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
      searchable = true,
      label,
      description,
      error,
      required,
      invalid,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false)

    const descriptionId = React.useId()
    const errorId = React.useId()

    const toggleOption = (value: string) => {
      if (selectedValues.includes(value)) {
        onSelectionChange(selectedValues.filter(v => v !== value))
      } else {
        onSelectionChange([...selectedValues, value])
      }
    }

    const clearAll = (e: React.MouseEvent) => {
      e.stopPropagation()
      onSelectionChange([])
    }

    const getDisplayText = () => {
      if (selectedValues.length === 0) return null
      if (selectedValues.length <= maxDisplayed) {
        return selectedValues.map(v => options.find(o => o.value === v)?.label ?? v).join(', ')
      }
      return `${selectedValues.length} selected`
    }

    const displayText = getDisplayText()
    const hasError = invalid || !!error

    return (
      <div className={cn('w-full', className)}>
        {label ? (
          <label className="block text-sm font-medium text-foreground mb-1">
            {label}
            {required ? (
              <span className="text-destructive ml-1" aria-hidden="true">
                *
              </span>
            ) : null}
          </label>
        ) : null}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              ref={ref}
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-haspopup="listbox"
              aria-multiselectable={true}
              aria-invalid={hasError}
              aria-required={required}
              aria-describedby={
                [description ? descriptionId : null, error ? errorId : null]
                  .filter(Boolean)
                  .join(' ') || undefined
              }
              disabled={disabled}
              className={cn(
                'w-full justify-between font-normal',
                selectedValues.length > 0 && 'border-primary',
                hasError && 'border-destructive focus-visible:ring-destructive',
              )}
            >
              <span className="truncate text-sm">
                {displayText ?? <span className="text-muted-foreground">{placeholder}</span>}
              </span>
              <div className="flex items-center gap-1 ml-2 shrink-0">
                {selectedValues.length > 0 && showClearButton ? (
                  <X
                    className="h-3.5 w-3.5 opacity-50 hover:opacity-100 transition-opacity"
                    onClick={clearAll}
                  />
                ) : null}
                <ChevronDown
                  className={cn(
                    'h-4 w-4 opacity-50 transition-transform duration-200',
                    open && 'rotate-180',
                  )}
                />
              </div>
            </Button>
          </PopoverTrigger>

          <PopoverContent
            className="p-0"
            style={{ width: 'var(--radix-popover-trigger-width)' }}
            align="start"
          >
            <Command>
              {searchable ? <CommandInput placeholder="Search..." /> : null}
              <CommandList>
                <CommandEmpty>No options found.</CommandEmpty>
                {options.map(option => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    onSelect={() => toggleOption(option.value)}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      checked={selectedValues.includes(option.value)}
                      className="pointer-events-none"
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {description && !error ? (
          <p id={descriptionId} className="mt-1 text-xs text-muted-foreground">
            {description}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} className="mt-1 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    )
  },
)

MultiSelect.displayName = 'MultiSelect'

export { MultiSelect }
export default MultiSelect
