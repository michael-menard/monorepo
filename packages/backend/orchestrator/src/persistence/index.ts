/**
 * YAML Artifact Persistence
 *
 * Bidirectional sync between Claude's filesystem-based YAML artifacts
 * and LangGraph's PostgreSQL-based persistence.
 *
 * Components:
 * - SurfaceNormalizer: Handles infra ↔ infrastructure translation
 * - PathResolver: Resolves file paths for YAML artifacts
 * - YamlArtifactReader: Reads and validates YAML files
 * - YamlArtifactWriter: Writes YAML files atomically
 * - YamlArtifactBridge: Orchestrates bidirectional sync
 */

// Surface Normalizer
export {
  // Schemas
  YamlSurfaceTypeSchema,
  NormalizedSurfaceTypeSchema,
  YamlScopeTouchesSchema,
  NormalizedScopeTouchesSchema,
  YamlPlanSliceSchema,
  NormalizedPlanSliceSchema,
  SurfaceNormalizerConfigSchema,
  // Functions
  normalizeSurfaceType,
  denormalizeSurfaceType,
  normalizeSurfaces,
  denormalizeSurfaces,
  isYamlShortForm,
  normalizeScopeTouches,
  denormalizeScopeTouches,
  normalizePlanSlice,
  denormalizePlanSlice,
  createSurfaceNormalizer,
  surfaceNormalizer,
  // Types
  type YamlSurfaceType,
  type NormalizedSurfaceType,
  type YamlScopeTouches,
  type NormalizedScopeTouches,
  type YamlPlanSlice,
  type NormalizedPlanSlice,
  type SurfaceNormalizerConfig,
} from './surface-normalizer.js'

// Path Resolver
export {
  // Schemas
  StoryStageSchema,
  YamlArtifactTypeSchema,
  ResolvedPathSchema,
  PathResolverConfigSchema,
  // Class
  PathResolver,
  // Functions
  createPathResolver,
  inferFeatureFromStoryId,
  isValidStoryId,
  normalizeStage,
  // Types
  type StoryStage,
  type YamlArtifactType,
  type ResolvedPath,
  type PathResolverConfig,
} from './path-resolver.js'

// YAML Artifact Reader
export {
  // Schemas
  ClaudeStoryYamlSchema,
  ClaudeElaborationYamlSchema,
  ClaudePlanYamlSchema,
  ClaudeVerificationYamlSchema,
  ClaudeContextYamlSchema,
  YamlReaderConfigSchema,
  // Class
  YamlArtifactReader,
  // Functions
  createYamlArtifactReader,
  // Types
  type ClaudeStoryYaml,
  type ClaudeElaborationYaml,
  type ClaudePlanYaml,
  type ClaudeVerificationYaml,
  type ClaudeContextYaml,
  type YamlReaderConfig,
  type YamlReadResult,
  type StoryArtifactsReadResult,
} from './yaml-artifact-reader.js'

// YAML Artifact Writer
export {
  // Schemas
  YamlWriterConfigSchema,
  // Class
  YamlArtifactWriter,
  // Functions
  createYamlArtifactWriter,
  // Types
  type YamlWriterConfig,
  type YamlWriteResult,
} from './yaml-artifact-writer.js'

// YAML Artifact Bridge
export {
  // Schemas
  SyncDirectionSchema,
  ConflictStrategySchema,
  YamlArtifactBridgeConfigSchema,
  // Class
  YamlArtifactBridge,
  // Functions
  createYamlArtifactBridge,
  // Types
  type SyncDirection,
  type ConflictStrategy,
  type YamlArtifactBridgeConfig,
  type ArtifactSyncResult,
  type StorySyncResult,
  type BridgeLoadResult,
} from './yaml-artifact-bridge.js'
