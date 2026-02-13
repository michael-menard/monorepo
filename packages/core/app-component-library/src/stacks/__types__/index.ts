import { z } from 'zod'
import type { ReactNode } from 'react'

// =============================================================================
// Shared Zod schemas for stack visualization components
// =============================================================================

export const StackItemSchema = z.object({
  id: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
})

export type StackItem = z.infer<typeof StackItemSchema>

export const BaseStackPropsSchema = z.object({
  maxVisible: z.number().int().min(1).max(10).default(4),
  className: z.string().optional(),
})

export type BaseStackProps = z.infer<typeof BaseStackPropsSchema> & {
  items: StackItem[]
  renderItem: (item: StackItem, index: number) => ReactNode
  onItemClick?: (item: StackItem) => void
}

export const ExpandableStackPropsSchema = z.object({
  enabled: z.boolean().default(true),
  hoverDelayMs: z.number().int().min(0).default(300),
  columns: z.number().int().min(1).max(4).default(2),
  className: z.string().optional(),
})

export type ExpandableStackProps = z.infer<typeof ExpandableStackPropsSchema> & {
  children: ReactNode
  items: StackItem[]
  renderPreviewItem: (item: StackItem, index: number) => ReactNode
  onItemClick?: (item: StackItem) => void
}
