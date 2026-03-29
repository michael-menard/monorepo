import { z } from 'zod'

/**
 * NodeError schema - represents an error captured during node execution.
 *
 * Fields:
 * - nodeId: The identifier of the node where the error occurred
 * - message: Human-readable error message
 * - code: Optional error code for programmatic handling
 * - timestamp: ISO datetime string of when the error occurred
 * - stack: Optional stack trace for debugging
 * - recoverable: Whether the error is recoverable (default: false)
 */
export const NodeErrorSchema = z.object({
  nodeId: z.string().min(1, 'Node ID must be non-empty'),
  message: z.string().min(1, 'Error message must be non-empty'),
  code: z.string().optional(),
  timestamp: z.string().datetime({ message: 'Timestamp must be a valid ISO datetime string' }),
  stack: z.string().optional(),
  recoverable: z.boolean().default(false),
})

/** TypeScript type inferred from NodeErrorSchema */
export type NodeError = z.infer<typeof NodeErrorSchema>

/**
 * Input type for NodeError (before defaults are applied).
 * Use this when creating new NodeError objects.
 */
export type NodeErrorInput = z.input<typeof NodeErrorSchema>
