/**
 * @repo/sets-core
 *
 * Platform-agnostic business logic for LEGO sets gallery.
 * Core functions accept database clients via dependency injection,
 * making them testable and reusable across different runtimes
 * (AWS Lambda, Vercel, Express, etc.).
 *
 * @example
 * ```typescript
 * import { getSetById, listSets } from '@repo/sets-core'
 *
 * // Get a single set
 * const result = await getSetById(db, schema, userId, setId)
 * if (result.success) {
 *   return result.data
 * } else {
 *   // Handle NOT_FOUND or FORBIDDEN
 * }
 *
 * // List sets with filters
 * const response = await listSets(db, schema, userId, {
 *   search: 'Star Wars',
 *   theme: 'Star Wars',
 *   page: 1,
 *   limit: 20,
 * })
 * ```
 */

export { getSetById, type GetSetResult, type GetSetDbClient, type SetsSchema as GetSetSetsSchema } from './get-set.js'
export { listSets, type ListSetsDbClient, type SetsSchema as ListSetsSetsSchema } from './list-sets.js'
export { createSet, type CreateSetResult, type CreateSetDbClient, type CreateSetSetsSchema } from './create-set.js'
export { ListSetsFiltersSchema, type ListSetsFilters } from './__types__/index.js'
