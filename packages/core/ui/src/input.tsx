import * as React from 'react';
import { cn } from './lib/utils';
import { getAriaAttributes, useUniqueId } from './lib/keyboard-navigation';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  description?: string;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type, 
    error, 
    label,
    description,
    required = false,
    invalid = false,
    describedBy,
    id,
    ...props 
  }, ref) => {
    const uniqueId = useUniqueId('input')
    const inputId = id || uniqueId
    const errorId = `${inputId}-error`
    const descriptionId = `${inputId}-description`
    
    // Combine describedBy with our generated IDs
    const allDescribedBy = [descriptionId, errorId, describedBy]
      .filter(Boolean)
      .join(' ')

    const ariaAttributes = getAriaAttributes({
      invalid: invalid || !!error,
      required,
      describedBy: allDescribedBy || undefined,
      placeholder: props.placeholder,
    })

    return (
      <div className="relative">
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground mb-1"
          >
            {label}
            {required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        
        <input
          type={type}
          id={inputId}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            (error || invalid) && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          ref={ref}
          aria-describedby={allDescribedBy || undefined}
          aria-invalid={invalid || !!error}
          aria-required={required}
          {...ariaAttributes}
          {...props}
        />
        
        {description && (
          <p 
            id={descriptionId}
            className="text-sm text-muted-foreground mt-1"
          >
            {description}
          </p>
        )}
        
        {error && (
          <p 
            id={errorId}
            className="text-sm text-destructive mt-1" 
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input }; 