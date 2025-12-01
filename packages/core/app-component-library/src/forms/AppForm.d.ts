import * as React from 'react'
import { SanitizationConfig } from '../lib/sanitization'

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
export declare const AppForm: React.ForwardRefExoticComponent<
  AppFormProps & React.RefAttributes<HTMLFormElement>
>
//# sourceMappingURL=AppForm.d.ts.map
