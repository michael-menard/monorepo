import DOMPurify from 'dompurify';

// Ensure DOMPurify types are available
declare global {
  namespace DOMPurify {
    interface Config {
      ALLOWED_TAGS?: readonly string[];
      ALLOWED_ATTR?: readonly string[];
      KEEP_CONTENT?: boolean;
      RETURN_DOM?: boolean;
      RETURN_DOM_FRAGMENT?: boolean;
      RETURN_DOM_IMPORT?: boolean;
      RETURN_TRUSTED_TYPE?: boolean;
      SANITIZE_DOM?: boolean;
      WHOLE_DOCUMENT?: boolean;
      [key: string]: any;
    }
  }
}

/**
 * Sanitization configuration for different input types
 */
export interface SanitizationConfig {
  /** Allow basic HTML tags (for rich text) */
  allowBasicHTML?: boolean;
  /** Allow links */
  allowLinks?: boolean;
  /** Allow specific attributes */
  allowedAttributes?: readonly string[];
  /** Allow specific tags */
  allowedTags?: readonly string[];
  /** Custom DOMPurify configuration */
  customConfig?: {
    ALLOWED_TAGS?: readonly string[];
    ALLOWED_ATTR?: readonly string[];
    KEEP_CONTENT?: boolean;
    [key: string]: any;
  };
}

/**
 * Predefined sanitization profiles for common use cases
 */
export const SANITIZATION_PROFILES = {
  /** Strict sanitization - removes all HTML, only plain text */
  STRICT: {
    allowBasicHTML: false,
    allowLinks: false,
    customConfig: {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    },
  },
  
  /** Basic text with some formatting - allows basic text formatting */
  BASIC_TEXT: {
    allowBasicHTML: true,
    allowLinks: false,
    customConfig: {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br'],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    },
  },
  
  /** Rich text - allows more HTML but still secure */
  RICH_TEXT: {
    allowBasicHTML: true,
    allowLinks: true,
    customConfig: {
      ALLOWED_TAGS: [
        'b', 'i', 'em', 'strong', 'u', 'br', 'p', 'div', 'span',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li',
        'a', 'blockquote', 'code', 'pre'
      ],
      ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
      KEEP_CONTENT: true,
    },
  },
  
  /** Search input - very strict, no HTML at all */
  SEARCH: {
    allowBasicHTML: false,
    allowLinks: false,
    customConfig: {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    },
  },
  
  /** URL input - allows URL-safe characters */
  URL: {
    allowBasicHTML: false,
    allowLinks: false,
    customConfig: {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    },
  },
} as const;

/**
 * Input type to sanitization profile mapping
 */
export const INPUT_TYPE_PROFILES: Record<string, keyof typeof SANITIZATION_PROFILES> = {
  text: 'STRICT',
  email: 'STRICT',
  password: 'STRICT',
  search: 'SEARCH',
  url: 'URL',
  tel: 'STRICT',
  number: 'STRICT',
  textarea: 'BASIC_TEXT',
  'rich-text': 'RICH_TEXT',
};

/**
 * Sanitize user input based on configuration
 */
export function sanitizeInput(
  input: string | null | undefined,
  config: SanitizationConfig = SANITIZATION_PROFILES.STRICT
): string {
  // Handle null/undefined input
  if (input == null) return '';
  
  // Convert to string if not already
  const stringInput = String(input);
  
  // If empty string, return as-is
  if (stringInput.trim() === '') return stringInput;
  
  // Apply DOMPurify sanitization
  // Cast to any to handle readonly array compatibility
  const sanitized = DOMPurify.sanitize(stringInput, config.customConfig as any);

  // Ensure we always return a string, not TrustedHTML
  return typeof sanitized === 'string' ? sanitized : String(sanitized);
}

/**
 * Sanitize input based on input type
 */
export function sanitizeByInputType(
  input: string | null | undefined,
  inputType: string = 'text'
): string {
  const profileKey = INPUT_TYPE_PROFILES[inputType] || 'STRICT';
  const profile = SANITIZATION_PROFILES[profileKey];
  return sanitizeInput(input, profile);
}

/**
 * Sanitize form data object
 */
export function sanitizeFormData<T extends Record<string, any>>(
  formData: T,
  fieldConfigs: Partial<Record<keyof T, SanitizationConfig>> = {}
): T {
  const sanitized = { ...formData };
  
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      const config = fieldConfigs[key as keyof T] || SANITIZATION_PROFILES.STRICT;
      sanitized[key as keyof T] = sanitizeInput(value, config) as T[keyof T];
    }
  }
  
  return sanitized;
}

/**
 * Create a sanitization hook for React components
 */
export function createSanitizationHook(config: SanitizationConfig = SANITIZATION_PROFILES.STRICT) {
  return function useSanitizedValue(value: string | null | undefined): string {
    return sanitizeInput(value, config);
  };
}

/**
 * Validate that input is safe after sanitization
 */
export function validateSanitizedInput(
  original: string,
  sanitized: string,
  options: { strict?: boolean } = {}
): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  // Check if content was removed
  if (original.length !== sanitized.length) {
    warnings.push('Content was modified during sanitization');
  }
  
  // Check for potential XSS patterns that were removed
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
  ];
  
  const hadXssPatterns = xssPatterns.some(pattern => pattern.test(original));
  const hasXssPatterns = xssPatterns.some(pattern => pattern.test(sanitized));
  
  if (hadXssPatterns && !hasXssPatterns) {
    warnings.push('Potentially malicious content was removed');
  }
  
  const isValid = options.strict ? warnings.length === 0 : !hasXssPatterns;
  
  return { isValid, warnings };
}

/**
 * Utility to check if DOMPurify is available (for SSR compatibility)
 */
export function isDOMPurifyAvailable(): boolean {
  return typeof window !== 'undefined' && !!DOMPurify;
}

/**
 * Safe sanitization that works in both browser and SSR environments
 */
export function safeSanitizeInput(
  input: string | null | undefined,
  config: SanitizationConfig = SANITIZATION_PROFILES.STRICT
): string {
  if (!isDOMPurifyAvailable()) {
    // In SSR environment, do basic string cleaning
    if (input == null) return '';
    return String(input)
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers
  }
  
  return sanitizeInput(input, config);
}
