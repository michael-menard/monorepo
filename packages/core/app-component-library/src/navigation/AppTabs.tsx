/**
 * AppTabs Component
 * Application wrapper for Tabs component with consistent styling
 */

import * as React from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent, type TabsProps } from '../_primitives/tabs'
import { cn } from '../_lib/utils'

export type TabsVariant = 'default' | 'pills' | 'underline'

export interface AppTabsProps extends TabsProps {
  /** Visual variant of the tabs */
  variant?: TabsVariant
}

export interface AppTabsListProps extends React.ComponentProps<typeof TabsList> {
  /** Visual variant of the tabs list */
  variant?: TabsVariant
}

export interface AppTabsTriggerProps extends React.ComponentProps<typeof TabsTrigger> {
  /** Visual variant of the tab trigger */
  variant?: TabsVariant
}

const listVariantStyles: Record<TabsVariant, string> = {
  default: '',
  pills: 'bg-transparent gap-1 p-0',
  underline: 'bg-transparent border-b rounded-none p-0 h-auto',
}

const triggerVariantStyles: Record<TabsVariant, string> = {
  default: '',
  pills: 'rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
  underline:
    'rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none pb-3',
}

export function AppTabs({ variant = 'default', className, ...props }: AppTabsProps) {
  return <Tabs className={className} {...props} />
}

export function AppTabsList({ variant = 'default', className, ...props }: AppTabsListProps) {
  return <TabsList className={cn(listVariantStyles[variant], className)} {...props} />
}

export function AppTabsTrigger({ variant = 'default', className, ...props }: AppTabsTriggerProps) {
  return <TabsTrigger className={cn(triggerVariantStyles[variant], className)} {...props} />
}

export function AppTabsContent({ className, ...props }: React.ComponentProps<typeof TabsContent>) {
  return <TabsContent className={className} {...props} />
}

// Re-export primitives for advanced usage
export { Tabs, TabsList, TabsTrigger, TabsContent }
export type { TabsProps }
