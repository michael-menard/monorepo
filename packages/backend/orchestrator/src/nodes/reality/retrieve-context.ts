/**
 * Retrieve Context Node
 *
 * Retrieves relevant codebase context based on story scope and reality baseline.
 * Uses baseline reality data to determine which files and patterns are relevant
 * for a given story's scope.
 *
 * FLOW-022: LangGraph Reality Intake Node - Context Retrieval
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { z } from 'zod'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'
import type { BaselineReality, GraphStateWithBaseline } from './load-baseline.js'

/**
 * Schema for a scope pattern that defines what context to retrieve.
 */
export const ScopePatternSchema = z.object({
  /** Type of pattern: glob, path, or keyword */
  type: z.enum(['glob', 'path', 'keyword']),
  /** The pattern value (e.g., "packages/backend/**", "src/utils/auth.ts", "authentication") */
  value: z.string().min(1),
  /** Optional reason for including this pattern */
  reason: z.string().optional(),
})

export type ScopePattern = z.infer<typeof ScopePatternSchema>

/**
 * Schema for story scope that defines what context is relevant.
 */
export const StoryScopeSchema = z.object({
  /** Story identifier */
  storyId: z.string().min(1),
  /** Primary domain/area of the story */
  domain: z.string().min(1),
  /** Patterns for files to include in context */
  includePatterns: z.array(ScopePatternSchema).default([]),
  /** Patterns for files to exclude from context */
  excludePatterns: z.array(ScopePatternSchema).default([]),
  /** Keywords that indicate relevance */
  keywords: z.array(z.string()).default([]),
  /** Maximum depth for directory traversal */
  maxDepth: z.number().int().positive().default(5),
})

export type StoryScope = z.infer<typeof StoryScopeSchema>

/**
 * Schema for a retrieved file context.
 */
export const FileContextSchema = z.object({
  /** Absolute path to the file */
  filePath: z.string().min(1),
  /** Relative path from project root */
  relativePath: z.string().min(1),
  /** Whether the file content was read */
  contentLoaded: z.boolean(),
  /** File content (if loaded, may be truncated) */
  content: z.string().optional(),
  /** File size in bytes */
  size: z.number().int().nonnegative().optional(),
  /** Why this file was included */
  relevanceReason: z.string().optional(),
  /** Whether content was truncated */
  truncated: z.boolean().default(false),
})

export type FileContext = z.infer<typeof FileContextSchema>

/**
 * Schema for the complete retrieved context.
 */
export const RetrievedContextSchema = z.object({
  /** Story ID this context is for */
  storyId: z.string().min(1),
  /** Timestamp of context retrieval */
  retrievedAt: z.string().datetime(),
  /** Files included in context */
  files: z.array(FileContextSchema),
  /** Summary of what exists (from baseline) */
  baselineSummary: z
    .object({
      /** Items that exist in the codebase */
      whatExists: z.array(z.string()).default([]),
      /** Items currently in progress */
      whatInProgress: z.array(z.string()).default([]),
      /** Items that should not be modified */
      noRework: z.array(z.string()).default([]),
    })
    .optional(),
  /** Total number of files found */
  totalFilesFound: z.number().int().nonnegative(),
  /** Number of files actually loaded */
  filesLoaded: z.number().int().nonnegative(),
  /** Errors encountered during retrieval */
  retrievalErrors: z.array(z.string()).default([]),
})

export type RetrievedContext = z.infer<typeof RetrievedContextSchema>

/**
 * Schema for context retrieval configuration.
 */
export const RetrieveContextConfigSchema = z.object({
  /** Project root directory */
  projectRoot: z.string().optional(),
  /** Maximum content length per file (chars) before truncation */
  maxContentLength: z.number().int().positive().default(10000),
  /** Maximum total files to include in context */
  maxFiles: z.number().int().positive().default(50),
  /** Whether to load file contents (false for metadata only) */
  loadContent: z.boolean().default(true),
  /** File extensions to include (empty = all) */
  fileExtensions: z.array(z.string()).default(['.ts', '.tsx', '.js', '.jsx', '.md', '.json']),
  /** Directories to always exclude */
  excludeDirs: z
    .array(z.string())
    .default(['node_modules', '.git', 'dist', 'build', 'coverage', '.turbo']),
})

export type RetrieveContextConfig = z.infer<typeof RetrieveContextConfigSchema>

/**
 * Schema for retrieve context result.
 */
export const RetrieveContextResultSchema = z.object({
  /** The retrieved context */
  context: RetrievedContextSchema.nullable(),
  /** Whether context was successfully retrieved */
  retrieved: z.boolean(),
  /** Error message if retrieval failed */
  error: z.string().optional(),
})

export type RetrieveContextResult = z.infer<typeof RetrieveContextResultSchema>

/**
 * Determines relevant file patterns from baseline and scope.
 *
 * @param baseline - The loaded baseline reality
 * @param scope - The story scope
 * @returns Array of file patterns to search for
 */
export function determineRelevantPatterns(
  baseline: BaselineReality | null | undefined,
  scope: StoryScope,
): ScopePattern[] {
  const patterns: ScopePattern[] = [...scope.includePatterns]

  // If we have a baseline, use it to add relevant patterns
  if (baseline) {
    // Add patterns based on whatExists that match the domain
    const domainLower = scope.domain.toLowerCase()

    baseline.whatExists?.forEach(item => {
      if (item.toLowerCase().includes(domainLower)) {
        patterns.push({
          type: 'keyword',
          value: item,
          reason: `Exists in baseline and matches domain "${scope.domain}"`,
        })
      }
    })

    // Add patterns for in-progress items that might be related
    baseline.whatInProgress?.forEach(item => {
      if (item.toLowerCase().includes(domainLower)) {
        patterns.push({
          type: 'keyword',
          value: item,
          reason: `In progress in baseline and matches domain "${scope.domain}"`,
        })
      }
    })
  }

  // Add domain-based pattern if not already present
  const hasDomainPattern = patterns.some(
    p =>
      p.value.toLowerCase().includes(scope.domain.toLowerCase()) ||
      scope.domain.toLowerCase().includes(p.value.toLowerCase()),
  )

  if (!hasDomainPattern) {
    patterns.push({
      type: 'glob',
      value: `**/*${scope.domain}*/**`,
      reason: `Domain-based pattern for "${scope.domain}"`,
    })
  }

  return patterns
}

/**
 * Checks if a file path matches any of the exclude patterns.
 *
 * @param filePath - Path to check
 * @param excludePatterns - Patterns to exclude
 * @param excludeDirs - Directories to always exclude
 * @returns true if the file should be excluded
 */
export function shouldExcludeFile(
  filePath: string,
  excludePatterns: ScopePattern[],
  excludeDirs: string[],
): boolean {
  const normalizedPath = filePath.toLowerCase()

  // Check excluded directories
  for (const dir of excludeDirs) {
    if (normalizedPath.includes(`/${dir}/`) || normalizedPath.includes(`\\${dir}\\`)) {
      return true
    }
  }

  // Check exclude patterns
  for (const pattern of excludePatterns) {
    if (pattern.type === 'glob') {
      // Simple glob matching (could be enhanced with minimatch)
      const globPattern = pattern.value.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*')
      const regex = new RegExp(globPattern, 'i')
      if (regex.test(normalizedPath)) {
        return true
      }
    } else if (pattern.type === 'path') {
      if (normalizedPath.includes(pattern.value.toLowerCase())) {
        return true
      }
    } else if (pattern.type === 'keyword') {
      if (normalizedPath.includes(pattern.value.toLowerCase())) {
        return true
      }
    }
  }

  return false
}

/**
 * Checks if a file matches any of the include patterns.
 *
 * @param filePath - Path to check
 * @param includePatterns - Patterns to match
 * @param keywords - Keywords to search for
 * @returns Object with match status and reason
 */
export function matchesIncludePattern(
  filePath: string,
  includePatterns: ScopePattern[],
  keywords: string[],
): { matches: boolean; reason?: string } {
  const normalizedPath = filePath.toLowerCase()

  // Check include patterns
  for (const pattern of includePatterns) {
    if (pattern.type === 'glob') {
      const globPattern = pattern.value.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*')
      const regex = new RegExp(globPattern, 'i')
      if (regex.test(normalizedPath)) {
        return { matches: true, reason: pattern.reason || `Matches glob: ${pattern.value}` }
      }
    } else if (pattern.type === 'path') {
      if (normalizedPath.includes(pattern.value.toLowerCase())) {
        return { matches: true, reason: pattern.reason || `Matches path: ${pattern.value}` }
      }
    } else if (pattern.type === 'keyword') {
      if (normalizedPath.includes(pattern.value.toLowerCase())) {
        return { matches: true, reason: pattern.reason || `Contains keyword: ${pattern.value}` }
      }
    }
  }

  // Check keywords
  for (const keyword of keywords) {
    if (normalizedPath.includes(keyword.toLowerCase())) {
      return { matches: true, reason: `Matches keyword: ${keyword}` }
    }
  }

  return { matches: false }
}

/**
 * Recursively walks a directory and collects matching files.
 *
 * @param dir - Directory to walk
 * @param projectRoot - Project root for relative paths
 * @param scope - Story scope with patterns
 * @param config - Retrieval configuration
 * @param depth - Current depth
 * @returns Array of file paths with relevance reasons
 */
export async function walkDirectory(
  dir: string,
  projectRoot: string,
  scope: StoryScope,
  config: RetrieveContextConfig,
  depth = 0,
): Promise<Array<{ filePath: string; relativePath: string; reason: string }>> {
  if (depth > scope.maxDepth) {
    return []
  }

  const results: Array<{ filePath: string; relativePath: string; reason: string }> = []

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const relevantPatterns = determineRelevantPatterns(null, scope)

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      const relativePath = path.relative(projectRoot, fullPath)

      if (entry.isDirectory()) {
        // Check if directory should be excluded
        if (config.excludeDirs.includes(entry.name)) {
          continue
        }

        // Recursively walk subdirectory
        const subResults = await walkDirectory(fullPath, projectRoot, scope, config, depth + 1)
        results.push(...subResults)
      } else if (entry.isFile()) {
        // Check file extension
        const ext = path.extname(entry.name).toLowerCase()
        if (config.fileExtensions.length > 0 && !config.fileExtensions.includes(ext)) {
          continue
        }

        // Check exclude patterns
        if (shouldExcludeFile(fullPath, scope.excludePatterns, config.excludeDirs)) {
          continue
        }

        // Check include patterns
        const match = matchesIncludePattern(fullPath, relevantPatterns, scope.keywords)
        if (match.matches) {
          results.push({
            filePath: fullPath,
            relativePath,
            reason: match.reason || 'Matches scope',
          })
        }
      }
    }
  } catch (error) {
    // Directory not readable, skip it
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      // Log other errors but continue
    }
  }

  return results
}

/**
 * Loads file content with optional truncation.
 *
 * @param filePath - Path to the file
 * @param maxLength - Maximum content length
 * @returns Object with content and metadata
 */
export async function loadFileContent(
  filePath: string,
  maxLength: number,
): Promise<{ content: string; size: number; truncated: boolean }> {
  const stats = await fs.stat(filePath)
  const size = stats.size

  const content = await fs.readFile(filePath, 'utf-8')

  if (content.length > maxLength) {
    return {
      content: content.slice(0, maxLength) + '\n... [truncated]',
      size,
      truncated: true,
    }
  }

  return { content, size, truncated: false }
}

/**
 * Retrieves context for a story based on scope and baseline.
 *
 * @param baseline - The baseline reality (may be null)
 * @param scope - The story scope
 * @param config - Retrieval configuration
 * @returns Retrieved context result
 */
export async function retrieveContextForScope(
  baseline: BaselineReality | null | undefined,
  scope: StoryScope,
  config: Partial<RetrieveContextConfig> = {},
): Promise<RetrieveContextResult> {
  const fullConfig = RetrieveContextConfigSchema.parse(config)
  const projectRoot = fullConfig.projectRoot || process.env.PROJECT_ROOT || process.cwd()

  const retrievalErrors: string[] = []

  try {
    // Walk the project directory to find relevant files
    const matchedFiles = await walkDirectory(projectRoot, projectRoot, scope, fullConfig)

    // Limit the number of files
    const filesToProcess = matchedFiles.slice(0, fullConfig.maxFiles)

    // Load file contents
    const files: FileContext[] = []

    for (const file of filesToProcess) {
      try {
        if (fullConfig.loadContent) {
          const { content, size, truncated } = await loadFileContent(
            file.filePath,
            fullConfig.maxContentLength,
          )

          files.push({
            filePath: file.filePath,
            relativePath: file.relativePath,
            contentLoaded: true,
            content,
            size,
            relevanceReason: file.reason,
            truncated,
          })
        } else {
          // Metadata only
          const stats = await fs.stat(file.filePath)
          files.push({
            filePath: file.filePath,
            relativePath: file.relativePath,
            contentLoaded: false,
            size: stats.size,
            relevanceReason: file.reason,
            truncated: false,
          })
        }
      } catch (error) {
        retrievalErrors.push(
          `Failed to load ${file.relativePath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
      }
    }

    // Build baseline summary if baseline exists
    const baselineSummary = baseline
      ? {
          whatExists: baseline.whatExists || [],
          whatInProgress: baseline.whatInProgress || [],
          noRework: baseline.noRework || [],
        }
      : undefined

    const context: RetrievedContext = {
      storyId: scope.storyId,
      retrievedAt: new Date().toISOString(),
      files,
      baselineSummary,
      totalFilesFound: matchedFiles.length,
      filesLoaded: files.filter(f => f.contentLoaded).length,
      retrievalErrors,
    }

    return {
      context: RetrievedContextSchema.parse(context),
      retrieved: true,
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error during context retrieval'
    return {
      context: null,
      retrieved: false,
      error: errorMessage,
    }
  }
}

/**
 * Extended graph state with retrieved context.
 * Used by downstream nodes that consume context data.
 */
export interface GraphStateWithContext extends GraphStateWithBaseline {
  /** The retrieved context for the story */
  retrievedContext?: RetrievedContext | null
  /** Whether context was successfully retrieved */
  contextRetrieved?: boolean
  /** Story scope used for retrieval */
  storyScope?: StoryScope
}

/**
 * Retrieve Context node implementation.
 *
 * Retrieves relevant codebase context based on the baseline reality and story scope.
 * Uses the tool preset (lower retries, shorter timeout) since this is a file I/O operation.
 *
 * @param state - Current graph state (must have baselineReality and storyScope)
 * @returns Partial state update with retrieved context
 */
export const retrieveContextNode = createToolNode(
  'retrieve_context',
  async (state: GraphState): Promise<Partial<GraphStateWithContext>> => {
    const stateWithBaseline = state as GraphStateWithContext

    // Get or create a default scope based on state
    const scope: StoryScope = stateWithBaseline.storyScope || {
      storyId: state.storyId,
      domain: state.epicPrefix,
      includePatterns: [],
      excludePatterns: [],
      keywords: [state.epicPrefix, state.storyId],
      maxDepth: 5,
    }

    // Get project root from environment
    const projectRoot = process.env.PROJECT_ROOT || process.cwd()

    const result = await retrieveContextForScope(stateWithBaseline.baselineReality, scope, {
      projectRoot,
      loadContent: true,
      maxFiles: 50,
      maxContentLength: 10000,
    })

    if (!result.retrieved) {
      return updateState({
        retrievedContext: null,
        contextRetrieved: false,
      } as Partial<GraphStateWithContext>)
    }

    return updateState({
      retrievedContext: result.context,
      contextRetrieved: true,
      storyScope: scope,
    } as Partial<GraphStateWithContext>)
  },
)

/**
 * Creates a retrieve context node with custom configuration.
 *
 * @param config - Configuration options
 * @returns Configured node function
 */
export function createRetrieveContextNode(config: Partial<RetrieveContextConfig> = {}) {
  return createToolNode(
    'retrieve_context',
    async (state: GraphState): Promise<Partial<GraphStateWithContext>> => {
      const stateWithBaseline = state as GraphStateWithContext

      // Get or create a default scope based on state
      const scope: StoryScope = stateWithBaseline.storyScope || {
        storyId: state.storyId,
        domain: state.epicPrefix,
        includePatterns: [],
        excludePatterns: [],
        keywords: [state.epicPrefix, state.storyId],
        maxDepth: 5,
      }

      const result = await retrieveContextForScope(stateWithBaseline.baselineReality, scope, config)

      if (!result.retrieved) {
        if (result.error) {
          throw new Error(result.error)
        }

        return updateState({
          retrievedContext: null,
          contextRetrieved: false,
        } as Partial<GraphStateWithContext>)
      }

      return updateState({
        retrievedContext: result.context,
        contextRetrieved: true,
        storyScope: scope,
      } as Partial<GraphStateWithContext>)
    },
  )
}

/**
 * Creates a retrieve context node with a predefined scope.
 *
 * @param scope - The story scope to use
 * @param config - Configuration options
 * @returns Configured node function
 */
export function createScopedRetrieveContextNode(
  scope: StoryScope,
  config: Partial<RetrieveContextConfig> = {},
) {
  return createToolNode(
    'retrieve_context',
    async (state: GraphState): Promise<Partial<GraphStateWithContext>> => {
      const stateWithBaseline = state as GraphStateWithContext

      const result = await retrieveContextForScope(stateWithBaseline.baselineReality, scope, config)

      if (!result.retrieved) {
        if (result.error) {
          throw new Error(result.error)
        }

        return updateState({
          retrievedContext: null,
          contextRetrieved: false,
        } as Partial<GraphStateWithContext>)
      }

      return updateState({
        retrievedContext: result.context,
        contextRetrieved: true,
        storyScope: scope,
      } as Partial<GraphStateWithContext>)
    },
  )
}
