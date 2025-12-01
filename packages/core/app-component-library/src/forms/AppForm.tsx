import * as React from 'react'
import { SANITIZATION_PROFILES, SanitizationConfig, sanitizeFormData } from '../lib/sanitization'

export interface AppFormProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  /** Custom sanitization configurations for specific fields */
  fieldSanitizationConfigs?: Record<string, SanitizationConfig>
  /** Default sanitization configuration for all fields */
  defaultSanitizationConfig?: SanitizationConfig
  /** Whether to sanitize form data on submit */
  sanitizeOnSubmit?: boolean
  /** Whether to show warnings when content is sanitized */
  showSanitizationWarnings?: boolean
  /** Callback when sanitization warnings occur */
  onSanitizationWarning?: (warnings: string[]) => void
  /** Form submit handler that receives sanitized form data */
  onSubmit?: (event: React.FormEvent<HTMLFormElement>, sanitizedData: FormData) => void
}

/**
 * Secure Form component that automatically sanitizes form data on submit
 *
 * Features:
 * - Automatic sanitization of all form data on submit
 * - Field-specific sanitization configurations
 * - Optional sanitization warnings
 * - SSR-safe implementation
 * - Maintains all original form functionality
 *
 * @example
 * ```tsx
 * // Basic usage
 * <AppForm onSubmit={(e, sanitizedData) => handleSubmit(sanitizedData)}>
 *   <AppInput name="email" type="email" />
 *   <AppTextarea name="message" />
 *   <button type="submit">Submit</button>
 * </AppForm>
 *
 * // With field-specific sanitization
 * <AppForm
 *   fieldSanitizationConfigs={{
 *     message: SANITIZATION_PROFILES.RICH_TEXT,
 *     email: SANITIZATION_PROFILES.STRICT
 *   }}
 *   showSanitizationWarnings
 *   onSubmit={(e, data) => handleSubmit(data)}
 * >
 *   <AppInput name="email" type="email" />
 *   <AppTextarea name="message" />
 * </AppForm>
 * ```
 */
export const AppForm = React.forwardRef<HTMLFormElement, AppFormProps>(
  (
    {
      fieldSanitizationConfigs = {},
      defaultSanitizationConfig = SANITIZATION_PROFILES.STRICT,
      sanitizeOnSubmit = true,
      showSanitizationWarnings = false,
      onSanitizationWarning,
      onSubmit,
      children,
      ...props
    },
    ref,
  ) => {
    // Handle form submission with sanitization
    const handleSubmit = React.useCallback(
      (event: React.FormEvent<HTMLFormElement>) => {
        if (!sanitizeOnSubmit || !onSubmit) {
          onSubmit?.(event, new FormData(event.currentTarget))
          return
        }

        // Get form data
        const formData = new FormData(event.currentTarget)
        const formDataObject: Record<string, string> = {}

        // Convert FormData to object for sanitization
        for (const [key, value] of formData.entries()) {
          if (typeof value === 'string') {
            formDataObject[key] = value
          }
        }

        // Prepare sanitization configs for each field
        const sanitizationConfigs: Record<string, SanitizationConfig> = {}
        for (const key in formDataObject) {
          sanitizationConfigs[key] = fieldSanitizationConfigs[key] || defaultSanitizationConfig
        }

        // Sanitize form data
        const sanitizedData = sanitizeFormData(formDataObject, sanitizationConfigs)

        // Check for warnings
        if (showSanitizationWarnings || onSanitizationWarning) {
          const warnings: string[] = []

          for (const [key, originalValue] of Object.entries(formDataObject)) {
            const sanitizedValue = sanitizedData[key]
            if (originalValue !== sanitizedValue) {
              warnings.push(
                `Field "${key}" was sanitized: "${originalValue}" → "${sanitizedValue}"`,
              )
            }
          }

          if (warnings.length > 0) {
            if (showSanitizationWarnings) {
              console.warn('AppForm sanitization warnings:', warnings)
            }
            onSanitizationWarning?.(warnings)
          }
        }

        // Create new FormData with sanitized values
        const sanitizedFormData = new FormData()
        for (const [key, value] of Object.entries(sanitizedData)) {
          sanitizedFormData.append(key, value)
        }

        // Call the original onSubmit with sanitized data
        onSubmit(event, sanitizedFormData)
      },
      [
        sanitizeOnSubmit,
        onSubmit,
        fieldSanitizationConfigs,
        defaultSanitizationConfig,
        showSanitizationWarnings,
        onSanitizationWarning,
      ],
    )

    return (
      <form {...props} ref={ref} onSubmit={handleSubmit}>
        {children}
      </form>
    )
  },
)

AppForm.displayName = 'AppForm'
