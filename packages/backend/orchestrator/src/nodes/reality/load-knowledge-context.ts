/**
 * FLOW Enhancement: Knowledge Context Loader Node
 *
 * Loads lessons learned and architecture decisions to inform story creation.
 * This ensures past mistakes aren't repeated and architectural consistency is maintained.
 *
 * Knowledge Base Integration:
 * - Queries KB for domain-specific lessons via kb_search
 * - Falls back to hardcoded defaults if KB unavailable
 * - Workflow is NOT blocked by KB failures
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { z } from 'zod'
import { logger } from '@repo/logger'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphStateWithContext } from './retrieve-context.js'

// Optional KB types - imported dynamically to avoid hard dependency
type KbSearchDeps = {
  db: unknown
  embeddingClient: unknown
}

type KbSearchInput = {
  query: string
  tags?: string[]
  role?: string
  limit?: number
}

type KbSearchResult = {
  results: Array<{
    id: string
    content: string
    role: string
    tags: string[] | null
    relevance_score?: number
  }>
  metadata: {
    total: number
    fallback_mode: boolean
  }
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const LessonCategorySchema = z.enum(['blocker', 'pattern', 'time_sink', 'reuse'])
export type LessonCategory = z.infer<typeof LessonCategorySchema>

export const RelevantLessonSchema = z.object({
  storyId: z.string(),
  lesson: z.string(),
  category: LessonCategorySchema,
  appliesBecause: z.string(),
})
export type RelevantLesson = z.infer<typeof RelevantLessonSchema>

export const LessonsLearnedSchema = z.object({
  count: z.number(),
  relevantToScope: z.array(RelevantLessonSchema),
  blockersToAvoid: z.array(z.string()),
  patternsToFollow: z.array(z.string()),
  patternsToAvoid: z.array(z.string()),
})
export type LessonsLearned = z.infer<typeof LessonsLearnedSchema>

export const ADRStatusSchema = z.enum(['active', 'deprecated', 'superseded', 'proposed'])
export type ADRStatus = z.infer<typeof ADRStatusSchema>

export const RelevantADRSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: ADRStatusSchema,
  constraint: z.string(),
  appliesTo: z.array(z.string()),
})
export type RelevantADR = z.infer<typeof RelevantADRSchema>

export const ADRConstraintsSchema = z.object({
  apiPaths: z.string().nullable(),
  infrastructure: z.string().nullable(),
  storage: z.string().nullable(),
  auth: z.string().nullable(),
  testing: z.string().nullable(),
})
export type ADRConstraints = z.infer<typeof ADRConstraintsSchema>

export const ArchitectureDecisionsSchema = z.object({
  activeCount: z.number(),
  relevantAdrs: z.array(RelevantADRSchema),
  constraints: ADRConstraintsSchema,
})
export type ArchitectureDecisions = z.infer<typeof ArchitectureDecisionsSchema>

export const HighCostOperationSchema = z.object({
  operation: z.string(),
  typicalTokens: z.number(),
  mitigation: z.string(),
})
export type HighCostOperation = z.infer<typeof HighCostOperationSchema>

export const TokenOptimizationSchema = z.object({
  highCostOperations: z.array(HighCostOperationSchema),
  recommendedPatterns: z.array(z.string()),
})
export type TokenOptimization = z.infer<typeof TokenOptimizationSchema>

export const KnowledgeContextSchema = z.object({
  loaded: z.boolean(),
  timestamp: z.string(),
  lessonsLearned: LessonsLearnedSchema,
  architectureDecisions: ArchitectureDecisionsSchema,
  tokenOptimization: TokenOptimizationSchema,
  warnings: z.array(z.string()),
})
export type KnowledgeContext = z.infer<typeof KnowledgeContextSchema>

export const KnowledgeContextConfigSchema = z.object({
  adrLogPath: z.string().default('plans/stories/ADR-LOG.md'),
  projectRoot: z.string().optional(),
  storyDomain: z.string().optional(),
  storyScope: z.string().optional(),
  maxLessons: z.number().default(10),
  /** Optional KB dependencies - if not provided, falls back to defaults */
  kbDeps: z
    .object({
      db: z.unknown(),
      embeddingClient: z.unknown(),
      kbSearchFn: z.function().args(z.unknown(), z.unknown()).returns(z.promise(z.unknown())),
    })
    .optional(),
})
export type KnowledgeContextConfig = z.infer<typeof KnowledgeContextConfigSchema>

export const KnowledgeContextResultSchema = z.object({
  storyId: z.string(),
  knowledgeContext: KnowledgeContextSchema.nullable(),
  loaded: z.boolean(),
  error: z.string().nullable(),
})
export type KnowledgeContextResult = z.infer<typeof KnowledgeContextResultSchema>

// ============================================================================
// ADR Parsing
// ============================================================================

interface ParsedADR {
  id: string
  title: string
  status: ADRStatus
  date: string
  context: string
  decision: string
}

/**
 * Parse ADR-LOG.md to extract individual ADRs
 */
export function parseADRLog(content: string): ParsedADR[] {
  const adrs: ParsedADR[] = []

  // Split by ADR headers (## ADR-XXX: Title)
  const adrPattern = /## (ADR-\d+): ([^\n]+)\n/g
  const sections = content.split(adrPattern)

  // Process pairs (id, title, content)
  for (let i = 1; i < sections.length; i += 3) {
    const id = sections[i]
    const title = sections[i + 1]?.trim() || ''
    const sectionContent = sections[i + 2] || ''

    // Extract status
    const statusMatch = sectionContent.match(/\*\*Status\*\*:\s*(\w+)/i)
    const status = (statusMatch?.[1]?.toLowerCase() || 'active') as ADRStatus

    // Extract date
    const dateMatch = sectionContent.match(/\*\*Date\*\*:\s*([^\n]+)/i)
    const date = dateMatch?.[1]?.trim() || ''

    // Extract context
    const contextMatch = sectionContent.match(/\*\*Context\*\*:\s*([^\n]+)/i)
    const context = contextMatch?.[1]?.trim() || ''

    // Extract decision (first paragraph after ### Decision)
    const decisionMatch = sectionContent.match(/### Decision\n\n([^\n]+)/i)
    const decision = decisionMatch?.[1]?.trim() || ''

    if (id) {
      adrs.push({ id, title, status, date, context, decision })
    }
  }

  return adrs
}

/**
 * Filter ADRs to only active ones relevant to the story domain
 */
export function filterRelevantADRs(adrs: ParsedADR[], storyDomain?: string): RelevantADR[] {
  const domainMappings: Record<string, string[]> = {
    'ADR-001': ['api', 'backend', 'frontend', 'wishlist', 'gallery', 'sets', 'mocs'],
    'ADR-002': ['infrastructure', 'backend', 'deployment'],
    'ADR-003': ['images', 'media', 'gallery', 'cdn', 'storage'],
    'ADR-004': ['auth', 'authentication', 'security', 'api'],
    'ADR-005': ['testing', 'uat', 'e2e', 'qa'],
  }

  return adrs
    .filter(adr => adr.status === 'active')
    .map(adr => {
      const appliesTo = domainMappings[adr.id] || ['all']
      const isRelevant =
        !storyDomain ||
        appliesTo.includes('all') ||
        appliesTo.some(d => storyDomain.toLowerCase().includes(d))

      if (!isRelevant) return null

      return {
        id: adr.id,
        title: adr.title,
        status: adr.status,
        constraint: adr.decision || adr.context,
        appliesTo,
      }
    })
    .filter((adr): adr is RelevantADR => adr !== null)
}

/**
 * Extract constraint summary from ADRs
 */
export function extractADRConstraints(adrs: RelevantADR[]): ADRConstraints {
  const constraints: ADRConstraints = {
    apiPaths: null,
    infrastructure: null,
    storage: null,
    auth: null,
    testing: null,
  }

  for (const adr of adrs) {
    switch (adr.id) {
      case 'ADR-001':
        constraints.apiPaths = 'Frontend: /api/v2/{domain}, Backend: /{domain} via proxy'
        break
      case 'ADR-002':
        constraints.infrastructure = adr.constraint
        break
      case 'ADR-003':
        constraints.storage = adr.constraint
        break
      case 'ADR-004':
        constraints.auth = adr.constraint
        break
      case 'ADR-005':
        constraints.testing = 'UAT must use real services, not mocks'
        break
    }
  }

  return constraints
}

// ============================================================================
// Token Optimization Knowledge
// ============================================================================

/**
 * Get known high-cost operations
 */
export function getHighCostOperations(): HighCostOperation[] {
  return [
    {
      operation: 'Read serverless.yml (70KB)',
      typicalTokens: 17500,
      mitigation: 'Extract relevant section only',
    },
    {
      operation: 'Full codebase Explore',
      typicalTokens: 25000,
      mitigation: 'Use targeted Grep instead',
    },
    {
      operation: 'Reading all story docs',
      typicalTokens: 10000,
      mitigation: 'Cache in conversation',
    },
    {
      operation: 'code-reviewer agent',
      typicalTokens: 30000,
      mitigation: 'Review smaller changesets',
    },
  ]
}

/**
 * Get recommended token optimization patterns
 */
export function getOptimizationPatterns(): string[] {
  return [
    'Targeted file reads - Read specific line ranges instead of full files',
    'Grep before Read - Find relevant files first, then read only those',
    'Batch related operations - Multiple edits in fewer conversation turns',
    'Reference by line number - Instead of re-reading, cite "lines 45-60"',
    "Skip redundant context - Don't re-read files already in conversation",
  ]
}

// ============================================================================
// Knowledge Base Integration
// ============================================================================

/**
 * Map KB tags to LessonCategory enum
 */
function mapTagsToCategory(tags: string[] | null): LessonCategory {
  if (!tags) return 'pattern'

  const tagSet = new Set(tags.map(t => t.toLowerCase()))

  if (
    tagSet.has('blocker') ||
    tagSet.has('category:blocker') ||
    tagSet.has('category:blockers-hit')
  ) {
    return 'blocker'
  }
  if (
    tagSet.has('time-sink') ||
    tagSet.has('category:time-sinks') ||
    tagSet.has('category:time-sink')
  ) {
    return 'time_sink'
  }
  if (
    tagSet.has('reuse') ||
    tagSet.has('category:reuse') ||
    tagSet.has('category:reuse-discoveries')
  ) {
    return 'reuse'
  }
  return 'pattern'
}

/**
 * Extract story ID from KB entry content or tags
 */
function extractStoryId(content: string, tags: string[] | null): string {
  // Try to extract from content header like "**[WISH-001] ...**"
  const headerMatch = content.match(/\*\*\[([A-Z]+-\d+)\]/)
  if (headerMatch) return headerMatch[1]

  // Try to extract from tags like "story:wish-001"
  if (tags) {
    const storyTag = tags.find(t => t.toLowerCase().startsWith('story:'))
    if (storyTag) {
      return storyTag.replace(/^story:/i, '').toUpperCase()
    }
  }

  return 'UNKNOWN'
}

/**
 * Query Knowledge Base for lessons learned
 *
 * @param storyDomain - Domain/area of the story (e.g., "wishlist", "api")
 * @param kbSearchFn - The kb_search function
 * @param kbDeps - KB dependencies (db, embeddingClient)
 * @param maxLessons - Maximum lessons to fetch
 * @returns LessonsLearned structure populated from KB
 */
export async function getLessonsFromKB(
  storyDomain: string | undefined,
  kbSearchFn: (input: KbSearchInput, deps: KbSearchDeps) => Promise<KbSearchResult>,
  kbDeps: KbSearchDeps,
  maxLessons: number = 10,
): Promise<LessonsLearned> {
  const lessons: LessonsLearned = {
    count: 0,
    relevantToScope: [],
    blockersToAvoid: [],
    patternsToFollow: [],
    patternsToAvoid: [],
  }

  try {
    // Query 1: Domain-specific lessons
    const domainQuery = storyDomain
      ? `${storyDomain} implementation lessons learned`
      : 'implementation lessons learned'

    const domainResults = await kbSearchFn(
      {
        query: domainQuery,
        tags: ['lesson-learned'],
        limit: maxLessons,
      },
      kbDeps,
    )

    // Query 2: Blockers to avoid
    const blockerQuery = storyDomain
      ? `${storyDomain} blocker failure error`
      : 'blocker failure error implementation'

    const blockerResults = await kbSearchFn(
      {
        query: blockerQuery,
        tags: ['lesson-learned'],
        limit: 5,
      },
      kbDeps,
    )

    // Process domain-specific lessons
    for (const entry of domainResults.results) {
      const category = mapTagsToCategory(entry.tags)
      const storyId = extractStoryId(entry.content, entry.tags)

      // Extract the main lesson text (first substantive line after header)
      const contentLines = entry.content.split('\n').filter(l => l.trim() && !l.startsWith('**['))
      const lessonText =
        contentLines[0]?.replace(/^[-*]\s*/, '').trim() || entry.content.slice(0, 200)

      // Create why this applies
      const appliesBecause = storyDomain
        ? `Domain "${storyDomain}" matches lesson context`
        : 'General implementation guidance'

      lessons.relevantToScope.push({
        storyId,
        lesson: lessonText,
        category,
        appliesBecause,
      })
      lessons.count++

      // Also categorize into specific lists
      if (category === 'blocker') {
        lessons.blockersToAvoid.push(lessonText)
      } else if (category === 'pattern') {
        // Check if it's a positive or negative pattern
        if (
          entry.content.toLowerCase().includes('avoid') ||
          entry.content.toLowerCase().includes("don't")
        ) {
          lessons.patternsToAvoid.push(lessonText)
        } else {
          lessons.patternsToFollow.push(lessonText)
        }
      }
    }

    // Process blocker-specific results (avoid duplicates)
    const existingBlockers = new Set(lessons.blockersToAvoid)
    for (const entry of blockerResults.results) {
      const contentLines = entry.content.split('\n').filter(l => l.trim() && !l.startsWith('**['))
      const blockerText =
        contentLines[0]?.replace(/^[-*]\s*/, '').trim() || entry.content.slice(0, 200)

      if (!existingBlockers.has(blockerText)) {
        lessons.blockersToAvoid.push(blockerText)
        existingBlockers.add(blockerText)
      }
    }

    logger.info('Loaded lessons from Knowledge Base', {
      domain: storyDomain,
      totalLessons: lessons.count,
      blockers: lessons.blockersToAvoid.length,
      patternsToFollow: lessons.patternsToFollow.length,
      patternsToAvoid: lessons.patternsToAvoid.length,
      fallbackMode: domainResults.metadata.fallback_mode,
    })

    return lessons
  } catch (error) {
    logger.warn('Failed to load lessons from KB, using defaults', {
      error: error instanceof Error ? error.message : String(error),
      domain: storyDomain,
    })

    // Return empty structure - caller will use defaults
    return lessons
  }
}

// ============================================================================
// Lessons Learned Fallback Defaults
// ============================================================================

/**
 * Get default lessons learned structure
 * Used as fallback when KB is unavailable
 */
export function getDefaultLessonsLearned(storyDomain?: string): LessonsLearned {
  const lessons: LessonsLearned = {
    count: 0,
    relevantToScope: [],
    blockersToAvoid: [
      'API path mismatch between frontend (RTK Query) and backend (Hono routes)',
      'Missing MSW handlers for E2E test isolation',
      'Reading large config files when only one section needed',
    ],
    patternsToFollow: [
      'Use discriminated union result types: { success: true, data } | { success: false, error }',
      'Use dependency injection pattern for core functions (GetDbClient interfaces)',
      'Use ON CONFLICT DO UPDATE for idempotent seed operations',
    ],
    patternsToAvoid: [
      'Reading full serverless.yml when only one resource needed',
      'Multiple agents reading the same story file',
      'Explore agent for simple file searches',
      'Re-reading implementation plan in every sub-agent',
    ],
  }

  // Add domain-specific lessons
  if (
    storyDomain?.toLowerCase().includes('api') ||
    storyDomain?.toLowerCase().includes('wishlist')
  ) {
    lessons.relevantToScope.push({
      storyId: 'WISH-2004',
      lesson: 'API path mismatch between frontend RTK Query and backend Hono routes caused 404s',
      category: 'blocker',
      appliesBecause: 'Story involves API endpoint work',
    })
    lessons.count++
  }

  return lessons
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Load knowledge context including lessons learned and ADRs
 */
export async function loadKnowledgeContext(
  storyId: string,
  config: Partial<KnowledgeContextConfig> = {},
): Promise<KnowledgeContextResult> {
  const fullConfig = KnowledgeContextConfigSchema.parse(config)
  const warnings: string[] = []

  try {
    // Load ADR-LOG.md
    let adrs: ParsedADR[] = []
    try {
      const adrPath = fullConfig.projectRoot
        ? path.join(fullConfig.projectRoot, fullConfig.adrLogPath)
        : fullConfig.adrLogPath

      const adrContent = await fs.readFile(adrPath, 'utf-8')
      adrs = parseADRLog(adrContent)
    } catch {
      warnings.push('ADR-LOG.md not found or unreadable')
    }

    // Filter relevant ADRs
    const relevantAdrs = filterRelevantADRs(adrs, fullConfig.storyDomain)
    const constraints = extractADRConstraints(relevantAdrs)

    // Get lessons learned - try KB first, fall back to defaults
    let lessonsLearned: LessonsLearned

    if (
      fullConfig.kbDeps?.kbSearchFn &&
      fullConfig.kbDeps?.db &&
      fullConfig.kbDeps?.embeddingClient
    ) {
      // KB dependencies available - try to load from KB
      const kbLessons = await getLessonsFromKB(
        fullConfig.storyDomain,
        fullConfig.kbDeps.kbSearchFn as (
          input: KbSearchInput,
          deps: KbSearchDeps,
        ) => Promise<KbSearchResult>,
        {
          db: fullConfig.kbDeps.db,
          embeddingClient: fullConfig.kbDeps.embeddingClient,
        },
        fullConfig.maxLessons,
      )

      // If KB returned results, use them; otherwise fall back to defaults
      if (kbLessons.count > 0) {
        lessonsLearned = kbLessons
      } else {
        lessonsLearned = getDefaultLessonsLearned(fullConfig.storyDomain)
        warnings.push('KB returned no lessons, using defaults')
      }
    } else {
      // No KB dependencies - use defaults (silent fallback)
      lessonsLearned = getDefaultLessonsLearned(fullConfig.storyDomain)
    }

    // Get token optimization context
    const tokenOptimization: TokenOptimization = {
      highCostOperations: getHighCostOperations(),
      recommendedPatterns: getOptimizationPatterns(),
    }

    const knowledgeContext: KnowledgeContext = {
      loaded: true,
      timestamp: new Date().toISOString(),
      lessonsLearned,
      architectureDecisions: {
        activeCount: relevantAdrs.length,
        relevantAdrs,
        constraints,
      },
      tokenOptimization,
      warnings,
    }

    return {
      storyId,
      knowledgeContext,
      loaded: true,
      error: null,
    }
  } catch (error) {
    return {
      storyId,
      knowledgeContext: null,
      loaded: false,
      error: error instanceof Error ? error.message : 'Unknown error loading knowledge context',
    }
  }
}

// ============================================================================
// LangGraph Node
// ============================================================================

/**
 * LangGraph node for loading knowledge context
 */
export const loadKnowledgeContextNode = createToolNode(
  'load-knowledge-context',
  async (state: GraphStateWithContext): Promise<Partial<GraphStateWithKnowledge>> => {
    // Extract domain from story scope if available
    const storyDomain = state.storyScope?.domain
    const projectRoot = process.env.PROJECT_ROOT || process.cwd()

    const result = await loadKnowledgeContext(state.storyId || 'unknown', {
      storyDomain,
      projectRoot,
    })

    return {
      knowledgeContext: result.knowledgeContext,
      knowledgeContextLoaded: result.loaded,
      knowledgeContextError: result.error,
    } as Partial<GraphStateWithKnowledge>
  },
)

/**
 * Factory for creating knowledge context loader with config
 */
export function createKnowledgeContextNode(config: Partial<KnowledgeContextConfig> = {}) {
  return createToolNode(
    'load-knowledge-context',
    async (state: GraphStateWithContext): Promise<Partial<GraphStateWithKnowledge>> => {
      // Extract domain from story scope if available
      const storyDomain = state.storyScope?.domain || config.storyDomain
      const projectRoot = process.env.PROJECT_ROOT || config.projectRoot || process.cwd()

      const result = await loadKnowledgeContext(state.storyId || 'unknown', {
        ...config,
        storyDomain,
        projectRoot,
      })

      return {
        knowledgeContext: result.knowledgeContext,
        knowledgeContextLoaded: result.loaded,
        knowledgeContextError: result.error,
      } as Partial<GraphStateWithKnowledge>
    },
  )
}

// ============================================================================
// Extended State Interface
// ============================================================================

export interface GraphStateWithKnowledge extends GraphStateWithContext {
  knowledgeContext: KnowledgeContext | null
  knowledgeContextLoaded: boolean
  knowledgeContextError: string | null
}
