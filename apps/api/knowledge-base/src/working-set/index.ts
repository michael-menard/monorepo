/**
 * Working Set Module (KBMEM-007, KBMEM-008)
 *
 * Exports for working-set.md template generation, parsing, and sync.
 *
 * @see plans/future/kb-memory-architecture/PLAN.md
 */

export {
  // Schemas
  ConstraintSchema,
  ActionItemSchema,
  BlockerSchema,
  KbReferenceSchema,
  WorkingSetConfigSchema,
  // Types
  type Constraint,
  type ActionItem,
  type Blocker,
  type KbReference,
  type WorkingSetConfig,
  // Functions
  mergeConstraints,
  generateWorkingSetMd,
  parseWorkingSetMd,
} from './generator.js'

export {
  // Sync schemas
  KbSyncWorkingSetInputSchema,
  // Sync types
  type KbSyncWorkingSetInput,
  type SyncResult,
  // Sync functions
  kb_sync_working_set,
  // Archive schemas (KBMEM-021)
  KbArchiveWorkingSetInputSchema,
  DEFAULT_ARCHIVE_PATH,
  // Archive types
  type KbArchiveWorkingSetInput,
  type ArchiveWorkingSetResult,
  // Archive functions
  kb_archive_working_set,
  generateArchiveHeader,
} from './sync.js'

export {
  // Fallback schemas (KBMEM-011)
  KbGenerateWorkingSetInputSchema,
  // Fallback types
  type KbGenerateWorkingSetInput,
  type GenerateWorkingSetResult,
  type FallbackGeneratorDeps,
  // Fallback functions
  kb_generate_working_set,
} from './fallback.js'

export {
  // Constraint inheritance schemas (KBMEM-016)
  KbInheritConstraintsInputSchema,
  ConflictSchema,
  // Constraint inheritance types
  type KbInheritConstraintsInput,
  type Conflict,
  type InheritConstraintsResult,
  type ConstraintInheritanceDeps,
  // Constraint inheritance functions
  kb_inherit_constraints,
  detectEpicId,
  detectConflict,
} from './constraint-inheritance.js'
