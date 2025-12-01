/**
 * AppCheckbox Component
 * Application wrapper for Checkbox component with consistent styling
 */

import * as React from 'react'
import { Checkbox, type CheckboxProps } from '../_primitives/checkbox'
import { cn } from '../_lib/utils'

export interface AppCheckboxProps extends CheckboxProps {
  /** Size of the checkbox */
  size?: 'sm' | 'default' | 'lg'
}

const sizeStyles = {
  sm: '[&_[data-slot=checkbox]]:size-3.5 [&_[data-slot=checkbox-indicator]_svg]:size-3',
  default: '',
  lg: '[&_[data-slot=checkbox]]:size-5 [&_[data-slot=checkbox-indicator]_svg]:size-4',
}

export function AppCheckbox({
  size = 'default',
  className,
  ...props
}: AppCheckboxProps) {
  return (
    <div className={cn(sizeStyles[size], className)}>
      <Checkbox {...props} />
    </div>
  )
}

// Re-export the primitive for advanced usage
export { Checkbox } from '../_primitives/checkbox'
export type { CheckboxProps }

