/**
 * Sanitization configuration for different input types
 */
export interface SanitizationConfig {
  /** Allow basic HTML tags (for rich text) */
  allowBasicHTML?: boolean
  /** Allow links */
  allowLinks?: boolean
  /** Allow specific attributes */
  allowedAttributes?: string[]
  /** Allow specific tags */
  allowedTags?: string[]
  /** Custom DOMPurify configuration */
  customConfig?: DOMPurify.Config
}
/**
 * Predefined sanitization profiles for common use cases
 */
export declare const SANITIZATION_PROFILES: {
  /** Strict sanitization - removes all HTML, only plain text */
  readonly STRICT: {
    readonly allowBasicHTML: false
    readonly allowLinks: false
    readonly customConfig: {
      readonly ALLOWED_TAGS: readonly []
      readonly ALLOWED_ATTR: readonly []
      readonly KEEP_CONTENT: true
    }
  }
  /** Basic text with some formatting - allows basic text formatting */
  readonly BASIC_TEXT: {
    readonly allowBasicHTML: true
    readonly allowLinks: false
    readonly customConfig: {
      readonly ALLOWED_TAGS: readonly ['b', 'i', 'em', 'strong', 'u', 'br']
      readonly ALLOWED_ATTR: readonly []
      readonly KEEP_CONTENT: true
    }
  }
  /** Rich text - allows more HTML but still secure */
  readonly RICH_TEXT: {
    readonly allowBasicHTML: true
    readonly allowLinks: true
    readonly customConfig: {
      readonly ALLOWED_TAGS: readonly [
        'b',
        'i',
        'em',
        'strong',
        'u',
        'br',
        'p',
        'div',
        'span',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'ul',
        'ol',
        'li',
        'a',
        'blockquote',
        'code',
        'pre',
      ]
      readonly ALLOWED_ATTR: readonly ['href', 'title', 'target', 'rel']
      readonly KEEP_CONTENT: true
    }
  }
  /** Search input - very strict, no HTML at all */
  readonly SEARCH: {
    readonly allowBasicHTML: false
    readonly allowLinks: false
    readonly customConfig: {
      readonly ALLOWED_TAGS: readonly []
      readonly ALLOWED_ATTR: readonly []
      readonly KEEP_CONTENT: true
    }
  }
  /** URL input - allows URL-safe characters */
  readonly URL: {
    readonly allowBasicHTML: false
    readonly allowLinks: false
    readonly customConfig: {
      readonly ALLOWED_TAGS: readonly []
      readonly ALLOWED_ATTR: readonly []
      readonly KEEP_CONTENT: true
    }
  }
}
/**
 * Input type to sanitization profile mapping
 */
export declare const INPUT_TYPE_PROFILES: Record<string, keyof typeof SANITIZATION_PROFILES>
/**
 * Sanitize user input based on configuration
 */
export declare function sanitizeInput(
  input: string | null | undefined,
  config?: SanitizationConfig,
): string
/**
 * Sanitize input based on input type
 */
export declare function sanitizeByInputType(
  input: string | null | undefined,
  inputType?: string,
): string
/**
 * Sanitize form data object
 */
export declare function sanitizeFormData<T extends Record<string, any>>(
  formData: T,
  fieldConfigs?: Partial<Record<keyof T, SanitizationConfig>>,
): T
/**
 * Create a sanitization hook for React components
 */
export declare function createSanitizationHook(
  config?: SanitizationConfig,
): (value: string | null | undefined) => string
/**
 * Validate that input is safe after sanitization
 */
export declare function validateSanitizedInput(
  original: string,
  sanitized: string,
  options?: {
    strict?: boolean
  },
): {
  isValid: boolean
  warnings: string[]
}
/**
 * Utility to check if DOMPurify is available (for SSR compatibility)
 */
export declare function isDOMPurifyAvailable(): boolean
/**
 * Safe sanitization that works in both browser and SSR environments
 */
export declare function safeSanitizeInput(
  input: string | null | undefined,
  config?: SanitizationConfig,
): string
//# sourceMappingURL=sanitization.d.ts.map
