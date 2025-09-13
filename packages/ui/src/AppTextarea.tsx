import * as React from 'react';
import { Textarea, TextareaProps } from './textarea';
import {
  sanitizeInput,
  SANITIZATION_PROFILES,
  SanitizationConfig,
  validateSanitizedInput
} from './lib/sanitization';

// Simple debounce hook (internal to avoid external dependencies)
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

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
export const AppTextarea = React.forwardRef<HTMLTextAreaElement, AppTextareaProps>(
  ({
    sanitizationConfig = SANITIZATION_PROFILES.BASIC_TEXT,
    sanitizeOnChange = true,
    showSanitizationWarnings = false,
    onSanitizationWarning,
    onChange,
    onBlur,
    value,
    defaultValue,
    debounceMs = 0,
    debounceSanitization = true,
    ...props
  }, ref) => {
    const [internalValue, setInternalValue] = React.useState<string>(
      (value as string) || (defaultValue as string) || ''
    );

    // Debounced value for onChange events
    const debouncedInternalValue = useDebounce(internalValue, debounceMs);
    
    // Sanitize value and handle warnings
    const sanitizeValue = React.useCallback((inputValue: string) => {
      const sanitized = sanitizeInput(inputValue, sanitizationConfig);
      
      if (showSanitizationWarnings || onSanitizationWarning) {
        const validation = validateSanitizedInput(inputValue, sanitized);
        if (validation.warnings.length > 0) {
          if (showSanitizationWarnings) {
            console.warn('AppTextarea sanitization warnings:', validation.warnings);
          }
          onSanitizationWarning?.(validation.warnings);
        }
      }
      
      return sanitized;
    }, [sanitizationConfig, showSanitizationWarnings, onSanitizationWarning]);
    
    // Handle controlled vs uncontrolled component
    const isControlled = value !== undefined;
    const currentValue = isControlled ? (value as string) : internalValue;

    // Effect to handle debounced onChange calls
    React.useEffect(() => {
      if (debounceMs > 0 && onChange && !isControlled && debouncedInternalValue !== internalValue) {
        // Create a synthetic event for the debounced value
        const syntheticEvent = {
          target: { value: debouncedInternalValue },
          currentTarget: { value: debouncedInternalValue },
        } as React.ChangeEvent<HTMLTextAreaElement>;

        onChange(syntheticEvent);
      }
    }, [debouncedInternalValue, debounceMs, onChange, isControlled]);
    
    // Handle change events
    const handleChange = React.useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = event.target.value;
      
      if (sanitizeOnChange) {
        const sanitizedValue = sanitizeValue(newValue);
        
        // Update the event target value to the sanitized value
        Object.defineProperty(event, 'target', {
          writable: false,
          value: {
            ...event.target,
            value: sanitizedValue,
          },
        });
        
        if (!isControlled) {
          setInternalValue(sanitizedValue);
        }
        
        onChange?.(event);
      } else {
        // Don't sanitize on change, just pass through
        if (!isControlled) {
          setInternalValue(newValue);
        }
        
        onChange?.(event);
      }
    }, [sanitizeOnChange, sanitizeValue, isControlled, onChange]);
    
    // Handle blur events (always sanitize on blur if not sanitizing on change)
    const handleBlur = React.useCallback((event: React.FocusEvent<HTMLTextAreaElement>) => {
      if (!sanitizeOnChange) {
        const sanitizedValue = sanitizeValue(event.target.value);
        
        // Update the event target value to the sanitized value
        Object.defineProperty(event, 'target', {
          writable: false,
          value: {
            ...event.target,
            value: sanitizedValue,
          },
        });
        
        if (!isControlled) {
          setInternalValue(sanitizedValue);
        }
      }
      
      onBlur?.(event);
    }, [sanitizeOnChange, sanitizeValue, isControlled, onBlur]);
    
    // Sanitize initial value if controlled
    React.useEffect(() => {
      if (isControlled && value && sanitizeOnChange) {
        const sanitized = sanitizeValue(value as string);
        if (sanitized !== value) {
          // If the parent provided an unsanitized value, we should warn
          if (showSanitizationWarnings) {
            console.warn('AppTextarea: Initial value was sanitized', { original: value, sanitized });
          }
        }
      }
    }, [value, isControlled, sanitizeOnChange, sanitizeValue, showSanitizationWarnings]);
    
    return (
      <Textarea
        {...props}
        ref={ref}
        value={currentValue}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    );
  }
);

AppTextarea.displayName = 'AppTextarea';
