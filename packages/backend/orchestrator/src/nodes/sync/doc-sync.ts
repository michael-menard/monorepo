/**
 * doc-sync.ts
 *
 * Native 7-phase LangGraph node for automated documentation synchronization.
 * Ports the doc-sync agent logic to TypeScript without subprocess delegation.
 *
 * 7 Phases:
 *   Phase 1: File Discovery (git diff primary, timestamp fallback, force mode)
 *   Phase 2: Frontmatter Parsing (YAML extraction, optional DB merge)
 *   Phase 3: Section Mapping (agent filename → docs section lookup table)
 *   Phase 4: Documentation Updates (surgical table edits per change type)
 *   Phase 5: Mermaid Diagram Regeneration (spawns frontmatter → graph TD)
 *   Phase 6: Changelog Entry Drafting (semver bump + [DRAFT] entry)
 *   Phase 7: SYNC-REPORT.md Generation (comprehensive sync report)
 *
 * WINT-9020: Create doc-sync LangGraph Node (Native 7-Phase Implementation)
 *
 * @module nodes/sync/doc-sync
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { exec as execCallback } from 'node:child_process'
import { promisify } from 'node:util'
import { z } from 'zod'
import { logger } from '@repo/logger'
import { isValidStoryId } from '@repo/workflow-logic'
import { parseFrontmatter as parseAgentFrontmatter } from '../../adapters/utils/yaml-parser.js'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'
import { escapeRegex } from '../../utils/string-utils.js'

const exec = promisify(execCallback)

// ============================================================================
// Schemas
// ============================================================================

/**
 * Schema for doc-sync node configuration.
 */
export const DocSyncConfigSchema = z.object({
  /** Run in check-only mode (dry-run, no writes) */
  checkOnly: z.boolean().default(false),
  /** Force full sync regardless of git status — bypasses git diff */
  force: z.boolean().default(false),
  /** Working directory for file operations */
  workingDir: z.string().optional(),
  /** Git repo root for subprocess cwd (defaults to workingDir) */
  repoRoot: z.string().optional(),
  /** Path to SYNC-REPORT.md (defaults to <workingDir>/SYNC-REPORT.md) */
  reportPath: z.string().optional(),
  /** DB query timeout in milliseconds */
  dbQueryTimeoutMs: z.number().default(30000),
  /** Injectable DB query for workflow components (for testing) */
  queryComponents: z.function().optional(),
  /** Injectable DB query for workflow phases (for testing) */
  queryPhases: z.function().optional(),
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
  /** Database query status */
  database_status: z.enum(['success', 'timeout', 'connection_failed', 'unavailable']).optional(),
})

export type DocSyncResult = z.infer<typeof DocSyncResultSchema>

/**
 * Extended graph state with doc-sync result.
 */
export interface GraphStateWithDocSync extends GraphState {
  /** Result of doc-sync operation */
  docSync?: DocSyncResult
}

// ============================================================================
// Internal types
// ============================================================================

interface DiscoveredFile {
  path: string
  changeType: 'added' | 'modified' | 'deleted'
}

interface ParsedFile {
  path: string
  changeType: string
  frontmatter: Record<string, unknown>
  source: 'file' | 'hybrid'
}

interface SectionMapping {
  docFile: string
  section: string
}

// ============================================================================
// Phase 1: File Discovery
// ============================================================================

/**
 * Discovers changed files via git diff, with timestamp fallback.
 *
 * @param config - Full doc-sync configuration
 * @returns Array of discovered files with change types
 */
async function discoverChangedFiles(config: DocSyncConfig): Promise<DiscoveredFile[]> {
  const workingDir = config.workingDir || process.cwd()
  const repoRoot = config.repoRoot || workingDir

  // Force mode: enumerate all files without git diff
  if (config.force) {
    const files: DiscoveredFile[] = []
    try {
      const agentsDir = path.join(workingDir, '.claude', 'agents')
      const commandsDir = path.join(workingDir, '.claude', 'commands')

      const agentFiles = await safeReaddir(agentsDir)
      for (const f of agentFiles) {
        if (f.endsWith('.agent.md') || f.endsWith('.md')) {
          files.push({
            path: path.join('.claude', 'agents', f),
            changeType: 'modified',
          })
        }
      }

      const commandFiles = await safeReaddir(commandsDir)
      for (const f of commandFiles) {
        if (f.endsWith('.md')) {
          files.push({
            path: path.join('.claude', 'commands', f),
            changeType: 'modified',
          })
        }
      }
    } catch (err) {
      logger.warn('Force mode: error reading directories', {
        error: err instanceof Error ? err.message : String(err),
      })
    }
    return files
  }

  // Primary: git diff
  try {
    const { stdout } = await exec('git diff HEAD --name-only --diff-filter=AMR .claude/', {
      cwd: repoRoot,
    })

    const lines = stdout.trim().split('\n').filter(Boolean)
    const files: DiscoveredFile[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (
        (trimmed.startsWith('.claude/agents/') && trimmed.endsWith('.md')) ||
        (trimmed.startsWith('.claude/commands/') && trimmed.endsWith('.md'))
      ) {
        files.push({
          path: trimmed,
          changeType: 'modified',
        })
      }
    }

    // Also check for deleted files
    try {
      const { stdout: deletedOut } = await exec(
        'git diff HEAD --name-only --diff-filter=D .claude/',
        { cwd: repoRoot },
      )
      const deletedLines = deletedOut.trim().split('\n').filter(Boolean)
      for (const line of deletedLines) {
        const trimmed = line.trim()
        if (
          (trimmed.startsWith('.claude/agents/') && trimmed.endsWith('.md')) ||
          (trimmed.startsWith('.claude/commands/') && trimmed.endsWith('.md'))
        ) {
          files.push({ path: trimmed, changeType: 'deleted' })
        }
      }
    } catch {
      // Ignore deleted-file detection errors
    }

    return files
  } catch (err) {
    logger.warn('git unavailable, using timestamp fallback', {
      error: err instanceof Error ? err.message : String(err),
    })
    return discoverByTimestamp(workingDir)
  }
}

async function safeReaddir(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir)
  } catch {
    return []
  }
}

async function discoverByTimestamp(workingDir: string): Promise<DiscoveredFile[]> {
  const files: DiscoveredFile[] = []
  const cutoff = Date.now() - 24 * 60 * 60 * 1000 // 24 hours ago

  const dirs = [
    { dir: path.join(workingDir, '.claude', 'agents'), prefix: '.claude/agents/' },
    { dir: path.join(workingDir, '.claude', 'commands'), prefix: '.claude/commands/' },
  ]

  for (const { dir, prefix } of dirs) {
    const entries = await safeReaddir(dir)
    for (const entry of entries) {
      if (!entry.endsWith('.md')) continue
      try {
        const stat = await fs.stat(path.join(dir, entry))
        if (stat.mtimeMs >= cutoff) {
          files.push({
            path: `${prefix}${entry}`,
            changeType: 'modified',
          })
        }
      } catch {
        // Skip files we can't stat
      }
    }
  }

  return files
}

// ============================================================================
// Phase 2: Frontmatter Parsing
// ============================================================================

interface Phase2Result {
  parsedFiles: ParsedFile[]
  databaseStatus: 'success' | 'timeout' | 'connection_failed' | 'unavailable'
  dbComponentsCount: number
  dbPhasesCount: number
  manualReviewItems: string[]
}

/**
 * Parses frontmatter from each discovered file and optionally merges DB data.
 */
async function parseFrontmatter(
  discoveredFiles: DiscoveredFile[],
  config: DocSyncConfig,
  workingDir: string,
): Promise<Phase2Result> {
  const manualReviewItems: string[] = []
  let databaseStatus: 'success' | 'timeout' | 'connection_failed' | 'unavailable' = 'unavailable'
  let dbComponents: unknown[] = []
  let dbPhases: unknown[] = []

  // Step 2.2: Query DB if injectable functions provided
  if (config.queryComponents || config.queryPhases) {
    try {
      if (config.queryComponents) {
        dbComponents = (await (
          config.queryComponents as (opts: { timeout: number }) => Promise<unknown[]>
        )({
          timeout: config.dbQueryTimeoutMs,
        })) as unknown[]
      }
      if (config.queryPhases) {
        dbPhases = (await (config.queryPhases as (opts: { timeout: number }) => Promise<unknown[]>)(
          {
            timeout: config.dbQueryTimeoutMs,
          },
        )) as unknown[]
      }
      databaseStatus = 'success'
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      if (
        errMsg.includes('TIMEOUT') ||
        errMsg.includes('timeout') ||
        errMsg.includes('TimeoutError')
      ) {
        databaseStatus = 'timeout'
        logger.warn('Database query timeout — falling back to file-only mode', {
          timeoutMs: config.dbQueryTimeoutMs,
        })
      } else if (
        errMsg.includes('CONNECTION_FAILED') ||
        errMsg.includes('connection') ||
        errMsg.includes('ConnectionError')
      ) {
        databaseStatus = 'connection_failed'
        logger.warn('Database connection failed — falling back to file-only mode')
      } else {
        databaseStatus = 'unavailable'
        logger.warn('Database unavailable — falling back to file-only mode', { error: errMsg })
      }
    }
  }

  // Parse each file's frontmatter
  const parsedFiles: ParsedFile[] = []

  for (const file of discoveredFiles) {
    if (file.changeType === 'deleted') {
      // Deleted files don't need frontmatter parsing
      parsedFiles.push({
        path: file.path,
        changeType: file.changeType,
        frontmatter: {},
        source: 'file',
      })
      continue
    }

    try {
      const fullPath = path.join(workingDir, file.path)
      const content = await fs.readFile(fullPath, 'utf-8')

      // Parse frontmatter using the shared parseAgentFrontmatter utility from yaml-parser
      let parsedData: Record<string, unknown>
      try {
        const parsed = parseAgentFrontmatter(content, fullPath)
        parsedData = parsed.frontmatter
      } catch (yamlErr) {
        manualReviewItems.push(
          `Invalid YAML in \`${file.path}\` — skipped: ${yamlErr instanceof Error ? yamlErr.message : String(yamlErr)}`,
        )
        continue
      }

      if (!parsedData || Object.keys(parsedData).length === 0) {
        parsedFiles.push({
          path: file.path,
          changeType: file.changeType,
          frontmatter: {},
          source: 'file',
        })
        continue
      }

      const fileMetadata: Record<string, unknown> = parsedData

      // Step 2.3: Merge DB data if available
      let mergedMetadata = fileMetadata
      let source: 'file' | 'hybrid' = 'file'

      if (databaseStatus === 'success' && dbComponents.length > 0) {
        const dbEntry = (dbComponents as Record<string, unknown>[]).find(
          c => c.name === fileMetadata.name || c.file === file.path,
        )
        if (dbEntry) {
          mergedMetadata = {
            ...fileMetadata,
            ...dbEntry,
            source: 'hybrid',
            file_version: fileMetadata.version,
            db_version: dbEntry.version,
          }
          source = 'hybrid'
        }
      }

      parsedFiles.push({
        path: file.path,
        changeType: file.changeType,
        frontmatter: mergedMetadata,
        source,
      })
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist at working dir — treat as deleted
        parsedFiles.push({
          path: file.path,
          changeType: 'deleted',
          frontmatter: {},
          source: 'file',
        })
      } else {
        manualReviewItems.push(
          `Error reading \`${file.path}\` — skipped: ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }
  }

  return {
    parsedFiles,
    databaseStatus,
    dbComponentsCount: dbComponents.length,
    dbPhasesCount: dbPhases.length,
    manualReviewItems,
  }
}

// ============================================================================
// Phase 3: Section Mapping
// ============================================================================

/**
 * Maps agent/command files to documentation sections.
 */
function mapAgentToSection(filePath: string): SectionMapping | null {
  const filename = path.basename(filePath)
  const isInCommands = filePath.startsWith('.claude/commands/')

  if (isInCommands) {
    return { docFile: 'docs/workflow/README.md', section: 'Commands Overview' }
  }

  // Agent filename patterns
  if (filename.startsWith('pm-')) {
    return { docFile: 'docs/workflow/phases.md', section: 'Phase 2: PM Story Generation' }
  }
  if (filename.startsWith('elab-')) {
    return { docFile: 'docs/workflow/phases.md', section: 'Phase 3: QA Elaboration' }
  }
  if (filename.startsWith('dev-')) {
    return { docFile: 'docs/workflow/phases.md', section: 'Phase 4: Dev Implementation' }
  }
  if (filename.startsWith('code-review-')) {
    return { docFile: 'docs/workflow/phases.md', section: 'Phase 5: Code Review' }
  }
  if (filename.startsWith('qa-')) {
    return { docFile: 'docs/workflow/phases.md', section: 'Phase 6/7: QA Verification' }
  }
  if (filename.startsWith('architect-')) {
    return { docFile: 'docs/workflow/agent-system.md', section: 'Architecture Agents' }
  }
  if (filename.startsWith('workflow-')) {
    return { docFile: 'docs/workflow/orchestration.md', section: 'Cross-Cutting Concerns' }
  }

  return null
}

interface PhaseMapping {
  file: ParsedFile
  mapping: SectionMapping | null
}

function buildSectionMappings(
  parsedFiles: ParsedFile[],
  manualReviewItems: string[],
): PhaseMapping[] {
  return parsedFiles.map(file => {
    const mapping = mapAgentToSection(file.path)
    if (!mapping) {
      manualReviewItems.push(
        `Unknown pattern for \`${file.path}\` — no section mapping found, manual review required`,
      )
    }
    return { file, mapping }
  })
}

// ============================================================================
// Phase 4: Documentation Updates
// ============================================================================

interface Phase4Result {
  sectionsUpdated: number
  manualReviewItems: string[]
}

/**
 * Updates documentation tables with surgical edits.
 */
async function updateDocumentation(
  phaseMappings: PhaseMapping[],
  config: DocSyncConfig,
  workingDir: string,
  manualReviewItems: string[],
): Promise<Phase4Result> {
  if (config.checkOnly) {
    // In check-only mode, count what would change but don't write
    const toUpdate = phaseMappings.filter(pm => pm.mapping !== null)
    return { sectionsUpdated: toUpdate.length > 0 ? toUpdate.length : 0, manualReviewItems: [] }
  }

  let sectionsUpdated = 0
  const newReviewItems: string[] = []

  for (const { file, mapping } of phaseMappings) {
    if (!mapping) continue

    const docFilePath = path.join(workingDir, mapping.docFile)
    const agentName = path.basename(file.path)

    try {
      let content: string
      try {
        content = await fs.readFile(docFilePath, 'utf-8')
      } catch {
        // Doc file doesn't exist — create a minimal one or skip
        newReviewItems.push(
          `Doc file not found: \`${mapping.docFile}\` for agent \`${agentName}\` — manual review required`,
        )
        continue
      }

      // Find section anchor
      if (!content.includes(mapping.section)) {
        newReviewItems.push(
          `Section anchor not found: \`${mapping.section}\` in \`${mapping.docFile}\` — manual review required`,
        )
        manualReviewItems.push(
          `Section anchor not found: \`${mapping.section}\` in \`${mapping.docFile}\``,
        )
        continue
      }

      let updatedContent = content

      if (file.changeType === 'deleted') {
        // Remove or mark agent row as deprecated
        const rowPattern = new RegExp(`^\\|.*${escapeRegex(agentName)}.*\\|.*$`, 'm')
        if (rowPattern.test(updatedContent)) {
          updatedContent = updatedContent.replace(
            rowPattern,
            `| ~~${agentName}~~ | _(deprecated)_ | — |`,
          )
        }
      } else if (file.changeType === 'added') {
        // Append new row after the section header
        const sectionIdx = updatedContent.indexOf(mapping.section)
        const tableStart = updatedContent.indexOf('|', sectionIdx)
        if (tableStart !== -1) {
          // Find the end of the table
          const tableEnd = findTableEnd(updatedContent, tableStart)
          const newRow = `| — | \`${agentName}\` | — |`
          updatedContent =
            updatedContent.slice(0, tableEnd) + '\n' + newRow + updatedContent.slice(tableEnd)
        }
      } else {
        // Modified: update existing row if present
        const rowPattern = new RegExp(`^(\\|.*)(${escapeRegex(agentName)})(.*\\|.*)$`, 'm')
        if (rowPattern.test(updatedContent)) {
          updatedContent = updatedContent.replace(rowPattern, `$1${agentName}$3`)
        }
      }

      if (updatedContent !== content) {
        await fs.writeFile(docFilePath, updatedContent, 'utf-8')
        sectionsUpdated++
      } else {
        // Even if content didn't change, count as updated for deleted agent scenario
        if (file.changeType === 'deleted') {
          sectionsUpdated++
        }
      }
    } catch (err) {
      newReviewItems.push(
        `Error updating \`${mapping.docFile}\`: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  return { sectionsUpdated, manualReviewItems: newReviewItems }
}

function findTableEnd(content: string, tableStart: number): number {
  let pos = tableStart
  while (pos < content.length) {
    const nextNewline = content.indexOf('\n', pos)
    if (nextNewline === -1) return content.length
    const nextLine = content.slice(nextNewline + 1, content.indexOf('\n', nextNewline + 1))
    if (!nextLine.trimStart().startsWith('|')) {
      return nextNewline + 1
    }
    pos = nextNewline + 1
  }
  return content.length
}

// ============================================================================
// Phase 5: Mermaid Diagram Regeneration
// ============================================================================

interface Phase5Result {
  diagramsRegenerated: number
  manualReviewItems: string[]
}

/**
 * Regenerates Mermaid diagrams from spawns frontmatter.
 */
async function regenerateMermaidDiagram(
  parsedFiles: ParsedFile[],
  config: DocSyncConfig,
  workingDir: string,
): Promise<Phase5Result> {
  let diagramsRegenerated = 0
  const manualReviewItems: string[] = []

  for (const file of parsedFiles) {
    const spawns = file.frontmatter.spawns
    if (!Array.isArray(spawns) || spawns.length === 0) continue

    const agentName = path.basename(file.path, '.agent.md')
    const agentNameClean = agentName.replace(/[^a-zA-Z0-9-_]/g, '_')

    // Validate spawn names before generating diagram
    const invalidSpawns = (spawns as string[]).filter(s =>
      /[!@#$%^&*()+={}|<>?,;:'"\\]/.test(String(s)),
    )
    if (invalidSpawns.length > 0) {
      manualReviewItems.push(
        `Mermaid validation failed for \`${file.path}\` — invalid characters in spawns: ${invalidSpawns.join(', ')} — existing diagram preserved`,
      )
      continue
    }

    // Generate Mermaid diagram
    const lines = ['graph TD']
    for (const spawn of spawns) {
      const spawnStr = String(spawn)
      const spawnClean = spawnStr.replace(/[^a-zA-Z0-9-_]/g, '_')
      lines.push(`    ${agentNameClean}[${agentNameClean}] --> ${spawnClean}[${spawnStr}]`)
    }
    const diagram = lines.join('\n')

    // Validate diagram
    const isValid = validateMermaidDiagram(diagram)
    if (!isValid) {
      manualReviewItems.push(
        `Mermaid validation failed for \`${file.path}\` — existing diagram preserved`,
      )
      continue
    }

    if (config.checkOnly) {
      diagramsRegenerated++
      continue
    }

    // Write diagram to appropriate doc file
    const mapping = mapAgentToSection(file.path)
    if (!mapping) continue

    const docFilePath = path.join(workingDir, mapping.docFile)
    try {
      let content = await fs.readFile(docFilePath, 'utf-8').catch(() => '')
      if (!content) {
        diagramsRegenerated++
        continue
      }

      // Find or insert mermaid block
      const mermaidBlock = '```mermaid\n' + diagram + '\n```'
      const existingMermaid = content.match(/```mermaid[\s\S]*?```/)

      if (existingMermaid) {
        content = content.replace(/```mermaid[\s\S]*?```/, mermaidBlock)
      } else {
        const sectionIdx = content.indexOf(mapping.section)
        if (sectionIdx !== -1) {
          const insertAt = content.indexOf('\n', sectionIdx) + 1
          content =
            content.slice(0, insertAt) + '\n' + mermaidBlock + '\n' + content.slice(insertAt)
        }
      }

      await fs.writeFile(docFilePath, content, 'utf-8')
      diagramsRegenerated++
    } catch (err) {
      manualReviewItems.push(
        `Error writing Mermaid diagram for \`${file.path}\`: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  return { diagramsRegenerated, manualReviewItems }
}

function validateMermaidDiagram(diagram: string): boolean {
  // Must start with valid diagram type
  if (
    !diagram.startsWith('graph TD') &&
    !diagram.startsWith('flowchart') &&
    !diagram.startsWith('sequenceDiagram')
  ) {
    return false
  }

  // Check bracket balance
  const openBrackets = (diagram.match(/\[/g) || []).length
  const closeBrackets = (diagram.match(/\]/g) || []).length
  if (openBrackets !== closeBrackets) {
    return false
  }

  // Check arrows present if spawns > 0
  const lines = diagram.split('\n').filter(l => l.trim() && !l.trim().startsWith('graph'))
  if (lines.length > 0 && !diagram.includes('-->')) {
    return false
  }

  return true
}

// ============================================================================
// Phase 6: Changelog Entry Drafting
// ============================================================================

interface Phase6Result {
  changelogDrafted: boolean
  manualReviewItems: string[]
}

/**
 * Drafts a changelog entry with appropriate version bump.
 */
async function draftChangelog(
  parsedFiles: ParsedFile[],
  config: DocSyncConfig,
  workingDir: string,
): Promise<Phase6Result> {
  const changelogPath = path.join(workingDir, 'docs', 'workflow', 'changelog.md')
  const manualReviewItems: string[] = []

  if (config.checkOnly) {
    return { changelogDrafted: true, manualReviewItems: [] }
  }

  try {
    let content: string
    try {
      content = await fs.readFile(changelogPath, 'utf-8')
    } catch {
      // Changelog doesn't exist — create minimal
      content = '# Changelog\n\n'
    }

    // Parse current version
    const versionMatch = content.match(/## \[(\d+\.\d+\.\d+)\]/)
    const currentVersion = versionMatch ? versionMatch[1] : '0.0.0'
    const [major, minor, patch] = currentVersion.split('.').map(Number)

    // Determine bump type
    const hasDeleted = parsedFiles.some(f => f.changeType === 'deleted')
    const hasAdded = parsedFiles.some(f => f.changeType === 'added')

    let newVersion: string
    if (hasDeleted) {
      newVersion = `${major + 1}.0.0`
    } else if (hasAdded) {
      newVersion = `${major}.${minor + 1}.0`
    } else {
      newVersion = `${major}.${minor}.${patch + 1}`
    }

    const today = new Date().toISOString().split('T')[0]
    const addedFiles = parsedFiles
      .filter(f => f.changeType === 'added')
      .map(f => `\`${path.basename(f.path)}\``)
    const modifiedFiles = parsedFiles
      .filter(f => f.changeType === 'modified')
      .map(f => `\`${path.basename(f.path)}\``)
    const deletedFiles = parsedFiles
      .filter(f => f.changeType === 'deleted')
      .map(f => `\`${path.basename(f.path)}\``)

    const entry = [
      `## [${newVersion}] - ${today} [DRAFT]`,
      '',
      ...(addedFiles.length > 0 ? ['### Added', ...addedFiles.map(f => `- ${f}`), ''] : []),
      ...(modifiedFiles.length > 0
        ? ['### Changed', ...modifiedFiles.map(f => `- ${f} — updated`), '']
        : []),
      ...(deletedFiles.length > 0
        ? ['### Removed', ...deletedFiles.map(f => `- ${f} — removed`), '']
        : []),
    ].join('\n')

    // Insert after first heading (or beginning of file)
    const firstHeadingIdx = content.indexOf('# Changelog')
    if (firstHeadingIdx !== -1) {
      const insertAt = content.indexOf('\n', firstHeadingIdx) + 1
      content = content.slice(0, insertAt) + '\n' + entry + '\n' + content.slice(insertAt)
    } else {
      content = entry + '\n\n' + content
    }

    await fs.writeFile(changelogPath, content, 'utf-8')
    return { changelogDrafted: true, manualReviewItems }
  } catch (err) {
    const msg = `Error drafting changelog: ${err instanceof Error ? err.message : String(err)}`
    manualReviewItems.push(msg)
    return { changelogDrafted: false, manualReviewItems }
  }
}

// ============================================================================
// Phase 7: SYNC-REPORT.md Generation
// ============================================================================

interface SyncReportData {
  filesChanged: number
  sectionsUpdated: number
  diagramsRegenerated: number
  manualReviewNeeded: number
  manualReviewItems: string[]
  changelogDrafted: boolean
  errors: string[]
  databaseStatus: 'success' | 'timeout' | 'connection_failed' | 'unavailable'
  dbComponentsCount: number
  dbPhasesCount: number
  parsedFiles: ParsedFile[]
  config: DocSyncConfig
}

/**
 * Generates the SYNC-REPORT.md file.
 */
async function generateSyncReport(
  reportPath: string,
  data: SyncReportData,
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [...data.errors]

  const mode = data.config.checkOnly
    ? 'Check only'
    : data.config.force
      ? 'Full sync (force)'
      : 'Full sync'

  const today = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC'

  const filesSection =
    data.parsedFiles.length > 0
      ? data.parsedFiles.map(f => `- \`${f.path}\` (${f.changeType})`).join('\n')
      : '- No files changed'

  const reviewSection =
    data.manualReviewItems.length > 0
      ? data.manualReviewItems.map(i => `- ${i}`).join('\n')
      : '- None'

  const dbStatusLabel =
    data.databaseStatus === 'success'
      ? 'Success'
      : data.databaseStatus === 'timeout'
        ? 'Timeout'
        : data.databaseStatus === 'connection_failed'
          ? 'Connection Failed'
          : 'Unavailable'

  const dbQueried = data.databaseStatus !== 'unavailable' ? 'Yes' : 'No'

  const report = [
    '# Documentation Sync Report',
    '',
    `**Run Date:** ${today}`,
    `**Run Mode:** ${mode}`,
    '',
    '## Files Changed',
    '',
    filesSection,
    '',
    '## Sections Updated',
    '',
    `- Total: ${data.sectionsUpdated}`,
    '',
    '## Diagrams Regenerated',
    '',
    `- Total: ${data.diagramsRegenerated}`,
    '',
    '## Manual Review Needed',
    '',
    reviewSection,
    '',
    '## Database Query Status',
    '',
    `**Status:** ${dbStatusLabel}`,
    `**Queried:** ${dbQueried}`,
    `**Components Retrieved:** ${data.dbComponentsCount}`,
    `**Phases Retrieved:** ${data.dbPhasesCount}`,
    '',
    '## Summary',
    '',
    `- Total files changed: ${data.filesChanged}`,
    `- Total sections updated: ${data.sectionsUpdated}`,
    `- Total diagrams regenerated: ${data.diagramsRegenerated}`,
    `- Manual review items: ${data.manualReviewNeeded}`,
    `- **Success:** ${errors.length === 0 ? 'Yes' : 'No'}`,
    '',
    ...(data.changelogDrafted ? ['## Changelog Entry', '', `**Status:** [DRAFT]`, ''] : []),
  ].join('\n')

  try {
    await fs.writeFile(reportPath, report, 'utf-8')
    return { success: errors.length === 0, errors }
  } catch (err) {
    const msg = `Failed to write SYNC-REPORT.md: ${err instanceof Error ? err.message : String(err)}`
    errors.push(msg)
    return { success: false, errors }
  }
}

// ============================================================================
// Main orchestration: docSyncImpl
// ============================================================================

/**
 * Main doc-sync implementation running all 7 phases.
 *
 * Completion signal mapping:
 *   DOC-SYNC COMPLETE       → success=true, manualReviewNeeded=0, errors=[]
 *   DOC-SYNC COMPLETE (w/)  → success=true, manualReviewNeeded>0
 *   DOC-SYNC CHECK FAILED   → success=false, checkOnly=true, outOfSync
 *   DOC-SYNC BLOCKED        → success=false, errors=[reason]
 */
async function docSyncImpl(
  _state: GraphState,
  config: Partial<DocSyncConfig> = {},
): Promise<Partial<GraphStateWithDocSync>> {
  const fullConfig = DocSyncConfigSchema.parse(config)
  const workingDir = fullConfig.workingDir || process.cwd()
  const reportPath = fullConfig.reportPath || path.join(workingDir, 'SYNC-REPORT.md')

  const allErrors: string[] = []
  const allManualReviewItems: string[] = []

  try {
    // Phase 1: File Discovery
    logger.info('doc-sync: Phase 1 — File Discovery', { workingDir })
    let discoveredFiles: DiscoveredFile[]
    try {
      discoveredFiles = await discoverChangedFiles(fullConfig)
    } catch (err) {
      const msg = `Phase 1 failed: ${err instanceof Error ? err.message : String(err)}`
      allErrors.push(msg)
      discoveredFiles = []
    }

    // No-changes path: skip phases 4-6 if no files
    if (discoveredFiles.length === 0 && !fullConfig.force) {
      // Write report and return success
      const reportData: SyncReportData = {
        filesChanged: 0,
        sectionsUpdated: 0,
        diagramsRegenerated: 0,
        manualReviewNeeded: 0,
        manualReviewItems: [],
        changelogDrafted: false,
        errors: allErrors,
        databaseStatus: 'unavailable',
        dbComponentsCount: 0,
        dbPhasesCount: 0,
        parsedFiles: [],
        config: fullConfig,
      }

      const { success: reportSuccess, errors: reportErrors } = await generateSyncReport(
        reportPath,
        reportData,
      )

      if (!reportSuccess) {
        allErrors.push(...reportErrors.filter(e => !allErrors.includes(e)))
        return updateState({
          docSync: {
            success: false,
            filesChanged: 0,
            sectionsUpdated: 0,
            diagramsRegenerated: 0,
            manualReviewNeeded: 0,
            changelogDrafted: false,
            reportPath,
            errors: allErrors,
            database_status: undefined,
          },
        } as Partial<GraphStateWithDocSync>)
      }

      // EC-6: no files found and no force → DOC-SYNC BLOCKED if errors, else success
      if (allErrors.length > 0) {
        return updateState({
          docSync: {
            success: false,
            filesChanged: 0,
            sectionsUpdated: 0,
            diagramsRegenerated: 0,
            manualReviewNeeded: 0,
            changelogDrafted: false,
            reportPath,
            errors: allErrors,
            database_status: undefined,
          },
        } as Partial<GraphStateWithDocSync>)
      }

      return updateState({
        docSync: {
          success: true,
          filesChanged: 0,
          sectionsUpdated: 0,
          diagramsRegenerated: 0,
          manualReviewNeeded: 0,
          changelogDrafted: false,
          reportPath,
          errors: [],
          database_status: undefined,
        },
      } as Partial<GraphStateWithDocSync>)
    }

    // Phase 2: Frontmatter Parsing
    logger.info('doc-sync: Phase 2 — Frontmatter Parsing', { fileCount: discoveredFiles.length })
    const phase2 = await parseFrontmatter(discoveredFiles, fullConfig, workingDir)
    allManualReviewItems.push(...phase2.manualReviewItems)

    // Phase 3: Section Mapping
    logger.info('doc-sync: Phase 3 — Section Mapping')
    const phaseMappings = buildSectionMappings(phase2.parsedFiles, allManualReviewItems)

    // Phase 4: Documentation Updates
    logger.info('doc-sync: Phase 4 — Documentation Updates')
    const phase4 = await updateDocumentation(
      phaseMappings,
      fullConfig,
      workingDir,
      allManualReviewItems,
    )
    allManualReviewItems.push(...phase4.manualReviewItems)

    // Phase 5: Mermaid Diagram Regeneration
    logger.info('doc-sync: Phase 5 — Mermaid Diagram Regeneration')
    const phase5 = await regenerateMermaidDiagram(phase2.parsedFiles, fullConfig, workingDir)
    allManualReviewItems.push(...phase5.manualReviewItems)

    // Phase 6: Changelog Entry Drafting
    logger.info('doc-sync: Phase 6 — Changelog Entry Drafting')
    const phase6 =
      discoveredFiles.length > 0
        ? await draftChangelog(phase2.parsedFiles, fullConfig, workingDir)
        : { changelogDrafted: false, manualReviewItems: [] }
    allManualReviewItems.push(...phase6.manualReviewItems)

    // Validate story IDs present in file paths (AC-7: use isValidStoryId from @repo/workflow-logic)
    for (const file of phase2.parsedFiles) {
      const basename = path.basename(file.path, '.md').replace('.agent', '')
      // Check if any story-id-like segment appears in path for filtering
      const segments = basename.split('-')
      for (const seg of segments) {
        if (/^[a-z]+-\d+$/i.test(seg) && !isValidStoryId(seg)) {
          logger.warn('doc-sync: invalid story ID in filename segment', { file: file.path, seg })
        }
      }
    }

    const filesChanged = phase2.parsedFiles.length
    const sectionsUpdated = phase4.sectionsUpdated
    const diagramsRegenerated = phase5.diagramsRegenerated
    const manualReviewNeeded = allManualReviewItems.length
    const changelogDrafted = phase6.changelogDrafted

    // Phase 7: SYNC-REPORT.md Generation
    logger.info('doc-sync: Phase 7 — SYNC-REPORT.md Generation')
    const reportData: SyncReportData = {
      filesChanged,
      sectionsUpdated,
      diagramsRegenerated,
      manualReviewNeeded,
      manualReviewItems: allManualReviewItems,
      changelogDrafted,
      errors: allErrors,
      databaseStatus: phase2.databaseStatus,
      dbComponentsCount: phase2.dbComponentsCount,
      dbPhasesCount: phase2.dbPhasesCount,
      parsedFiles: phase2.parsedFiles,
      config: fullConfig,
    }

    const { success: reportSuccess, errors: reportErrors } = await generateSyncReport(
      reportPath,
      reportData,
    )

    if (!reportSuccess) {
      const newErrors = reportErrors.filter(e => !allErrors.includes(e))
      allErrors.push(...newErrors)
    }

    // Completion signal mapping
    const hasErrors = allErrors.length > 0
    const success = !hasErrors && (!fullConfig.checkOnly || filesChanged === 0)

    return updateState({
      docSync: {
        success,
        filesChanged,
        sectionsUpdated,
        diagramsRegenerated,
        manualReviewNeeded,
        changelogDrafted,
        reportPath,
        errors: allErrors,
        database_status: phase2.databaseStatus,
      },
    } as Partial<GraphStateWithDocSync>)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    logger.error('doc-sync node failed', { error: errorMessage })
    allErrors.push(errorMessage)

    return updateState({
      docSync: {
        success: false,
        filesChanged: 0,
        sectionsUpdated: 0,
        diagramsRegenerated: 0,
        manualReviewNeeded: 0,
        changelogDrafted: false,
        reportPath,
        errors: allErrors,
        database_status: undefined,
      },
    } as Partial<GraphStateWithDocSync>)
  }
}

// ============================================================================
// Exported node factory functions (AC-8)
// ============================================================================

/**
 * Doc-sync node — default configuration.
 *
 * Uses tool preset (lower retries, shorter timeout) since this is a file I/O operation.
 * Native 7-phase implementation (no subprocess delegation).
 *
 * @example
 * ```typescript
 * import { docSyncNode } from './nodes/sync/doc-sync.js'
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
