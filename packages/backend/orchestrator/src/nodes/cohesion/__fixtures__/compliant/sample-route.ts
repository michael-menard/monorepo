/**
 * Compliant sample route handler fixture.
 *
 * This file intentionally follows all cohesion conventions:
 * - Lives in a handlers/ directory (simulated by path)
 * - Does not use console.log
 * - Uses proper Zod schemas
 * - No direct DB access in handler
 */

import { z } from 'zod'
import { logger } from '@repo/logger'

// ✅ Correct: Zod schema with Schema suffix
export const GetItemRequestSchema = z.object({
  id: z.string().uuid(),
})

// ✅ Correct: type alias matching schema
export type GetItemRequest = z.infer<typeof GetItemRequestSchema>

// ✅ Correct: Response schema
export const GetItemResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.string().datetime(),
})

export type GetItemResponse = z.infer<typeof GetItemResponseSchema>

// ✅ Correct: uses logger, not console
function logRequest(id: string): void {
  logger.info('Processing get item request', { id })
}

// ✅ Correct: handler delegates to service layer (no direct DB)
export function getItemHandler(itemId: string): GetItemResponse {
  logRequest(itemId)
  // Would call itemService.getById(itemId) in real code
  return GetItemResponseSchema.parse({
    id: itemId,
    name: 'Sample Item',
    createdAt: new Date().toISOString(),
  })
}
