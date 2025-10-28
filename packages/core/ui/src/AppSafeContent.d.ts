import * as React from 'react'
import { SanitizationConfig } from './lib/sanitization'

export interface AppSafeContentProps {
  /** Content to sanitize and display */
  content: string
  /** HTML element to render as */
  as?: keyof JSX.IntrinsicElements
  /** Custom sanitization configuration */
  sanitizationConfig?: SanitizationConfig
  /** Whether to show warnings when content is sanitized */
  showSanitizationWarnings?: boolean
  /** Callback when sanitization warnings occur */
  onSanitizationWarning?: (warnings: string[]) => void
  /** Additional props to pass to the rendered element */
  [key: string]: any
}
/**
 * Safe Content component for displaying user-generated content with automatic sanitization
 *
 * Features:
 * - Automatic sanitization of HTML content
 * - Configurable sanitization profiles
 * - Optional sanitization warnings
 * - SSR-safe implementation
 * - Flexible rendering as different HTML elements
 *
 * @example
 * ```tsx
 * // Basic usage - displays as div
 * <AppSafeContent content={userGeneratedHTML} />
 *
 * // Custom element and sanitization
 * <AppSafeContent
 *   content={userBlogPost}
 *   as="article"
 *   sanitizationConfig={SANITIZATION_PROFILES.RICH_TEXT}
 *   className="blog-content"
 * />
 *
 * // Strict sanitization with warnings
 * <AppSafeContent
 *   content={userComment}
 *   sanitizationConfig={SANITIZATION_PROFILES.STRICT}
 *   showSanitizationWarnings
 *   onSanitizationWarning={(warnings) => logWarnings(warnings)}
 * />
 * ```
 */
export declare const AppSafeContent: React.FC<AppSafeContentProps>
//# sourceMappingURL=AppSafeContent.d.ts.map
