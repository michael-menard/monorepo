import * as React from 'react'
import {SelectProps} from './select'
import {SanitizationConfig} from './lib/sanitization'

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
export declare const AppSelect: React.ForwardRefExoticComponent<
  Omit<AppSelectProps, 'ref'> & React.RefAttributes<HTMLButtonElement>
>
//# sourceMappingURL=AppSelect.d.ts.map
