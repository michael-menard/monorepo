/**
 * ChangeSpec Schema — re-exported from artifacts/change-spec.ts
 *
 * This module previously contained a placeholder ChangeSpec schema.
 * As of APIP-1032, it re-exports the authoritative APIP-1020 discriminated union
 * schema from artifacts/change-spec.ts.
 *
 * All consumers should import ChangeSpec and ChangeSpecSchema from here
 * (or directly from ../artifacts/change-spec.ts) — not from the placeholder.
 */

export {
  ChangeSpecSchema,
  ChangeSpecCollectionSchema,
  FileChangeSpecSchema,
  MigrationChangeSpecSchema,
  ConfigChangeSpecSchema,
  TestChangeSpecSchema,
  ChangeComplexitySchema,
  TestStrategySchema,
  createFileChangeSpec,
} from '../artifacts/change-spec.js'

export type {
  ChangeSpec,
  ChangeSpecCollection,
  FileChangeSpec,
  MigrationChangeSpec,
  ConfigChangeSpec,
  TestChangeSpec,
  ChangeComplexity,
  TestStrategy,
} from '../artifacts/change-spec.js'
