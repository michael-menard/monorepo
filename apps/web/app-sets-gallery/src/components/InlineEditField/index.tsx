/**
 * InlineEditField
 *
 * Admin-only click-to-edit field with blur-to-save, optimistic retry,
 * and react-hot-toast on final failure.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Pencil, Check } from 'lucide-react'
import { cn } from '@repo/app-component-library'

type FieldVariant = 'text' | 'number' | 'date' | 'select'

const SelectOptionSchema = { label: '', value: '' }
type SelectOption = typeof SelectOptionSchema

function InlineEditField({
  label,
  value,
  displayValue,
  variant = 'text',
  isAdmin = false,
  options,
  onSave,
  placeholder,
  min,
  max,
  step,
}: {
  label: string
  value: string | number | null | undefined
  displayValue?: string
  variant?: FieldVariant
  isAdmin?: boolean
  options?: SelectOption[]
  onSave: (value: string | number | null) => Promise<void>
  placeholder?: string
  min?: number
  max?: number
  step?: number
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [localValue, setLocalValue] = useState(value)
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null)

  // Sync with external value changes
  useEffect(() => {
    if (!editing) setLocalValue(value)
  }, [value, editing])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select()
      }
    }
  }, [editing])

  useEffect(() => {
    if (saved) {
      const t = setTimeout(() => setSaved(false), 1500)
      return () => clearTimeout(t)
    }
  }, [saved])

  const handleSave = useCallback(
    async (rawValue: string) => {
      let parsed: string | number | null

      if (rawValue === '' || rawValue === undefined) {
        parsed = null
      } else if (variant === 'number') {
        const num = parseFloat(rawValue)
        parsed = Number.isNaN(num) ? null : num
      } else {
        parsed = rawValue
      }

      // Skip save if value hasn't changed
      if (parsed === value || (parsed === null && (value === null || value === undefined))) {
        setEditing(false)
        return
      }

      setSaving(true)
      setEditing(false)

      // Optimistic: keep new value in display
      setLocalValue(parsed)

      try {
        await onSave(parsed)
        setSaved(true)
      } catch {
        // Silent retry once
        try {
          await onSave(parsed)
          setSaved(true)
        } catch {
          // Revert on final failure — toast is handled by caller
          setLocalValue(value)
        }
      } finally {
        setSaving(false)
      }
    },
    [value, variant, onSave],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        ;(e.target as HTMLInputElement).blur()
      }
      if (e.key === 'Escape') {
        setLocalValue(value)
        setEditing(false)
      }
    },
    [value],
  )

  const displayed = displayValue ?? formatForDisplay(localValue, variant)
  const isPlaceholder = displayed === '\u2014' || !displayed

  if (editing) {
    const inputClasses =
      'h-7 rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

    if (variant === 'select' && options) {
      return (
        <div className="flex items-center justify-between text-sm py-1.5">
          <span className="text-muted-foreground">{label}</span>
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            className={cn(inputClasses, 'w-36')}
            defaultValue={String(localValue ?? '')}
            onBlur={e => handleSave(e.target.value)}
            onKeyDown={handleKeyDown}
          >
            <option value="">--</option>
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )
    }

    if (variant === 'date') {
      // Convert ISO string to YYYY-MM-DD for date input
      const dateStr = localValue ? new Date(String(localValue)).toISOString().split('T')[0] : ''

      return (
        <div className="flex items-center justify-between text-sm py-1.5">
          <span className="text-muted-foreground">{label}</span>
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="date"
            className={cn(inputClasses, 'w-36')}
            defaultValue={dateStr}
            onBlur={e => {
              const val = e.target.value
              // Convert back to ISO datetime string
              handleSave(val ? new Date(val).toISOString() : '')
            }}
            onKeyDown={handleKeyDown}
          />
        </div>
      )
    }

    return (
      <div className="flex items-center justify-between text-sm py-1.5">
        <span className="text-muted-foreground">{label}</span>
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={variant === 'number' ? 'number' : 'text'}
          className={cn(inputClasses, variant === 'number' ? 'w-24' : 'w-36')}
          defaultValue={localValue != null ? String(localValue) : ''}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          onBlur={e => handleSave(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
    )
  }

  // Read mode
  return (
    <div
      className={cn(
        'flex items-center justify-between text-sm py-1.5 group',
        isAdmin && 'cursor-pointer hover:bg-muted/50 rounded -mx-2 px-2 transition-colors',
      )}
      onClick={isAdmin ? () => setEditing(true) : undefined}
      role={isAdmin ? 'button' : undefined}
      tabIndex={isAdmin ? 0 : undefined}
      onKeyDown={isAdmin ? e => e.key === 'Enter' && setEditing(true) : undefined}
      aria-label={isAdmin ? `Edit ${label}` : undefined}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5">
        <span
          className={cn(
            'font-medium',
            isPlaceholder && 'text-muted-foreground/50',
            saving && 'opacity-50',
          )}
        >
          {displayed || '\u2014'}
        </span>
        {saved && <Check className="h-3 w-3 text-green-500" />}
        {isAdmin && !saved && (
          <Pencil className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </span>
    </div>
  )
}

function formatForDisplay(
  value: string | number | null | undefined,
  variant: FieldVariant,
): string {
  if (value === null || value === undefined || value === '') return '\u2014'
  if (variant === 'number') {
    const num = typeof value === 'string' ? parseFloat(value) : value
    return Number.isNaN(num) ? '\u2014' : num.toLocaleString()
  }
  if (variant === 'date') {
    const date = new Date(String(value))
    return Number.isNaN(date.getTime()) ? '\u2014' : date.toLocaleDateString()
  }
  return String(value)
}

export { InlineEditField }
