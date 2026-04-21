import type { Result } from '@repo/api-core'
import { ok, err } from '@repo/api-core'
import { logger } from '@repo/logger'
import type {
  AIProvider,
  PartsSearchProvider,
  BuildProjectRepository,
  SearchablePart,
} from '../ports/index.js'
import type {
  ConceptSignals,
  ScoredPart,
  SearchResult,
  PartExplanation,
  BuildProject,
  BuildProjectWithParts,
  CreateBuildProjectInput,
  ScoringWeights,
  DonorMinifig,
  RecommenderError,
} from '../types.js'
import { DEFAULT_SCORING_WEIGHTS } from '../types.js'

// ─────────────────────────────────────────────────────────────────────────
// Dependencies
// ─────────────────────────────────────────────────────────────────────────

export interface RecommenderServiceDeps {
  aiProvider: AIProvider
  partsSearch: PartsSearchProvider
  projectRepo: BuildProjectRepository
}

// ─────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────

export function createRecommenderService(deps: RecommenderServiceDeps) {
  const { aiProvider, partsSearch, projectRepo } = deps

  return {
    // ─────────────────────────────────────────────────────────────────────
    // Concept Expansion
    // ─────────────────────────────────────────────────────────────────────

    async expandConcept(concept: string): Promise<Result<ConceptSignals, RecommenderError>> {
      const result = await aiProvider.expandConcept(concept)
      if (!result.ok) {
        logger.error(`[recommender] Concept expansion failed for: "${concept}"`)
        return err('AI_EXPANSION_FAILED')
      }
      return ok(result.data)
    },

    // ─────────────────────────────────────────────────────────────────────
    // Search & Score
    // ─────────────────────────────────────────────────────────────────────

    async searchParts(
      userId: string,
      signals: ConceptSignals,
      limit = 20,
      weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
    ): Promise<Result<SearchResult, RecommenderError>> {
      try {
        const [collectionParts, wishlistParts, externalParts] = await Promise.all([
          partsSearch.searchCollection(userId, signals),
          partsSearch.searchWishlist(userId, signals),
          partsSearch.searchExternal(userId, signals),
        ])

        const scoredCollection = scoreParts(collectionParts, signals, weights)
        const scoredWishlist = scoreParts(wishlistParts, signals, weights)
        const scoredExternal = scoreParts(externalParts, signals, weights)

        return ok({
          collection: scoredCollection.slice(0, limit),
          wishlist: scoredWishlist.slice(0, limit),
          external: scoredExternal.slice(0, limit),
          totalResults: scoredCollection.length + scoredWishlist.length + scoredExternal.length,
        })
      } catch (error) {
        logger.error('[recommender] Search failed:', error)
        return err('SEARCH_FAILED')
      }
    },

    // ─────────────────────────────────────────────────────────────────────
    // Donor Minifigs
    // ─────────────────────────────────────────────────────────────────────

    async findDonorMinifigs(
      userId: string,
      signals: ConceptSignals,
    ): Promise<Result<DonorMinifig[], RecommenderError>> {
      try {
        const donors = await partsSearch.findDonorMinifigs(userId, signals)
        return ok(donors)
      } catch (error) {
        logger.error('[recommender] Donor minifig search failed:', error)
        return err('SEARCH_FAILED')
      }
    },

    // ─────────────────────────────────────────────────────────────────────
    // Explanations
    // ─────────────────────────────────────────────────────────────────────

    async explainParts(
      concept: string,
      parts: Array<{
        partNumber: string
        partName: string
        color: string
        category: string | null
        source: string
        matchReasons: string[]
      }>,
    ): Promise<Result<PartExplanation[], RecommenderError>> {
      const result = await aiProvider.explainParts(concept, parts)
      if (!result.ok) {
        logger.error(`[recommender] Explanation generation failed for: "${concept}"`)
        return err('AI_EXPLANATION_FAILED')
      }
      return ok(result.data)
    },

    // ─────────────────────────────────────────────────────────────────────
    // Build Projects
    // ─────────────────────────────────────────────────────────────────────

    async createProject(
      userId: string,
      input: CreateBuildProjectInput,
    ): Promise<Result<BuildProjectWithParts, RecommenderError>> {
      try {
        const project = await projectRepo.insert(userId, input)
        return ok(project)
      } catch (error) {
        logger.error('[recommender] Failed to create build project:', error)
        return err('DB_ERROR')
      }
    },

    async listProjects(userId: string): Promise<Result<BuildProject[], RecommenderError>> {
      try {
        const projects = await projectRepo.findByUserId(userId)
        return ok(projects)
      } catch (error) {
        logger.error('[recommender] Failed to list build projects:', error)
        return err('DB_ERROR')
      }
    },

    async getProject(id: string): Promise<Result<BuildProjectWithParts, RecommenderError>> {
      return projectRepo.findById(id)
    },

    async deleteProject(id: string): Promise<Result<void, RecommenderError>> {
      return projectRepo.delete(id)
    },
  }
}

export type RecommenderService = ReturnType<typeof createRecommenderService>

// ─────────────────────────────────────────────────────────────────────────
// Scoring Logic (pure, deterministic, testable)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Score and rank parts based on how well they match the concept signals.
 * Scoring is deterministic: same input always produces the same ranking.
 */
export function scoreParts(
  parts: SearchablePart[],
  signals: ConceptSignals,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
): ScoredPart[] {
  const scored = parts.map(part => {
    const { score, reasons } = computeScore(part, signals, weights)
    return {
      partNumber: part.partNumber,
      partName: part.partName,
      color: part.color,
      category: part.category,
      theme: part.theme,
      imageUrl: part.imageUrl,
      source: part.source,
      score,
      matchReasons: reasons,
    }
  })

  // Sort by score descending, then by part name for stability
  scored.sort((a, b) => b.score - a.score || a.partName.localeCompare(b.partName))

  return scored
}

/**
 * Compute a composite score for a single part against concept signals.
 * Returns the score and the reasons that contributed to it.
 */
export function computeScore(
  part: SearchablePart,
  signals: ConceptSignals,
  weights: ScoringWeights,
): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  // Color match
  const colorScore = matchStrings(part.color, signals.colors)
  if (colorScore > 0) {
    score += colorScore * weights.colorMatch
    reasons.push(`color: ${part.color}`)
  }

  // Category match
  const categoryScore = matchStrings(part.category ?? '', signals.categories)
  if (categoryScore > 0) {
    score += categoryScore * weights.categoryMatch
    reasons.push(`category: ${part.category}`)
  }

  // Theme match
  const themeScore = matchStrings(part.theme ?? '', signals.relatedThemes)
  if (themeScore > 0) {
    score += themeScore * weights.themeMatch
    reasons.push(`theme: ${part.theme}`)
  }

  // Name/description match (against categories + style descriptors + accessory types)
  const nameSignals = [
    ...signals.categories,
    ...signals.styleDescriptors,
    ...signals.accessoryTypes,
  ]
  const nameScore = matchStrings(part.partName, nameSignals)
  if (nameScore > 0) {
    score += nameScore * weights.nameMatch
    reasons.push(`name match`)
  }

  // Tag match
  if (part.tags.length > 0) {
    const allSignalWords = [
      ...signals.colors,
      ...signals.categories,
      ...signals.styleDescriptors,
      ...signals.accessoryTypes,
      ...signals.relatedThemes,
    ]
    const tagScore = matchStrings(part.tags.join(' '), allSignalWords)
    if (tagScore > 0) {
      score += tagScore * weights.tagMatch
      reasons.push(`tag match`)
    }
  }

  // Availability bonus (owned > wishlist > external)
  if (part.source === 'collection') {
    score += weights.availabilityBonus
    reasons.push('owned')
  } else if (part.source === 'wishlist') {
    score += weights.availabilityBonus * 0.5
  }

  return { score, reasons }
}

/**
 * Check how well a text matches against a list of signal strings.
 * Returns a score between 0 and 1.
 */
function matchStrings(text: string, signals: string[]): number {
  if (!text || signals.length === 0) return 0

  const lower = text.toLowerCase()
  let matches = 0

  for (const signal of signals) {
    if (lower.includes(signal.toLowerCase())) {
      matches++
    }
  }

  return matches / signals.length
}
