import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────
// Concept Expansion — structured signals from LLM
// ─────────────────────────────────────────────────────────────────────────

export const ConceptSignalsSchema = z.object({
  colors: z.array(z.string()),
  categories: z.array(z.string()),
  accessoryTypes: z.array(z.string()),
  styleDescriptors: z.array(z.string()),
  relatedThemes: z.array(z.string()),
})

export type ConceptSignals = z.infer<typeof ConceptSignalsSchema>

// ─────────────────────────────────────────────────────────────────────────
// Search & Scoring
// ─────────────────────────────────────────────────────────────────────────

export const PartSourceSchema = z.enum(['collection', 'wishlist', 'external'])
export type PartSource = z.infer<typeof PartSourceSchema>

export const ScoredPartSchema = z.object({
  partNumber: z.string(),
  partName: z.string(),
  color: z.string(),
  category: z.string().nullable(),
  theme: z.string().nullable(),
  imageUrl: z.string().nullable(),
  source: PartSourceSchema,
  score: z.number(),
  matchReasons: z.array(z.string()),
})

export type ScoredPart = z.infer<typeof ScoredPartSchema>

export const SearchResultSchema = z.object({
  collection: z.array(ScoredPartSchema),
  wishlist: z.array(ScoredPartSchema),
  external: z.array(ScoredPartSchema),
  totalResults: z.number(),
})

export type SearchResult = z.infer<typeof SearchResultSchema>

// ─────────────────────────────────────────────────────────────────────────
// Donor Minifig
// ─────────────────────────────────────────────────────────────────────────

export const DonorMinifigSchema = z.object({
  variantId: z.string().uuid(),
  name: z.string(),
  legoNumber: z.string().nullable(),
  theme: z.string().nullable(),
  imageUrl: z.string().nullable(),
  matchingParts: z.number(),
  reason: z.string(),
})

export type DonorMinifig = z.infer<typeof DonorMinifigSchema>

// ─────────────────────────────────────────────────────────────────────────
// Explanation
// ─────────────────────────────────────────────────────────────────────────

export const PartExplanationSchema = z.object({
  partNumber: z.string(),
  color: z.string(),
  explanation: z.string(),
})

export type PartExplanation = z.infer<typeof PartExplanationSchema>

// ─────────────────────────────────────────────────────────────────────────
// Build Projects
// ─────────────────────────────────────────────────────────────────────────

export const BuildProjectSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  name: z.string(),
  concept: z.string(),
  searchSignals: ConceptSignalsSchema.nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type BuildProject = z.infer<typeof BuildProjectSchema>

export const BuildProjectPartSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  partNumber: z.string(),
  color: z.string(),
  quantity: z.number().int().positive(),
  source: PartSourceSchema,
  explanation: z.string().nullable(),
  createdAt: z.date(),
})

export type BuildProjectPart = z.infer<typeof BuildProjectPartSchema>

export const BuildProjectWithPartsSchema = BuildProjectSchema.extend({
  parts: z.array(BuildProjectPartSchema),
})

export type BuildProjectWithParts = z.infer<typeof BuildProjectWithPartsSchema>

// ─────────────────────────────────────────────────────────────────────────
// API Inputs
// ─────────────────────────────────────────────────────────────────────────

export const ExpandConceptInputSchema = z.object({
  concept: z.string().min(1).max(500),
})

export type ExpandConceptInput = z.infer<typeof ExpandConceptInputSchema>

export const SearchPartsInputSchema = z.object({
  signals: ConceptSignalsSchema,
  limit: z.number().int().min(1).max(100).default(20),
})

export type SearchPartsInput = z.infer<typeof SearchPartsInputSchema>

export const ExplainPartsInputSchema = z.object({
  concept: z.string(),
  parts: z.array(
    z.object({
      partNumber: z.string(),
      partName: z.string(),
      color: z.string(),
      category: z.string().nullable(),
      source: PartSourceSchema,
      matchReasons: z.array(z.string()),
    }),
  ),
})

export type ExplainPartsInput = z.infer<typeof ExplainPartsInputSchema>

export const CreateBuildProjectInputSchema = z.object({
  name: z.string().min(1).max(200),
  concept: z.string().min(1),
  searchSignals: ConceptSignalsSchema.optional(),
  parts: z.array(
    z.object({
      partNumber: z.string(),
      color: z.string(),
      quantity: z.number().int().positive().default(1),
      source: PartSourceSchema,
      explanation: z.string().optional(),
    }),
  ),
})

export type CreateBuildProjectInput = z.infer<typeof CreateBuildProjectInputSchema>

// ─────────────────────────────────────────────────────────────────────────
// Scoring Weights (configurable)
// ─────────────────────────────────────────────────────────────────────────

export const ScoringWeightsSchema = z.object({
  colorMatch: z.number().default(0.25),
  categoryMatch: z.number().default(0.3),
  themeMatch: z.number().default(0.15),
  nameMatch: z.number().default(0.15),
  tagMatch: z.number().default(0.05),
  availabilityBonus: z.number().default(0.1),
})

export type ScoringWeights = z.infer<typeof ScoringWeightsSchema>

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  colorMatch: 0.25,
  categoryMatch: 0.3,
  themeMatch: 0.15,
  nameMatch: 0.15,
  tagMatch: 0.05,
  availabilityBonus: 0.1,
}

// ─────────────────────────────────────────────────────────────────────────
// Error Types
// ─────────────────────────────────────────────────────────────────────────

export type RecommenderError =
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'AI_EXPANSION_FAILED'
  | 'AI_EXPLANATION_FAILED'
  | 'SEARCH_FAILED'
  | 'DB_ERROR'
