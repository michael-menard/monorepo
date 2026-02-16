/**
 * doc-sync.ts
 *
 * LangGraph node that wraps the doc-sync agent for orchestrated workflows.
 * Invokes the /doc-sync command via subprocess and parses SYNC-REPORT.md output.
 *
 * WINT-0160: Create doc-sync Agent (LangGraph Node Integration)
 *
 * @module nodes/workflow/doc-sync
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { spawn } from 'node:child_process'
import { z } from 'zod'
import { logger } from '@repo/logger'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'

/**
 * Schema for doc-sync node configuration.
 */
export const DocSyncConfigSchema = z.object({
  /** Run in check-only mode (dry-run) */
  checkOnly: z.boolean().default(false),
  /** Force full sync regardless of git status */
  force: z.boolean().default(false),
  /** Optional override for agent path (for testing) */
  agentPath: z.string().optional(),
  /** Working directory for command execution */
  workingDir: z.string().optional(),
  /** Path to SYNC-REPORT.md (defaults to <workingDir>/SYNC-REPORT.md) */
  reportPath: z.string().optional(),
})

export type DocSyncConfig = z.infer<typeof DocSyncConfigSchema>

/**
 * Schema for doc-sync result.
 */
export const DocSyncResultSchema = z.object({
  /** Whether sync was successful */
  success: z.boolean(),
  /** Number of files changed */
  filesChanged: z.number(),
  /** Number of documentation sections updated */
  sectionsUpdated: z.number(),
  /** Number of Mermaid diagrams regenerated */
  diagramsRegenerated: z.number(),
  /** Number of items requiring manual review */
  manualReviewNeeded: z.number(),
  /** Whether changelog entry was drafted */
  changelogDrafted: z.boolean(),
  /** Path to generated SYNC-REPORT.md */
  reportPath: z.string(),
  /** Array of error messages if any */
  errors: z.array(z.string()),
})

export type DocSyncResult = z.infer<typeof DocSyncResultSchema>

/**
 * Extended graph state with doc-sync result.
 */
export interface GraphStateWithDocSync extends GraphState {
  /** Result of doc-sync operation */
  docSync?: DocSyncResult
}

/**
 * Executes the /doc-sync command via subprocess.
 *
 * @param config - Doc-sync configuration
 * @returns Process exit code and stderr output
 */
async function executeDocSyncCommand(
  config: DocSyncConfig,
): Promise<{ exitCode: number; stderr: string; stdout: string }> {
  const args: string[] = []

  if (config.checkOnly) {
    args.push('--check-only')
  }

  if (config.force) {
    args.push('--force')
  }

  const workingDir = config.workingDir || process.cwd()

  logger.info('Executing doc-sync command', {
    args,
    workingDir,
  })

  return new Promise((resolve, reject) => {
    // Note: In a real implementation, this would invoke Claude Code's /doc-sync command
    // For now, we spawn a shell command that would trigger the agent
    const child = spawn('claude', ['doc-sync', ...args], {
      cwd: workingDir,
      shell: true,
    })

    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', data => {
      stdout += data.toString()
    })

    child.stderr?.on('data', data => {
      stderr += data.toString()
    })

    child.on('error', error => {
      reject(new Error(`Failed to spawn doc-sync process: ${error.message}`))
    })

    child.on('close', exitCode => {
      resolve({
        exitCode: exitCode ?? 1,
        stderr,
        stdout,
      })
    })
  })
}

/**
 * Parses SYNC-REPORT.md file into structured result.
 *
 * Expected format:
 * - Total files changed: N
 * - Total sections updated: N
 * - Total diagrams regenerated: N
 * - Manual review items: N
 * - Changelog Entry ... Status: [DRAFT] or [APPLIED]
 *
 * @param reportPath - Path to SYNC-REPORT.md
 * @returns Parsed doc-sync result
 */
async function parseSyncReport(reportPath: string): Promise<Omit<DocSyncResult, 'success'>> {
  try {
    const content = await fs.readFile(reportPath, 'utf-8')

    // Extract counts using regex patterns
    const filesChangedMatch = content.match(/Total files changed:\s*(\d+)/i)
    const sectionsUpdatedMatch = content.match(/Total sections updated:\s*(\d+)/i)
    const diagramsRegeneratedMatch = content.match(/Total diagrams regenerated:\s*(\d+)/i)
    const manualReviewMatch = content.match(/Manual review items:\s*(\d+)/i)

    // Check for [DRAFT] status anywhere in the document (more lenient matching)
    const changelogDrafted = /\[DRAFT\]/i.test(content)

    // Parse counts with defaults
    const filesChanged = filesChangedMatch ? Number.parseInt(filesChangedMatch[1], 10) : 0
    const sectionsUpdated = sectionsUpdatedMatch ? Number.parseInt(sectionsUpdatedMatch[1], 10) : 0
    const diagramsRegenerated = diagramsRegeneratedMatch
      ? Number.parseInt(diagramsRegeneratedMatch[1], 10)
      : 0
    const manualReviewNeeded = manualReviewMatch ? Number.parseInt(manualReviewMatch[1], 10) : 0

    // Check for missing sections (log warnings)
    if (!filesChangedMatch) {
      logger.warn('SYNC-REPORT.md missing "Total files changed" section', { reportPath })
    }
    if (!sectionsUpdatedMatch) {
      logger.warn('SYNC-REPORT.md missing "Total sections updated" section', { reportPath })
    }

    return {
      filesChanged,
      sectionsUpdated,
      diagramsRegenerated,
      manualReviewNeeded,
      changelogDrafted,
      reportPath,
      errors: [],
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`SYNC-REPORT.md not found at ${reportPath}`)
    }
    throw error
  }
}

/**
 * Doc-sync node implementation.
 *
 * Invokes the /doc-sync command and parses the resulting SYNC-REPORT.md.
 *
 * @param state - Current graph state
 * @param config - Doc-sync configuration
 * @returns Updated graph state with doc-sync result
 */
async function docSyncImpl(
  _state: GraphState,
  config: Partial<DocSyncConfig> = {},
): Promise<Partial<GraphStateWithDocSync>> {
  const fullConfig = DocSyncConfigSchema.parse(config)

  const workingDir = fullConfig.workingDir || process.cwd()
  const reportPath = fullConfig.reportPath || path.join(workingDir, 'SYNC-REPORT.md')

  try {
    // Execute doc-sync command
    const { exitCode, stderr } = await executeDocSyncCommand(fullConfig)

    // Check exit code
    if (exitCode !== 0 && exitCode !== 1) {
      // Exit code 1 in check-only mode means out-of-sync (expected)
      // Any other non-zero exit code is an error
      logger.error('doc-sync command failed', { exitCode, stderr })
      return updateState({
        docSync: {
          success: false,
          filesChanged: 0,
          sectionsUpdated: 0,
          diagramsRegenerated: 0,
          manualReviewNeeded: 0,
          changelogDrafted: false,
          reportPath,
          errors: [`doc-sync command failed with exit code ${exitCode}`, stderr],
        },
      } as Partial<GraphStateWithDocSync>)
    }

    // Parse SYNC-REPORT.md
    const parsed = await parseSyncReport(reportPath)

    // In check-only mode, exit code 1 means out-of-sync (not an error)
    const success = exitCode === 0

    return updateState({
      docSync: {
        ...parsed,
        success,
      },
    } as Partial<GraphStateWithDocSync>)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('doc-sync node failed', { error: errorMessage })

    return updateState({
      docSync: {
        success: false,
        filesChanged: 0,
        sectionsUpdated: 0,
        diagramsRegenerated: 0,
        manualReviewNeeded: 0,
        changelogDrafted: false,
        reportPath,
        errors: [errorMessage],
      },
    } as Partial<GraphStateWithDocSync>)
  }
}

/**
 * Doc-sync node - default configuration.
 *
 * Uses tool preset (lower retries, shorter timeout) since this is a file I/O operation.
 *
 * @example
 * ```typescript
 * import { docSyncNode } from './nodes/workflow/doc-sync.js'
 *
 * const result = await docSyncNode(state)
 * console.log(`Files changed: ${result.docSync?.filesChanged}`)
 * ```
 */
export const docSyncNode = createToolNode(
  'doc_sync',
  async (state: GraphState): Promise<Partial<GraphStateWithDocSync>> => {
    return docSyncImpl(state, {})
  },
)

/**
 * Creates a doc-sync node with custom configuration.
 *
 * @param config - Doc-sync configuration
 * @returns Configured node function
 *
 * @example
 * ```typescript
 * // Check-only mode
 * const checkNode = createDocSyncNode({ checkOnly: true })
 *
 * // Force mode
 * const forceNode = createDocSyncNode({ force: true })
 *
 * // Custom working directory
 * const customNode = createDocSyncNode({
 *   workingDir: '/path/to/story/artifacts',
 * })
 * ```
 */
export function createDocSyncNode(config: Partial<DocSyncConfig> = {}) {
  return createToolNode(
    'doc_sync',
    async (state: GraphState): Promise<Partial<GraphStateWithDocSync>> => {
      return docSyncImpl(state, config)
    },
  )
}
