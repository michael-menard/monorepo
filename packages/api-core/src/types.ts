import { z } from 'zod'

/**
 * Result type for operations that can fail
 * Use this for service-layer returns to avoid exceptions
 */
export type Result<T, E extends string = string> =
  | { ok: true; data: T }
  | { ok: false; error: E }

/**
 * Helper to create success result
 */
export function ok<T>(data: T): Result<T, never> {
  return { ok: true, data }
}

/**
 * Helper to create error result
 */
export function err<E extends string>(error: E): Result<never, E> {
  return { ok: false, error }
}

/**
 * Pagination input schema
 */
export const PaginationInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
})

export type PaginationInput = z.infer<typeof PaginationInputSchema>

/**
 * Paginated result wrapper
 */
export const PaginatedResultSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
      hasMore: z.boolean(),
    }),
  })

export type PaginatedResult<T> = {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

/**
 * Helper to create paginated result
 */
export function paginate<T>(
  items: T[],
  total: number,
  input: PaginationInput
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / input.limit)
  return {
    items,
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages,
      hasMore: input.page < totalPages,
    },
  }
}
