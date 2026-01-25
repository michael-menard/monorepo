/**
 * MOC Parts Lists Core Package
 *
 * Platform-agnostic business logic for MOC parts lists operations.
 */

// ============================================================
// CORE FUNCTIONS
// ============================================================

export { createPartsList } from './create-parts-list.js'
export type {
  CreatePartsListDbClient,
  CreatePartsListSchema,
  CreatePartsListResult,
} from './create-parts-list.js'

export { getPartsLists } from './get-parts-lists.js'
export type {
  GetPartsListsDbClient,
  GetPartsListsSchema,
  GetPartsListsResult,
} from './get-parts-lists.js'

export { updatePartsList } from './update-parts-list.js'
export type {
  UpdatePartsListDbClient,
  UpdatePartsListSchema,
  UpdatePartsListResult,
} from './update-parts-list.js'

export { updatePartsListStatus } from './update-parts-list-status.js'
export type {
  UpdatePartsListStatusDbClient,
  UpdatePartsListStatusSchema,
  UpdatePartsListStatusResult,
} from './update-parts-list-status.js'

export { deletePartsList } from './delete-parts-list.js'
export type {
  DeletePartsListDbClient,
  DeletePartsListSchema,
  DeletePartsListResult,
} from './delete-parts-list.js'

export { parsePartsCsv } from './parse-parts-csv.js'
export type {
  ParsePartsCsvDbClient,
  ParsePartsCsvSchema,
  ParsePartsCsvResult,
} from './parse-parts-csv.js'

export { getUserSummary } from './get-user-summary.js'
export type {
  GetUserSummaryDbClient,
  GetUserSummarySchema,
  GetUserSummaryResult,
} from './get-user-summary.js'

// ============================================================
// TYPES - INPUT SCHEMAS
// ============================================================

export type {
  PartInput,
  CreatePartsListInput,
  UpdatePartsListInput,
  UpdatePartsListStatusInput,
  ParseCsvInput,
  CsvRow,
} from './__types__/index.js'

export {
  PartInputSchema,
  CreatePartsListInputSchema,
  UpdatePartsListInputSchema,
  UpdatePartsListStatusInputSchema,
  ParseCsvInputSchema,
  CsvRowSchema,
} from './__types__/index.js'

// ============================================================
// TYPES - OUTPUT SCHEMAS
// ============================================================

export type {
  Part,
  PartsList,
  PartsListWithParts,
  ParseCsvResult,
  UserSummary,
} from './__types__/index.js'

export {
  PartSchema,
  PartsListSchema,
  PartsListWithPartsSchema,
  ParseCsvResultSchema,
  UserSummarySchema,
} from './__types__/index.js'

// ============================================================
// TYPES - DB ROW SCHEMAS (for adapter use)
// ============================================================

export type { PartRow, PartsListRow, MocInstructionRow } from './__types__/index.js'

export { PartRowSchema, PartsListRowSchema, MocInstructionRowSchema } from './__types__/index.js'
