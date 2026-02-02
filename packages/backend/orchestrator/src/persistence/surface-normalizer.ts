/**
 * Surface Normalizer
 *
 * Handles bidirectional translation between:
 * - Claude's YAML convention: uses 'infra' (short form)
 * - LangGraph's schema convention: uses 'infrastructure' (full form)
 *
 * This enables backward compatibility with 62+ existing YAML files
 * while allowing LangGraph to use its preferred naming.
 */

import { z } from 'zod'

// ============================================================================
// Surface Type Definitions
// ============================================================================

/**
 * Surface types as used in YAML files (Claude convention)
 */
export const YamlSurfaceTypeSchema = z.enum([
  'frontend',
  'backend',
  'database',
  'infra', // Short form used in YAML files
  'packages',
  'testing',
  'documentation',
  'db', // Alias for database
  'contracts', // Additional type from scope.ts
  'ui', // UI components
])
export type YamlSurfaceType = z.infer<typeof YamlSurfaceTypeSchema>

/**
 * Surface types as used in LangGraph schemas (normalized)
 */
export const NormalizedSurfaceTypeSchema = z.enum([
  'frontend',
  'backend',
  'database',
  'infrastructure', // Full form for LangGraph
  'packages',
  'testing',
  'documentation',
  'contracts',
  'ui',
])
export type NormalizedSurfaceType = z.infer<typeof NormalizedSurfaceTypeSchema>

/**
 * Scope touches object as used in YAML files
 */
export const YamlScopeTouchesSchema = z.object({
  backend: z.boolean().default(false),
  frontend: z.boolean().default(false),
  packages: z.boolean().default(false),
  db: z.boolean().default(false),
  contracts: z.boolean().default(false),
  ui: z.boolean().default(false),
  infra: z.boolean().default(false),
})
export type YamlScopeTouches = z.infer<typeof YamlScopeTouchesSchema>

/**
 * Scope touches object with normalized keys
 */
export const NormalizedScopeTouchesSchema = z.object({
  backend: z.boolean().default(false),
  frontend: z.boolean().default(false),
  packages: z.boolean().default(false),
  database: z.boolean().default(false),
  contracts: z.boolean().default(false),
  ui: z.boolean().default(false),
  infrastructure: z.boolean().default(false),
})
export type NormalizedScopeTouches = z.infer<typeof NormalizedScopeTouchesSchema>

// ============================================================================
// Mapping Constants
// ============================================================================

/**
 * Mapping from YAML surface types to normalized types
 */
const YAML_TO_NORMALIZED: Record<string, NormalizedSurfaceType> = {
  infra: 'infrastructure',
  infrastructure: 'infrastructure',
  db: 'database',
  database: 'database',
  frontend: 'frontend',
  backend: 'backend',
  packages: 'packages',
  testing: 'testing',
  documentation: 'documentation',
  contracts: 'contracts',
  ui: 'ui',
}

/**
 * Mapping from normalized surface types to YAML types
 */
const NORMALIZED_TO_YAML: Record<NormalizedSurfaceType, YamlSurfaceType> = {
  infrastructure: 'infra',
  database: 'db',
  frontend: 'frontend',
  backend: 'backend',
  packages: 'packages',
  testing: 'testing',
  documentation: 'documentation',
  contracts: 'contracts',
  ui: 'ui',
}

// ============================================================================
// Surface Type Normalization
// ============================================================================

/**
 * Normalize a single surface type from YAML convention to LangGraph convention
 */
export function normalizeSurfaceType(surface: string): NormalizedSurfaceType {
  const normalized = YAML_TO_NORMALIZED[surface.toLowerCase()]
  if (!normalized) {
    // If unknown, return as-is if it's a valid normalized type
    const parsed = NormalizedSurfaceTypeSchema.safeParse(surface)
    if (parsed.success) {
      return parsed.data
    }
    throw new Error(`Unknown surface type: ${surface}`)
  }
  return normalized
}

/**
 * Denormalize a single surface type from LangGraph convention to YAML convention
 */
export function denormalizeSurfaceType(surface: NormalizedSurfaceType): YamlSurfaceType {
  return NORMALIZED_TO_YAML[surface]
}

/**
 * Normalize an array of surface types
 */
export function normalizeSurfaces(surfaces: string[]): NormalizedSurfaceType[] {
  return surfaces.map(s => normalizeSurfaceType(s))
}

/**
 * Denormalize an array of surface types
 */
export function denormalizeSurfaces(surfaces: NormalizedSurfaceType[]): YamlSurfaceType[] {
  return surfaces.map(s => denormalizeSurfaceType(s))
}

/**
 * Check if a surface type is the YAML short form
 */
export function isYamlShortForm(surface: string): boolean {
  return surface === 'infra' || surface === 'db'
}

// ============================================================================
// Scope Touches Normalization
// ============================================================================

/**
 * Normalize scope touches from YAML format to LangGraph format
 * Handles: infra → infrastructure, db → database
 */
export function normalizeScopeTouches(touches: YamlScopeTouches): NormalizedScopeTouches {
  return {
    backend: touches.backend,
    frontend: touches.frontend,
    packages: touches.packages,
    database: touches.db,
    contracts: touches.contracts,
    ui: touches.ui,
    infrastructure: touches.infra,
  }
}

/**
 * Denormalize scope touches from LangGraph format to YAML format
 * Handles: infrastructure → infra, database → db
 */
export function denormalizeScopeTouches(touches: NormalizedScopeTouches): YamlScopeTouches {
  return {
    backend: touches.backend,
    frontend: touches.frontend,
    packages: touches.packages,
    db: touches.database,
    contracts: touches.contracts,
    ui: touches.ui,
    infra: touches.infrastructure,
  }
}

// ============================================================================
// Plan Step Slice Normalization
// ============================================================================

/**
 * Plan step slice types from YAML (includes 'infra')
 */
export const YamlPlanSliceSchema = z.enum(['backend', 'frontend', 'packages', 'infra', 'shared'])
export type YamlPlanSlice = z.infer<typeof YamlPlanSliceSchema>

/**
 * Plan step slice types normalized
 */
export const NormalizedPlanSliceSchema = z.enum([
  'backend',
  'frontend',
  'packages',
  'infrastructure',
  'shared',
])
export type NormalizedPlanSlice = z.infer<typeof NormalizedPlanSliceSchema>

/**
 * Normalize a plan step slice
 */
export function normalizePlanSlice(slice: YamlPlanSlice): NormalizedPlanSlice {
  if (slice === 'infra') {
    return 'infrastructure'
  }
  return slice as NormalizedPlanSlice
}

/**
 * Denormalize a plan step slice
 */
export function denormalizePlanSlice(slice: NormalizedPlanSlice): YamlPlanSlice {
  if (slice === 'infrastructure') {
    return 'infra'
  }
  return slice as YamlPlanSlice
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Normalizer configuration schema
 */
export const SurfaceNormalizerConfigSchema = z.object({
  /** Whether to normalize on read (YAML → LangGraph) */
  normalizeOnRead: z.boolean().default(true),
  /** Whether to denormalize on write (LangGraph → YAML) */
  denormalizeOnWrite: z.boolean().default(true),
  /** Throw error on unknown surface type vs. pass through */
  strictMode: z.boolean().default(false),
})
export type SurfaceNormalizerConfig = z.infer<typeof SurfaceNormalizerConfigSchema>

/**
 * Create a surface normalizer with configuration
 */
export function createSurfaceNormalizer(config: Partial<SurfaceNormalizerConfig> = {}) {
  const fullConfig = SurfaceNormalizerConfigSchema.parse(config)

  return {
    config: fullConfig,

    /**
     * Normalize surface type (YAML → LangGraph)
     */
    normalize(surface: string): NormalizedSurfaceType | string {
      if (!fullConfig.normalizeOnRead) {
        return surface
      }
      try {
        return normalizeSurfaceType(surface)
      } catch (error) {
        if (fullConfig.strictMode) {
          throw error
        }
        return surface
      }
    },

    /**
     * Denormalize surface type (LangGraph → YAML)
     */
    denormalize(surface: NormalizedSurfaceType): YamlSurfaceType | string {
      if (!fullConfig.denormalizeOnWrite) {
        return surface
      }
      return denormalizeSurfaceType(surface)
    },

    /**
     * Normalize array of surfaces
     */
    normalizeSurfaces(surfaces: string[]): NormalizedSurfaceType[] {
      if (!fullConfig.normalizeOnRead) {
        return surfaces as NormalizedSurfaceType[]
      }
      return surfaces.map(s => this.normalize(s) as NormalizedSurfaceType)
    },

    /**
     * Denormalize array of surfaces
     */
    denormalizeSurfaces(surfaces: NormalizedSurfaceType[]): YamlSurfaceType[] {
      if (!fullConfig.denormalizeOnWrite) {
        return surfaces as YamlSurfaceType[]
      }
      return surfaces.map(s => this.denormalize(s) as YamlSurfaceType)
    },

    /**
     * Normalize scope touches
     */
    normalizeTouches(touches: YamlScopeTouches): NormalizedScopeTouches {
      if (!fullConfig.normalizeOnRead) {
        return touches as unknown as NormalizedScopeTouches
      }
      return normalizeScopeTouches(touches)
    },

    /**
     * Denormalize scope touches
     */
    denormalizeTouches(touches: NormalizedScopeTouches): YamlScopeTouches {
      if (!fullConfig.denormalizeOnWrite) {
        return touches as unknown as YamlScopeTouches
      }
      return denormalizeScopeTouches(touches)
    },
  }
}

/**
 * Default surface normalizer instance
 */
export const surfaceNormalizer = createSurfaceNormalizer()
