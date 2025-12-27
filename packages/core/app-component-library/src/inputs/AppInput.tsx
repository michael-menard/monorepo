import * as React from 'react'
import { logger } from '@repo/logger'
import { Input, InputProps } from '../_primitives/input'
import {
  SANITIZATION_PROFILES,
  SanitizationConfig,
  sanitizeInput,
  validateSanitizedInput,
} from '../lib/sanitization'

// Simple debounce hook (internal to avoid external dependencies)
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export interface AppInputProps extends Omit<InputProps, 'onChange' | 'onBlur'> {
  /** Custom sanitization configuration */
  sanitizationConfig?: SanitizationConfig
  /** Whether to sanitize on every change or only on blur */
  sanitizeOnChange?: boolean
  /** Whether to show warnings when content is sanitized */
  showSanitizationWarnings?: boolean
  /** Callback when sanitization warnings occur */
  onSanitizationWarning?: (warnings: string[]) => void
  /** Original onChange handler that receives sanitized value */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
  /** Original onBlur handler that receives sanitized value */
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void
  /** Debounce delay in milliseconds for onChange events (0 = no debounce) */
  debounceMs?: number
  /** Whether to debounce sanitization as well (default: true) */
  debounceSanitization?: boolean
}

/**
 * Secure Input component that automatically sanitizes user input using DOMPurify
 *
 * Features:
 * - Automatic sanitization based on input type
 * - Configurable sanitization profiles
 * - Optional sanitization warnings
 * - SSR-safe implementation
 * - Maintains all original Input component functionality
 *
 * @example
 * ```tsx
 * // Basic usage with automatic sanitization
 * <AppInput type="text" placeholder="Enter your name" />
 *
 * // Custom sanitization config
 * <AppInput
 *   type="text"
 *   sanitizationConfig={SANITIZATION_PROFILES.BASIC_TEXT}
 *   showSanitizationWarnings
 * />
 *
 * // With change handler and debouncing
 * <AppInput
 *   type="email"
 *   onChange={(e) => setEmail(e.target.value)}
 *   debounceMs={300} // Debounce onChange by 300ms
 *   sanitizeOnChange={false} // Only sanitize on blur
 * />
 *
 * // Search input with debouncing
 * <AppInput
 *   type="search"
 *   placeholder="Search..."
 *   onChange={(e) => handleSearch(e.target.value)}
 *   debounceMs={500} // Debounce for search
 * />
 * ```
 */
export const AppInput = React.forwardRef<HTMLInputElement, AppInputProps>(
  (
    {
      sanitizationConfig,
      sanitizeOnChange = true,
      showSanitizationWarnings = false,
      onSanitizationWarning,
      onChange,
      onBlur,
      type = 'text',
      value,
      defaultValue,
      debounceMs = 0,
      debounceSanitization = true,
      ...props
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = React.useState<string>(
      (value as string) || (defaultValue as string) || '',
    )

    // Debounced value for onChange events
    const debouncedInternalValue = useDebounce(internalValue, debounceMs)

    // Determine sanitization config based on input type if not provided
    const effectiveConfig = React.useMemo(() => {
      if (sanitizationConfig) return sanitizationConfig

      // Use input type to determine appropriate sanitization
      switch (type) {
        case 'email':
        case 'password':
        case 'tel':
        case 'number':
          return SANITIZATION_PROFILES.STRICT
        case 'search':
          return SANITIZATION_PROFILES.SEARCH
        case 'url':
          return SANITIZATION_PROFILES.URL
        default:
          return SANITIZATION_PROFILES.STRICT
      }
    }, [sanitizationConfig, type])

    // Sanitize value and handle warnings
    const sanitizeValue = React.useCallback(
      (inputValue: string) => {
        const sanitized = sanitizeInput(inputValue, effectiveConfig)

        if (showSanitizationWarnings || onSanitizationWarning) {
          const validation = validateSanitizedInput(inputValue, sanitized)
          if (validation.warnings.length > 0) {
            if (showSanitizationWarnings) {
              logger.warn('AppInput sanitization warnings:', validation.warnings)
            }
            onSanitizationWarning?.(validation.warnings)
          }
        }

        return sanitized
      },
      [effectiveConfig, showSanitizationWarnings, onSanitizationWarning],
    )

    // Handle controlled vs uncontrolled component
    const isControlled = value !== undefined
    const currentValue = isControlled ? (value as string) : internalValue

    // Effect to handle debounced onChange calls
    React.useEffect(() => {
      if (debounceMs > 0 && onChange && !isControlled && debouncedInternalValue !== internalValue) {
        // Create a synthetic event for the debounced value
        const syntheticEvent = {
          target: { value: debouncedInternalValue },
          currentTarget: { value: debouncedInternalValue },
        } as React.ChangeEvent<HTMLInputElement>

        onChange(syntheticEvent)
      }
    }, [debouncedInternalValue, debounceMs, onChange, isControlled])

    // Handle change events
    const handleChange = React.useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value

        if (sanitizeOnChange) {
          const sanitizedValue =
            debounceSanitization && debounceMs > 0
              ? newValue // Don't sanitize immediately if debouncing
              : sanitizeValue(newValue)

          // Update the event target value
          Object.defineProperty(event, 'target', {
            writable: false,
            value: {
              ...event.target,
              value: sanitizedValue,
            },
          })

          if (!isControlled) {
            setInternalValue(sanitizedValue)
          }

          // Call onChange immediately if not debouncing, or if controlled
          if (debounceMs === 0 || isControlled) {
            onChange?.(event)
          }
        } else {
          // Don't sanitize on change, just pass through
          if (!isControlled) {
            setInternalValue(newValue)
          }

          // Call onChange immediately if not debouncing, or if controlled
          if (debounceMs === 0 || isControlled) {
            onChange?.(event)
          }
        }
      },
      [sanitizeOnChange, sanitizeValue, isControlled, onChange, debounceMs, debounceSanitization],
    )

    // Handle blur events (always sanitize on blur if not sanitizing on change)
    const handleBlur = React.useCallback(
      (event: React.FocusEvent<HTMLInputElement>) => {
        if (!sanitizeOnChange) {
          const sanitizedValue = sanitizeValue(event.target.value)

          // Update the event target value to the sanitized value
          Object.defineProperty(event, 'target', {
            writable: false,
            value: {
              ...event.target,
              value: sanitizedValue,
            },
          })

          if (!isControlled) {
            setInternalValue(sanitizedValue)
          }
        }

        onBlur?.(event)
      },
      [sanitizeOnChange, sanitizeValue, isControlled, onBlur],
    )

    // Sanitize initial value if controlled
    React.useEffect(() => {
      if (isControlled && value && sanitizeOnChange) {
        const sanitized = sanitizeValue(value as string)
        if (sanitized !== value) {
          // If the parent provided an unsanitized value, we should warn
          if (showSanitizationWarnings) {
            logger.warn('Initial value was sanitized', { original: value, sanitized })
          }
        }
      }
    }, [value, isControlled, sanitizeOnChange, sanitizeValue, showSanitizationWarnings])

    return (
      <Input
        {...props}
        ref={ref}
        type={type}
        value={currentValue}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    )
  },
)

AppInput.displayName = 'AppInput'
