import * as React from 'react'
import {SANITIZATION_PROFILES, SanitizationConfig, sanitizeInput, validateSanitizedInput,} from './lib/sanitization'

// Ensure JSX namespace is available
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any
    }
  }
}

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
export const AppSafeContent: React.FC<AppSafeContentProps> = ({
  content,
  as: Component = 'div',
  sanitizationConfig = SANITIZATION_PROFILES.BASIC_TEXT,
  showSanitizationWarnings = false,
  onSanitizationWarning,
  ...props
}) => {
  // Sanitize content
  const sanitizedContent = React.useMemo(() => {
    const sanitized = sanitizeInput(content, sanitizationConfig)

    // Check for warnings
    if (showSanitizationWarnings || onSanitizationWarning) {
      const validation = validateSanitizedInput(content, sanitized)
      if (validation.warnings.length > 0) {
        if (showSanitizationWarnings) {
          console.warn('AppSafeContent sanitization warnings:', validation.warnings)
        }
        onSanitizationWarning?.(validation.warnings)
      }
    }

    return sanitized
  }, [content, sanitizationConfig, showSanitizationWarnings, onSanitizationWarning])

  // If the sanitized content contains HTML, use dangerouslySetInnerHTML
  // Otherwise, render as text content
  const containsHTML = sanitizedContent !== sanitizedContent.replace(/<[^>]*>/g, '')

  if (containsHTML) {
    return React.createElement(Component as string, {
      ...props,
      dangerouslySetInnerHTML: { __html: sanitizedContent },
    })
  }

  return React.createElement(Component as string, props, sanitizedContent)
}

AppSafeContent.displayName = 'AppSafeContent'
