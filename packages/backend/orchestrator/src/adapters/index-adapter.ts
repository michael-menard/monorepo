/**
 * Index Adapter
 *
 * Type-safe adapter for reading and updating markdown table-based story index files.
 * Parses index files like platform.stories.index.md with wave sections and story tables.
 *
 * Features:
 * - Parse markdown tables with YAML frontmatter
 * - Update story status markers in-place
 * - Add/remove stories from wave sections
 * - Validate index structure (uniqueness, dependencies, circular refs)
 * - Recalculate metrics (counts by status/epic/wave, completion %)
 * - Atomic writes (temp file + rename pattern)
 *
 * @example
 * ```typescript
 * const adapter = new IndexAdapter()
 *
 * // Read an index
 * const index = await adapter.readIndex('/path/to/platform.stories.index.md')
 *
 * // Update a story status
 * await adapter.updateStoryStatus('LNGG-0020', 'completed', indexPath)
 *
 * // Validate structure
 * const validation = adapter.validate(index)
 * if (!validation.valid) {
 *   console.error('Validation errors:', validation.errors)
 * }
 * ```
 */

import { z } from 'zod'
import matter from 'gray-matter'
import { logger } from '@repo/logger'
import { writeFileAtomic, readFileSafe } from './utils/file-utils.js'
import {
  InvalidIndexError,
  CircularDependencyError,
  DuplicateStoryIdError,
  StoryNotInIndexError,
  InvalidYAMLError,
} from './__types__/index.js'

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * Story status enumeration
 */
export const StoryStatusSchema = z.enum([
  'backlog',
  'created',
  'ready-to-work',
  'in-progress',
  'in-qa',
  'uat',
  'completed',
])

export type StoryStatus = z.infer<typeof StoryStatusSchema>

/**
 * Index story entry schema
 */
export const IndexStoryEntrySchema = z.object({
  /** Row number in table */
  number: z.number().int().positive(),
  /** Story ID (e.g., LNGG-0020) */
  story_id: z.string(),
  /** Story title (without status marker) */
  title: z.string(),
  /** Whether story has been started (from S column) */
  started: z.boolean(),
  /** Story status (extracted from title or backlog) */
  status: StoryStatusSchema,
  /** Dependencies (story IDs this depends on) */
  depends_on: z.array(z.string()).optional(),
  /** Epic identifier */
  epic: z.string().optional(),
  /** Priority (P0, P1, P2, P3) */
  priority: z.string().optional(),
  /** Wave name this story belongs to */
  wave: z.string(),
  /** Stories blocked by this one */
  blocks: z.array(z.string()).optional(),
  /** Raw title as it appears in table (with emojis, status, etc.) */
  raw_title: z.string(),
})

export type IndexStoryEntry = z.infer<typeof IndexStoryEntrySchema>

/**
 * Index metrics schema
 */
export const IndexMetricsSchema = z.object({
  /** Total number of stories */
  total: z.number().int().nonnegative(),
  /** Count by status */
  by_status: z.record(StoryStatusSchema, z.number().int().nonnegative()),
  /** Count by epic */
  by_epic: z.record(z.string(), z.number().int().nonnegative()),
  /** Count by wave */
  by_wave: z.record(z.string(), z.number().int().nonnegative()),
  /** Completion percentage (0-100) */
  completion_percent: z.number().min(0).max(100),
})

export type IndexMetrics = z.infer<typeof IndexMetricsSchema>

/**
 * Validation error schema
 */
export const ValidationErrorSchema = z.object({
  /** Error type */
  type: z.enum(['duplicate_id', 'circular_dependency', 'missing_dependency', 'invalid_structure']),
  /** Error message */
  message: z.string(),
  /** Related story IDs */
  stories: z.array(z.string()).optional(),
  /** Location in file */
  location: z.string().optional(),
})

export type ValidationError = z.infer<typeof ValidationErrorSchema>

/**
 * Validation result schema
 */
export const ValidationResultSchema = z.object({
  /** Whether index is valid */
  valid: z.boolean(),
  /** Validation errors (empty if valid) */
  errors: z.array(ValidationErrorSchema),
})

export type ValidationResult = z.infer<typeof ValidationResultSchema>

/**
 * Wave section schema
 */
export const WaveSectionSchema = z.object({
  /** Wave name (e.g., "Wave 1 — Foundation") */
  name: z.string(),
  /** Wave description/subtitle */
  description: z.string().optional(),
  /** Number of stories in this wave */
  story_count: z.number().int().nonnegative(),
  /** Stories in this wave */
  stories: z.array(IndexStoryEntrySchema),
})

export type WaveSection = z.infer<typeof WaveSectionSchema>

/**
 * Story index schema (complete parsed index)
 */
export const StoryIndexSchema = z.object({
  /** YAML frontmatter */
  frontmatter: z.record(z.unknown()),
  /** Wave sections */
  waves: z.array(WaveSectionSchema),
  /** All stories (flattened) */
  stories: z.array(IndexStoryEntrySchema),
  /** Calculated metrics */
  metrics: IndexMetricsSchema,
  /** Raw markdown content */
  rawContent: z.string(),
})

export type StoryIndex = z.infer<typeof StoryIndexSchema>

/**
 * Status marker mappings (status -> markdown bold text)
 */
export const StatusMarkerMap: Record<StoryStatus, string> = {
  backlog: '',
  created: '**created**',
  'ready-to-work': '**ready-to-work**',
  'in-progress': '**in-progress**',
  'in-qa': '**in-qa**',
  uat: '**uat**',
  completed: '**completed**',
}

/**
 * Reverse mapping (markdown marker -> status)
 */
export const MarkerToStatusMap: Record<string, StoryStatus> = {
  '**created**': 'created',
  '**ready-to-work**': 'ready-to-work',
  '**in-progress**': 'in-progress',
  '**in-qa**': 'in-qa',
  '**uat**': 'uat',
  '**completed**': 'completed',
}

// ============================================================================
// IndexAdapter Class
// ============================================================================

/**
 * Index Adapter
 *
 * Provides type-safe operations for story index markdown files.
 */
export class IndexAdapter {
  /**
   * Read and parse an index file
   *
   * @param indexPath - Absolute path to index markdown file
   * @returns Parsed StoryIndex object
   * @throws {ReadError} If file read fails
   * @throws {InvalidYAMLError} If YAML frontmatter parsing fails
   * @throws {InvalidIndexError} If index structure is invalid
   */
  async readIndex(indexPath: string): Promise<StoryIndex> {
    logger.info('Reading index file', { indexPath })

    try {
      // Read file content
      const content = await readFileSafe(indexPath)

      // Parse YAML frontmatter
      const parsed = matter(content)
      const frontmatter = parsed.data

      // Parse wave sections
      const waves = this.parseWaveSections(parsed.content)

      // Flatten all stories
      const stories = waves.flatMap(wave => wave.stories)

      // Calculate metrics
      const metrics = this.recalculateMetrics({ waves, stories } as StoryIndex)

      const index: StoryIndex = {
        frontmatter,
        waves,
        stories,
        metrics,
        rawContent: content,
      }

      logger.info('Index file read successfully', {
        indexPath,
        waveCount: waves.length,
        storyCount: stories.length,
      })

      return index
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw error
      }
      if (error instanceof InvalidYAMLError || error instanceof InvalidIndexError) {
        throw error
      }
      throw new InvalidYAMLError(indexPath, error as Error)
    }
  }

  /**
   * Write index back to markdown file
   *
   * Reconstructs markdown from StoryIndex object and writes atomically.
   *
   * @param index - StoryIndex object to write
   * @param indexPath - Absolute path to index markdown file
   * @throws {WriteError} If file write fails
   */
  async writeIndex(index: StoryIndex, indexPath: string): Promise<void> {
    logger.info('Writing index file', { indexPath, storyCount: index.stories.length })

    // Reconstruct markdown content
    const markdown = this.serializeIndex(index)

    // Write atomically
    await writeFileAtomic(indexPath, markdown)

    logger.info('Index file written successfully', { indexPath })
  }

  /**
   * Update a story's status marker in the index
   *
   * @param storyId - Story ID to update
   * @param status - New status
   * @param indexPath - Absolute path to index file
   * @throws {StoryNotInIndexError} If story not found
   * @throws {ReadError} If file read fails
   * @throws {WriteError} If file write fails
   */
  async updateStoryStatus(storyId: string, status: StoryStatus, indexPath: string): Promise<void> {
    logger.info('Updating story status', { storyId, status, indexPath })

    // Read current index
    const index = await this.readIndex(indexPath)

    // Find story
    const story = index.stories.find(s => s.story_id === storyId)
    if (!story) {
      throw new StoryNotInIndexError(storyId, indexPath)
    }

    // Update status in the story entry
    const oldStatus = story.status
    story.status = status

    // Update raw_title to reflect new status
    const oldMarker = StatusMarkerMap[oldStatus]
    const newMarker = StatusMarkerMap[status]

    // Remove old marker if present
    let newRawTitle = story.raw_title
    if (oldMarker) {
      newRawTitle = newRawTitle.replace(oldMarker, '').trim()
    }

    // Add new marker if applicable
    if (newMarker) {
      newRawTitle = `${newRawTitle} ${newMarker}`
    }

    story.raw_title = newRawTitle

    // Recalculate metrics
    index.metrics = this.recalculateMetrics(index)

    // Write updated index
    await this.writeIndex(index, indexPath)

    logger.info('Story status updated successfully', { storyId, oldStatus, newStatus: status })
  }

  /**
   * Add a new story to a wave section
   *
   * @param entry - Story entry to add
   * @param waveSection - Wave section name to add to
   * @param indexPath - Absolute path to index file
   * @throws {InvalidIndexError} If wave section not found
   * @throws {DuplicateStoryIdError} If story ID already exists
   */
  async addStory(entry: IndexStoryEntry, waveSection: string, indexPath: string): Promise<void> {
    logger.info('Adding story to index', {
      storyId: entry.story_id,
      wave: waveSection,
      indexPath,
    })

    // Read current index
    const index = await this.readIndex(indexPath)

    // Check for duplicate
    const existing = index.stories.find(s => s.story_id === entry.story_id)
    if (existing) {
      throw new DuplicateStoryIdError(entry.story_id)
    }

    // Find wave
    const wave = index.waves.find(w => w.name === waveSection)
    if (!wave) {
      throw new InvalidIndexError(indexPath, [
        { type: 'invalid_structure', message: `Wave section not found: ${waveSection}` },
      ])
    }

    // Assign sequential number
    const maxNumber = Math.max(0, ...index.stories.map(s => s.number))
    entry.number = maxNumber + 1
    entry.wave = waveSection

    // Add to wave
    wave.stories.push(entry)
    wave.story_count = wave.stories.length

    // Update flattened stories list
    index.stories = index.waves.flatMap(w => w.stories)

    // Recalculate metrics
    index.metrics = this.recalculateMetrics(index)

    // Write updated index
    await this.writeIndex(index, indexPath)

    logger.info('Story added successfully', { storyId: entry.story_id })
  }

  /**
   * Remove a story from the index
   *
   * @param storyId - Story ID to remove
   * @param indexPath - Absolute path to index file
   * @throws {StoryNotInIndexError} If story not found
   */
  async removeStory(storyId: string, indexPath: string): Promise<void> {
    logger.info('Removing story from index', { storyId, indexPath })

    // Read current index
    const index = await this.readIndex(indexPath)

    // Find story
    const story = index.stories.find(s => s.story_id === storyId)
    if (!story) {
      throw new StoryNotInIndexError(storyId, indexPath)
    }

    // Find wave and remove story
    const wave = index.waves.find(w => w.name === story.wave)
    if (wave) {
      wave.stories = wave.stories.filter(s => s.story_id !== storyId)
      wave.story_count = wave.stories.length
    }

    // Update flattened stories list
    index.stories = index.waves.flatMap(w => w.stories)

    // Recalculate metrics
    index.metrics = this.recalculateMetrics(index)

    // Write updated index
    await this.writeIndex(index, indexPath)

    logger.info('Story removed successfully', { storyId })
  }

  /**
   * Recalculate metrics from current story data
   *
   * @param index - Story index
   * @returns Updated metrics
   */
  recalculateMetrics(index: Pick<StoryIndex, 'stories' | 'waves'>): IndexMetrics {
    const stories = index.stories

    // Count by status
    const byStatus: Record<string, number> = {}
    for (const status of StoryStatusSchema.options) {
      byStatus[status] = stories.filter(s => s.status === status).length
    }

    // Count by epic
    const byEpic: Record<string, number> = {}
    for (const story of stories) {
      if (story.epic) {
        byEpic[story.epic] = (byEpic[story.epic] || 0) + 1
      }
    }

    // Count by wave
    const byWave: Record<string, number> = {}
    for (const wave of index.waves) {
      byWave[wave.name] = wave.story_count
    }

    // Calculate completion percentage
    const completedCount = byStatus['completed'] || 0
    const total = stories.length
    const completionPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0

    return {
      total,
      by_status: byStatus as Record<StoryStatus, number>,
      by_epic: byEpic,
      by_wave: byWave,
      completion_percent: completionPercent,
    }
  }

  /**
   * Validate index structure
   *
   * Checks for:
   * - Duplicate story IDs
   * - Circular dependencies
   * - Missing dependency references
   *
   * @param index - Story index to validate
   * @returns Validation result
   */
  validate(index: StoryIndex): ValidationResult {
    const errors: ValidationError[] = []

    // Check for duplicate IDs
    const idCounts = new Map<string, number>()
    for (const story of index.stories) {
      idCounts.set(story.story_id, (idCounts.get(story.story_id) || 0) + 1)
    }

    for (const [id, count] of idCounts.entries()) {
      if (count > 1) {
        errors.push({
          type: 'duplicate_id',
          message: `Duplicate story ID found ${count} times`,
          stories: [id],
        })
      }
    }

    // Check for missing dependency references
    const allIds = new Set(index.stories.map(s => s.story_id))
    for (const story of index.stories) {
      if (story.depends_on) {
        for (const depId of story.depends_on) {
          if (!allIds.has(depId)) {
            errors.push({
              type: 'missing_dependency',
              message: `Story ${story.story_id} depends on ${depId} which does not exist`,
              stories: [story.story_id, depId],
            })
          }
        }
      }
    }

    // Check for circular dependencies
    try {
      this.detectCircularDependencies(index.stories)
    } catch (error) {
      if (error instanceof CircularDependencyError) {
        errors.push({
          type: 'circular_dependency',
          message: error.message,
          stories: error.cycle,
        })
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Detect circular dependencies in story graph
   *
   * @param stories - List of stories to check
   * @throws {CircularDependencyError} If circular dependency detected
   */
  detectCircularDependencies(stories: IndexStoryEntry[]): void {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    const storyMap = new Map<string, IndexStoryEntry>()

    // Build story map
    for (const story of stories) {
      storyMap.set(story.story_id, story)
    }

    // DFS to detect cycles
    const visit = (storyId: string, path: string[]): void => {
      if (recursionStack.has(storyId)) {
        // Found cycle
        const cycleStart = path.indexOf(storyId)
        const cycle = [...path.slice(cycleStart), storyId]
        throw new CircularDependencyError(cycle)
      }

      if (visited.has(storyId)) {
        return
      }

      visited.add(storyId)
      recursionStack.add(storyId)

      const story = storyMap.get(storyId)
      if (story?.depends_on) {
        for (const depId of story.depends_on) {
          visit(depId, [...path, storyId])
        }
      }

      recursionStack.delete(storyId)
    }

    // Check each story
    for (const story of stories) {
      if (!visited.has(story.story_id)) {
        visit(story.story_id, [])
      }
    }
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Parse wave sections from markdown content
   */
  private parseWaveSections(content: string): WaveSection[] {
    const waves: WaveSection[] = []
    const lines = content.split('\n')

    let currentWave: WaveSection | null = null
    let currentTable: string[] = []
    let inTable = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Detect wave header (## Wave X — Name)
      // Only match lines that start with "## Wave" to avoid matching other ## headers
      const waveMatch = line.match(/^##\s+Wave\s+\d+[^(]*(?:\((\d+)\s+stories?\))?$/)
      if (waveMatch) {
        // Save previous wave if exists
        if (currentWave && currentTable.length > 0) {
          currentWave.stories = this.parseTableRows(currentTable.join('\n'), currentWave.name)
          currentWave.story_count = currentWave.stories.length
          waves.push(currentWave)
        }

        // Start new wave
        currentWave = {
          // Extract wave name without the story count parenthetical
          name: line
            .replace(/^##\s+/, '')
            .replace(/\s*\(\d+\s+stories?\)$/, '')
            .trim(),
          // Extract story count from match group 1 (was group 2 before)
          story_count: waveMatch[1] ? parseInt(waveMatch[1], 10) : 0,
          stories: [],
        }
        currentTable = []
        inTable = false
        continue
      }

      // Detect table start
      if (line.trim().startsWith('|') && line.includes('Story') && line.includes('Title')) {
        inTable = true
        currentTable = [line]
        continue
      }

      // Accumulate table rows
      if (inTable && line.trim().startsWith('|')) {
        currentTable.push(line)
      } else if (inTable && !line.trim().startsWith('|')) {
        // End of table
        if (currentWave && currentTable.length > 0) {
          currentWave.stories = this.parseTableRows(currentTable.join('\n'), currentWave.name)
          currentWave.story_count = currentWave.stories.length
        }
        inTable = false
        currentTable = []
      }

      // Extract description (text after wave header, before table)
      if (currentWave && !currentWave.description && !inTable) {
        const descMatch = line.match(/^[⚡🎯✨🎉]\s*(.+)/u)
        if (descMatch) {
          currentWave.description = descMatch[1]!.trim()
        }
      }
    }

    // Save last wave
    if (currentWave) {
      if (currentTable.length > 0) {
        currentWave.stories = this.parseTableRows(currentTable.join('\n'), currentWave.name)
        currentWave.story_count = currentWave.stories.length
      }
      waves.push(currentWave)
    }

    return waves
  }

  /**
   * Parse markdown table rows into story entries
   */
  private parseTableRows(tableContent: string, waveName: string): IndexStoryEntry[] {
    const stories: IndexStoryEntry[] = []
    const lines = tableContent.split('\n').filter(line => line.trim())

    // Extract header to determine column positions
    const headerLine = lines[0]
    if (!headerLine) return stories

    const headers = headerLine
      .split('|')
      .map(h => h.trim())
      .filter(h => h)

    // Find column indices
    const colIndices = {
      number: headers.findIndex(h => h === '#'),
      started: headers.findIndex(h => h === 'S'),
      story: headers.findIndex(h => h === 'Story'),
      title: headers.findIndex(h => h === 'Title'),
      depends: headers.findIndex(h => h.includes('Depends On') || h.includes('←')),
      blocks: headers.findIndex(h => h === 'Blocks'),
      epic: headers.findIndex(h => h === 'Epic'),
      priority: headers.findIndex(h => h === 'Priority'),
    }

    // Parse data rows (skip header and separator)
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i]
      if (!line || !line.includes('|')) continue

      const cells = line
        .split('|')
        .map(c => c.trim())
        .filter((_, idx) => idx > 0 && idx <= headers.length)

      if (cells.length < 3) continue

      // Extract fields
      const number = parseInt(cells[colIndices.number] || '0', 10) || 0
      const started = (cells[colIndices.started] || '').toLowerCase() === 'x'
      const storyId = (cells[colIndices.story] || '').trim()
      const rawTitle = (cells[colIndices.title] || '').trim()
      const dependsRaw = cells[colIndices.depends] || ''
      const blocksRaw = cells[colIndices.blocks] || ''
      const epic = (cells[colIndices.epic] || '').trim()
      const priority = (cells[colIndices.priority] || '').replace(/\*\*/g, '').trim()

      if (!storyId || !rawTitle) continue

      // Extract status from title
      let status: StoryStatus = 'backlog'
      let cleanTitle = rawTitle

      for (const [marker, stat] of Object.entries(MarkerToStatusMap)) {
        if (rawTitle.includes(marker)) {
          status = stat
          cleanTitle = rawTitle.replace(marker, '').trim()
          break
        }
      }

      // Remove emojis from clean title (but keep in raw_title)
      cleanTitle = cleanTitle.replace(/[⚡🎯✨🎉]/gu, '').trim()

      // Parse dependencies
      const dependsOn = dependsRaw
        ? dependsRaw
            .replace(/←/g, '')
            .split(',')
            .map(d => d.trim())
            .filter(d => d && d.match(/^[A-Z]+-\d+$/))
        : undefined

      // Parse blocks
      const blocks = blocksRaw
        ? blocksRaw
            .split(',')
            .map(b => b.trim())
            .filter(b => b && b.match(/^[A-Z]+-\d+$/))
        : undefined

      const entry: IndexStoryEntry = {
        number,
        story_id: storyId,
        title: cleanTitle,
        started,
        status,
        depends_on: dependsOn && dependsOn.length > 0 ? dependsOn : undefined,
        epic: epic || undefined,
        priority: priority || undefined,
        wave: waveName,
        blocks: blocks && blocks.length > 0 ? blocks : undefined,
        raw_title: rawTitle,
      }

      stories.push(entry)
    }

    return stories
  }

  /**
   * Serialize StoryIndex back to markdown
   */
  private serializeIndex(index: StoryIndex): string {
    // Serialize frontmatter
    const frontmatterYaml = matter.stringify('', index.frontmatter)
    const frontmatterLines = frontmatterYaml.split('\n').slice(0, -1) // Remove trailing newline

    // Build markdown content
    const contentLines: string[] = []

    // Add waves
    for (const wave of index.waves) {
      contentLines.push(`## ${wave.name} (${wave.story_count} stories)`)
      contentLines.push('')

      if (wave.description) {
        contentLines.push(wave.description)
        contentLines.push('')
      }

      // Build table
      if (wave.stories.length > 0) {
        const tableLines = this.formatTableForWave(wave)
        contentLines.push(...tableLines)
        contentLines.push('')
        contentLines.push('---')
        contentLines.push('')
      }
    }

    // Combine frontmatter and content
    return [...frontmatterLines, '', ...contentLines].join('\n')
  }

  /**
   * Format a wave section as a markdown table
   */
  private formatTableForWave(wave: WaveSection): string[] {
    const lines: string[] = []

    // Determine which columns this wave uses
    const hasDepends = wave.stories.some(s => s.depends_on && s.depends_on.length > 0)
    const hasBlocks = wave.stories.some(s => s.blocks && s.blocks.length > 0)
    const hasPriority = wave.stories.some(s => s.priority)

    // Build header
    const headers = ['#', 'S', 'Story', 'Title']
    if (hasDepends) headers.push('← Depends On')
    if (hasBlocks) headers.push('Blocks')
    headers.push('Epic')
    if (hasPriority) headers.push('Priority')

    lines.push(`| ${headers.join(' | ')} |`)
    lines.push(`|${headers.map(() => '---').join('|')}|`)

    // Build rows
    for (const story of wave.stories) {
      const cells = [
        story.number.toString(),
        story.started ? 'x' : '',
        story.story_id,
        story.raw_title,
      ]

      if (hasDepends) {
        cells.push(story.depends_on ? `← ${story.depends_on.join(', ')}` : '')
      }
      if (hasBlocks) {
        cells.push(story.blocks ? story.blocks.join(', ') : '')
      }
      cells.push(story.epic || '')
      if (hasPriority) {
        cells.push(story.priority ? `**${story.priority}**` : '')
      }

      lines.push(`| ${cells.join(' | ')} |`)
    }

    return lines
  }
}
