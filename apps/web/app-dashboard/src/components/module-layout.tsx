/**
 * AppDashboard Module Layout
 *
 * Layout wrapper for the App Dashboard module.
 * Provides consistent styling and structure for all module pages.
 */
import type { ReactNode } from 'react'
import { z } from 'zod'
import { cn } from '@repo/app-component-library'

/**
 * Module layout props schema
 */
const ModuleLayoutPropsSchema = z.object({
  /** Child components to render within the layout */
  children: z.custom<ReactNode>(),
  /** Optional className for styling */
  className: z.string().optional(),
})

export type ModuleLayoutProps = z.infer<typeof ModuleLayoutPropsSchema>

/**
 * Module Layout Component
 *
 * Wraps module content with consistent layout and styling.
 */
export function ModuleLayout({ children, className }: ModuleLayoutProps) {
  return (
    <div className={cn('min-h-full px-4 py-6 md:px-6 lg:px-8', className)}>
      {children}
    </div>
  )
}

export default ModuleLayout
