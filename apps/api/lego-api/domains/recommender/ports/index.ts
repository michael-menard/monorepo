import type { Result } from '@repo/api-core'
import type {
  ConceptSignals,
  ScoredPart,
  PartExplanation,
  BuildProject,
  BuildProjectWithParts,
  CreateBuildProjectInput,
  DonorMinifig,
} from '../types.js'

// ─────────────────────────────────────────────────────────────────────────
// AI Provider — stub interface for any model backend
// ─────────────────────────────────────────────────────────────────────────

/**
 * AI provider interface for the recommender.
 * Implementations can use Ollama, OpenAI, Claude, or any other LLM.
 * The provider handles two tasks:
 * 1. Concept expansion: turn a freeform concept into structured search signals
 * 2. Explanation generation: explain why parts were recommended
 */
export interface AIProvider {
  /**
   * Expand a freeform concept into structured search signals.
   * Example: "fire mage" → { colors: ["dark red", "orange"], categories: ["headgear", "cape"], ... }
   */
  expandConcept(concept: string): Promise<Result<ConceptSignals, 'AI_EXPANSION_FAILED'>>

  /**
   * Generate human-friendly explanations for recommended parts.
   * The explanations must reference real attributes of each part (grounding).
   */
  explainParts(
    concept: string,
    parts: Array<{
      partNumber: string
      partName: string
      color: string
      category: string | null
      source: string
      matchReasons: string[]
    }>,
  ): Promise<Result<PartExplanation[], 'AI_EXPLANATION_FAILED'>>
}

// ─────────────────────────────────────────────────────────────────────────
// Parts Search — queries parts across collection, wishlist, external
// ─────────────────────────────────────────────────────────────────────────

/**
 * Searchable part record — normalized across all sources.
 */
export interface SearchablePart {
  partNumber: string
  partName: string
  color: string
  category: string | null
  theme: string | null
  tags: string[]
  imageUrl: string | null
  source: 'collection' | 'wishlist' | 'external'
}

/**
 * Searches for parts matching concept signals across the user's data.
 */
export interface PartsSearchProvider {
  /**
   * Search the user's owned/available parts collection.
   */
  searchCollection(userId: string, signals: ConceptSignals): Promise<SearchablePart[]>

  /**
   * Search the user's wishlist (wanted sets/minifigs and their parts).
   */
  searchWishlist(userId: string, signals: ConceptSignals): Promise<SearchablePart[]>

  /**
   * Search external parts not owned by the user.
   * Sources may include local DB, Rebrickable, etc.
   */
  searchExternal(userId: string, signals: ConceptSignals): Promise<SearchablePart[]>

  /**
   * Find minifig variants whose parts match the concept signals.
   * Returns donor minifig suggestions.
   */
  findDonorMinifigs(userId: string, signals: ConceptSignals): Promise<DonorMinifig[]>
}

// ─────────────────────────────────────────────────────────────────────────
// Build Project Repository
// ─────────────────────────────────────────────────────────────────────────

export interface BuildProjectRepository {
  findById(id: string): Promise<Result<BuildProjectWithParts, 'NOT_FOUND'>>

  findByUserId(userId: string): Promise<BuildProject[]>

  insert(userId: string, input: CreateBuildProjectInput): Promise<BuildProjectWithParts>

  delete(id: string): Promise<Result<void, 'NOT_FOUND'>>
}
