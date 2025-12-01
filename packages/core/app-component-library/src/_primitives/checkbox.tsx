import * as React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { CheckIcon } from 'lucide-react'
import { cn } from '../_lib/utils'
import { getAriaAttributes, useUniqueId } from '../_lib/keyboard-navigation'

export interface CheckboxProps extends React.ComponentProps<typeof CheckboxPrimitive.Root> {
  label?: string
  description?: string
  error?: string
  required?: boolean
  invalid?: boolean
}

function Checkbox({
  className,
  label,
  description,
  error,
  required = false,
  invalid = false,
  id,
  ...props
}: CheckboxProps) {
  const uniqueId = useUniqueId('checkbox')
  const checkboxId = id || uniqueId
  const errorId = `${checkboxId}-error`
  const descriptionId = `${checkboxId}-description`

  const ariaAttributes = getAriaAttributes({
    invalid: invalid || !!error,
    required,
    describedBy: [descriptionId, errorId].filter(Boolean).join(' ') || undefined,
  })

  return (
    <div className="flex items-start space-x-2">
      <CheckboxPrimitive.Root
        data-slot="checkbox"
        id={checkboxId}
        className={cn(
          'peer border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
          (error || invalid) && 'border-destructive focus-visible:ring-destructive',
          className,
        )}
        aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
        aria-invalid={invalid || !!error}
        aria-required={required}
        {...ariaAttributes}
        {...props}
      >
        <CheckboxPrimitive.Indicator
          data-slot="checkbox-indicator"
          className="flex items-center justify-center text-current transition-none"
        >
          <CheckIcon className="size-3.5" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>

      {label || description || error ? (
        <div className="flex flex-col space-y-1">
          {label ? (
            <label
              htmlFor={checkboxId}
              className="text-sm font-medium text-foreground cursor-pointer"
            >
              {label}
              {required ? (
                <span className="text-destructive ml-1" aria-hidden="true">
                  *
                </span>
              ) : null}
            </label>
          ) : null}

          {description ? (
            <p id={descriptionId} className="text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}

          {error ? (
            <p id={errorId} className="text-sm text-destructive" role="alert" aria-live="polite">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export { Checkbox }
