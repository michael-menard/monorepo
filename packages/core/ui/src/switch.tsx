import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { cn } from "./lib/utils"
import { getAriaAttributes, useUniqueId } from "./lib/keyboard-navigation"

export interface SwitchProps extends React.ComponentProps<typeof SwitchPrimitive.Root> {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  invalid?: boolean;
}

function Switch({
  className,
  label,
  description,
  error,
  required = false,
  invalid = false,
  id,
  ...props
}: SwitchProps) {
  const uniqueId = useUniqueId('switch')
  const switchId = id || uniqueId
  const errorId = `${switchId}-error`
  const descriptionId = `${switchId}-description`
  
  const ariaAttributes = getAriaAttributes({
    invalid: invalid || !!error,
    required,
    describedBy: [descriptionId, errorId].filter(Boolean).join(' ') || undefined,
  })

  return (
    <div className="flex items-start space-x-2">
      <SwitchPrimitive.Root
        data-slot="switch"
        id={switchId}
        className={cn(
          "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
          (error || invalid) && "focus-visible:ring-destructive",
          className
        )}
        aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
        aria-invalid={invalid || !!error}
        aria-required={required}
        {...ariaAttributes}
        {...props}
      >
        <SwitchPrimitive.Thumb
          data-slot="switch-thumb"
          className={cn(
            "bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
          )}
        />
      </SwitchPrimitive.Root>
      
      {(label || description || error) && (
        <div className="flex flex-col space-y-1">
          {label && (
            <label 
              htmlFor={switchId}
              className="text-sm font-medium text-foreground cursor-pointer"
            >
              {label}
              {required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
            </label>
          )}
          
          {description && (
            <p 
              id={descriptionId}
              className="text-sm text-muted-foreground"
            >
              {description}
            </p>
          )}
          
          {error && (
            <p 
              id={errorId}
              className="text-sm text-destructive" 
              role="alert"
              aria-live="polite"
            >
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export { Switch }
