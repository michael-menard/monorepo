/**
 * CRUD Operations for Knowledge Base
 *
 * This module exports the five core CRUD operations:
 * - kb_add: Add new knowledge entry with automatic embedding generation
 * - kb_get: Retrieve knowledge entry by ID
 * - kb_update: Update existing knowledge entry with conditional re-embedding
 * - kb_delete: Delete knowledge entry (idempotent)
 * - kb_list: List knowledge entries with filtering by role, tags, and pagination
 *
 * @see KNOW-003 for implementation details and acceptance criteria
 *
 * @example
 * ```typescript
 * import {
 *   kb_add,
 *   kb_get,
 *   kb_update,
 *   kb_delete,
 *   kb_list,
 *   NotFoundError,
 *   isNotFoundError,
 * } from '@repo/knowledge-base/crud-operations'
 * ```
 */

// Operations
export { kb_add, type KbAddDeps } from './kb-add.js'
export { kb_get, type KbGetDeps } from './kb-get.js'
export { kb_update, type KbUpdateDeps } from './kb-update.js'
export { kb_delete, type KbDeleteDeps } from './kb-delete.js'
export { kb_list, type KbListDeps } from './kb-list.js'

// Error classes
export { NotFoundError, isNotFoundError } from './errors.js'

// Input schemas and types
export {
  KbAddInputSchema,
  KbGetInputSchema,
  KbUpdateInputSchema,
  KbDeleteInputSchema,
  KbListInputSchema,
  MAX_CONTENT_LENGTH,
  type KbAddInput,
  type KbGetInput,
  type KbUpdateInput,
  type KbDeleteInput,
  type KbListInput,
} from './schemas.js'
