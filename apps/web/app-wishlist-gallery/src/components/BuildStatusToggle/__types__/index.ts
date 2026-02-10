/**
 * BuildStatusToggle Types
 *
 * Zod schemas for BuildStatusToggle component.
 * Story SETS-MVP-004
 */

import { z } from 'zod'
import { BuildStatusSchema } from '@repo/api-client/schemas/wishlist'

/**
 * Props schema for BuildStatusToggle
 */
export const BuildStatusTogglePropsSchema = z.object({
  itemId: z.string().uuid(),
  currentStatus: BuildStatusSchema.nullable(),
  itemTitle: z.string(),
  disabled: z.boolean().optional(),
})

export type BuildStatusToggleProps = z.infer<typeof BuildStatusTogglePropsSchema>
