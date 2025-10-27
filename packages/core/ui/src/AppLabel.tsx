import * as React from 'react'
import {Label, LabelProps} from './label'
import {SANITIZATION_PROFILES, SanitizationConfig, sanitizeInput, validateSanitizedInput,} from './lib/sanitization'

export interface AppLabelProps extends Omit<LabelProps, 'children'> {
  /** Label text content */
  children: React.ReactNode
  /** Custom sanitization configuration */
  sanitizationConfig?: SanitizationConfig
  /** Whether to show warnings when content is sanitized */
  showSanitizationWarnings?: boolean
  /** Callback when sanitization warnings occur */
  onSanitizationWarning?: (warnings: string[]) => void
}

/**
 * Secure Label component that automatically sanitizes text content
 *
 * Features:
 * - Automatic sanitization of label text
 * - Configurable sanitization profiles
 * - Optional sanitization warnings
 * - SSR-safe implementation
 * - Maintains all original Label component functionality
 *
 * @example
 * ```tsx
 * // Basic usage
 * <AppLabel htmlFor="email">Email Address</AppLabel>
 *
 * // With user-generated content
 * <AppLabel
 *   htmlFor="custom-field"
 *   sanitizationConfig={SANITIZATION_PROFILES.BASIC_TEXT}
 *   showSanitizationWarnings
 * >
 *   {userGeneratedLabel}
 * </AppLabel>
 * ```
 */
export const AppLabel = React.forwardRef<React.ElementRef<typeof Label>, AppLabelProps>(
  (
    {
      children,
      sanitizationConfig = SANITIZATION_PROFILES.BASIC_TEXT,
      showSanitizationWarnings = false,
      onSanitizationWarning,
      ...props
    },
    ref,
  ) => {
    // Sanitize children if they are strings
    const sanitizedChildren = React.useMemo(() => {
      if (typeof children === 'string') {
        const sanitized = sanitizeInput(children, sanitizationConfig)

        // Check for warnings
        if (showSanitizationWarnings || onSanitizationWarning) {
          const validation = validateSanitizedInput(children, sanitized)
          if (validation.warnings.length > 0) {
            if (showSanitizationWarnings) {
              console.warn('AppLabel sanitization warnings:', validation.warnings)
            }
            onSanitizationWarning?.(validation.warnings)
          }
        }

        return sanitized
      }

      // For non-string children (React nodes), return as-is
      // Note: This doesn't sanitize React nodes, only string content
      return children
    }, [children, sanitizationConfig, showSanitizationWarnings, onSanitizationWarning])

    return (
      <Label {...props} ref={ref}>
        {sanitizedChildren}
      </Label>
    )
  },
)

AppLabel.displayName = 'AppLabel'
