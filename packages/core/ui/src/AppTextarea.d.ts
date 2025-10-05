import * as React from 'react';
import { TextareaProps } from './textarea';
import { SanitizationConfig } from './lib/sanitization';
export interface AppTextareaProps extends Omit<TextareaProps, 'onChange' | 'onBlur'> {
    /** Custom sanitization configuration */
    sanitizationConfig?: SanitizationConfig;
    /** Whether to sanitize on every change or only on blur */
    sanitizeOnChange?: boolean;
    /** Whether to show warnings when content is sanitized */
    showSanitizationWarnings?: boolean;
    /** Callback when sanitization warnings occur */
    onSanitizationWarning?: (warnings: string[]) => void;
    /** Original onChange handler that receives sanitized value */
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    /** Original onBlur handler that receives sanitized value */
    onBlur?: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
    /** Debounce delay in milliseconds for onChange events (0 = no debounce) */
    debounceMs?: number;
    /** Whether to debounce sanitization as well (default: true) */
    debounceSanitization?: boolean;
}
/**
 * Secure Textarea component that automatically sanitizes user input using DOMPurify
 *
 * Features:
 * - Automatic sanitization with BASIC_TEXT profile (allows basic formatting)
 * - Configurable sanitization profiles
 * - Optional sanitization warnings
 * - SSR-safe implementation
 * - Maintains all original Textarea component functionality
 *
 * @example
 * ```tsx
 * // Basic usage with automatic sanitization
 * <AppTextarea placeholder="Enter your message" />
 *
 * // Strict sanitization (no HTML)
 * <AppTextarea
 *   sanitizationConfig={SANITIZATION_PROFILES.STRICT}
 *   showSanitizationWarnings
 * />
 *
 * // Rich text support with debouncing
 * <AppTextarea
 *   sanitizationConfig={SANITIZATION_PROFILES.RICH_TEXT}
 *   onChange={(e) => setMessage(e.target.value)}
 *   debounceMs={300} // Debounce for better performance
 * />
 *
 * // Long-form content with debouncing
 * <AppTextarea
 *   placeholder="Write your article..."
 *   debounceMs={500}
 *   sanitizationConfig={SANITIZATION_PROFILES.RICH_TEXT}
 * />
 * ```
 */
export declare const AppTextarea: React.ForwardRefExoticComponent<Omit<AppTextareaProps, "ref"> & React.RefAttributes<HTMLTextAreaElement>>;
//# sourceMappingURL=AppTextarea.d.ts.map