import * as React from 'react';
import { LabelProps } from './label';
import { SanitizationConfig } from './lib/sanitization';
export interface AppLabelProps extends Omit<LabelProps, 'children'> {
    /** Label text content */
    children: React.ReactNode;
    /** Custom sanitization configuration */
    sanitizationConfig?: SanitizationConfig;
    /** Whether to show warnings when content is sanitized */
    showSanitizationWarnings?: boolean;
    /** Callback when sanitization warnings occur */
    onSanitizationWarning?: (warnings: string[]) => void;
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
export declare const AppLabel: React.ForwardRefExoticComponent<Omit<AppLabelProps, "ref"> & React.RefAttributes<HTMLLabelElement>>;
//# sourceMappingURL=AppLabel.d.ts.map