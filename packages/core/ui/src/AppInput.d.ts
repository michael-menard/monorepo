import * as React from 'react'
import {InputProps} from './input'
import {SanitizationConfig} from './lib/sanitization'

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
export declare const AppInput: React.ForwardRefExoticComponent<
  AppInputProps & React.RefAttributes<HTMLInputElement>
>
//# sourceMappingURL=AppInput.d.ts.map
