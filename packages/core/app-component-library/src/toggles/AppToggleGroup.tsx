/**
 * AppToggleGroup Component
 * Application wrapper for ToggleGroup component with consistent styling
 */

import * as React from 'react'
import { ToggleGroup, ToggleGroupItem } from '../_primitives/toggle-group'
import type { ToggleGroupProps, ToggleGroupItemProps } from '../_primitives/toggle-group'
import { cn } from '../_lib/utils'

export interface AppToggleGroupProps extends Omit<ToggleGroupProps, 'type'> {
  /** Whether multiple items can be selected */
  multiple?: boolean
  /** Size of the toggle items */
  size?: 'sm' | 'default' | 'lg'
  /** Style variant */
  style?: 'default' | 'outline' | 'surface'
}

export interface AppToggleGroupItemProps extends Omit<ToggleGroupItemProps, 'variant' | 'size'> {
  children?: React.ReactNode
}

const sizeStyles = {
  sm: 'min-w-[36px] min-h-[36px]',
  default: 'min-w-[44px] min-h-[44px]',
  lg: 'min-w-[52px] min-h-[52px]',
}

const groupStyles = {
  default: 'bg-muted/50 p-1 rounded-lg',
  outline: 'border border-input p-1 rounded-lg',
  surface: 'bg-surface/80 border border-surface-border p-1 rounded-lg shadow-sm',
}

const AppToggleGroupContext = React.createContext<{
  size: 'sm' | 'default' | 'lg'
}>({ size: 'default' })

export function AppToggleGroup({
  multiple = false,
  size = 'default',
  style = 'surface',
  className,
  children,
  ...props
}: AppToggleGroupProps) {
  const contextValue = React.useMemo(() => ({ size }), [size])

  return (
    <AppToggleGroupContext.Provider value={contextValue}>
      <ToggleGroup
        type={multiple ? 'multiple' : 'single'}
        className={cn(groupStyles[style], className)}
        {...props}
      >
        {children}
      </ToggleGroup>
    </AppToggleGroupContext.Provider>
  )
}

export function AppToggleGroupItem({
  className,
  children,
  ...props
}: AppToggleGroupItemProps) {
  const { size } = React.useContext(AppToggleGroupContext)

  return (
    <ToggleGroupItem
      className={cn(sizeStyles[size], className)}
      {...props}
    >
      {children}
    </ToggleGroupItem>
  )
}

// Re-export raw primitives for advanced usage
export { ToggleGroup, ToggleGroupItem } from '../_primitives/toggle-group'
export type { ToggleGroupProps, ToggleGroupItemProps } from '../_primitives/toggle-group'
