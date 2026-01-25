import { z } from 'zod'

/**
 * RoutingFlag enum - defines control flow decisions for graph routing.
 *
 * These are the keys used in the GraphState.routingFlags record.
 */
export const RoutingFlagSchema = z.enum([
  'proceed', // Continue to next node
  'retry', // Retry current node
  'blocked', // Blocked by missing dependency
  'escalate', // Escalate to human
  'skip', // Skip optional node
  'complete', // Graph execution complete
])

/** TypeScript type inferred from RoutingFlagSchema */
export type RoutingFlag = z.infer<typeof RoutingFlagSchema>

/** Array of all valid RoutingFlag values */
export const ROUTING_FLAGS = RoutingFlagSchema.options
