import * as React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectProps,
  SelectTrigger,
  SelectValue,
} from './select'
import { SANITIZATION_PROFILES, SanitizationConfig, sanitizeInput } from './lib/sanitization'

export interface AppSelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface AppSelectProps extends Omit<SelectProps, 'onValueChange'> {
  /** Select options */
  options: AppSelectOption[]
  /** Placeholder text */
  placeholder?: string
  /** Custom sanitization configuration for option values and labels */
  sanitizationConfig?: SanitizationConfig
  /** Whether to show warnings when content is sanitized */
  showSanitizationWarnings?: boolean
  /** Callback when sanitization warnings occur */
  onSanitizationWarning?: (warnings: string[]) => void
  /** Original onValueChange handler that receives sanitized value */
  onValueChange?: (value: string) => void
}

/**
 * Secure Select component that automatically sanitizes option values and labels
 *
 * Features:
 * - Automatic sanitization of option values and labels
 * - Configurable sanitization profiles
 * - Optional sanitization warnings
 * - SSR-safe implementation
 * - Maintains all original Select component functionality
 *
 * @example
 * ```tsx
 * // Basic usage
 * <AppSelect
 *   options={[
 *     { value: 'option1', label: 'Option 1' },
 *     { value: 'option2', label: 'Option 2' }
 *   ]}
 *   placeholder="Select an option"
 *   onValueChange={(value) => setSelected(value)}
 * />
 *
 * // With custom sanitization
 * <AppSelect
 *   options={userGeneratedOptions}
 *   sanitizationConfig={SANITIZATION_PROFILES.BASIC_TEXT}
 *   showSanitizationWarnings
 * />
 * ```
 */
export const AppSelect = React.forwardRef<React.ElementRef<typeof SelectTrigger>, AppSelectProps>(
  (
    {
      options,
      placeholder,
      sanitizationConfig = SANITIZATION_PROFILES.STRICT,
      showSanitizationWarnings = false,
      onSanitizationWarning,
      onValueChange,
      ...props
    },
    ref,
  ) => {
    // Sanitize options
    const sanitizedOptions = React.useMemo(() => {
      return options.map(option => {
        const sanitizedValue = sanitizeInput(option.value, sanitizationConfig)
        const sanitizedLabel = sanitizeInput(option.label, sanitizationConfig)

        // Check for warnings
        if (showSanitizationWarnings || onSanitizationWarning) {
          const warnings: string[] = []

          if (sanitizedValue !== option.value) {
            warnings.push(`Option value "${option.value}" was sanitized to "${sanitizedValue}"`)
          }

          if (sanitizedLabel !== option.label) {
            warnings.push(`Option label "${option.label}" was sanitized to "${sanitizedLabel}"`)
          }

          if (warnings.length > 0) {
            if (showSanitizationWarnings) {
            }
            onSanitizationWarning?.(warnings)
          }
        }

        return {
          ...option,
          value: sanitizedValue,
          label: sanitizedLabel,
        }
      })
    }, [options, sanitizationConfig, showSanitizationWarnings, onSanitizationWarning])

    // Handle value change
    const handleValueChange = React.useCallback(
      (value: string) => {
        // Sanitize the selected value as an extra precaution
        const sanitizedValue = sanitizeInput(value, sanitizationConfig)
        onValueChange?.(sanitizedValue)
      },
      [onValueChange, sanitizationConfig],
    )

    // Sanitize placeholder
    const sanitizedPlaceholder = React.useMemo(() => {
      return placeholder ? sanitizeInput(placeholder, sanitizationConfig) : undefined
    }, [placeholder, sanitizationConfig])

    return (
      <Select {...props} onValueChange={handleValueChange}>
        <SelectTrigger ref={ref}>
          <SelectValue placeholder={sanitizedPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {sanitizedOptions.map(option => (
            <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  },
)

AppSelect.displayName = 'AppSelect'
