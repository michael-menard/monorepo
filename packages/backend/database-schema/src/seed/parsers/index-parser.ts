import { readFile } from 'fs/promises'
import { logger } from '@repo/logger'
import { z } from 'zod'

export const PhaseDataSchema = z.object({
  id: z.number().int().nonnegative(),
  phaseName: z.string().min(1),
  description: z.string().nullable(),
  phaseOrder: z.number().int().nonnegative(),
})

export type PhaseData = z.infer<typeof PhaseDataSchema>

/**
 * Parses stories.index.md to extract phase definitions
 * @param indexPath - Absolute path to stories.index.md
 * @returns Array of 8 phase objects
 */
export async function parseStoriesIndex(indexPath: string): Promise<PhaseData[]> {
  try {
    const content = await readFile(indexPath, 'utf-8')
    const phases: PhaseData[] = []

    // Regex to match "## Phase N: {Phase Name}" headers
    const phaseHeaderRegex = /^##\s+Phase\s+(\d+):\s+(.+)$/gm
    const matches = [...content.matchAll(phaseHeaderRegex)]

    for (const match of matches) {
      const phaseNumber = parseInt(match[1], 10)
      const phaseName = match[2].trim()

      // Extract description from the paragraph following the header
      const headerIndex = match.index!
      const nextHeaderMatch = content.slice(headerIndex + match[0].length).match(/^##/m)
      const nextHeaderIndex = nextHeaderMatch
        ? headerIndex + match[0].length + nextHeaderMatch.index!
        : content.length

      const sectionContent = content.slice(headerIndex + match[0].length, nextHeaderIndex).trim()

      // Extract first paragraph as description
      const firstParagraphMatch = sectionContent.match(/^([^\n]+(?:\n(?![\n#-])[^\n]+)*)/)
      const description = firstParagraphMatch ? firstParagraphMatch[1].trim() : null

      phases.push({
        id: phaseNumber,
        phaseName,
        description,
        phaseOrder: phaseNumber,
      })
    }

    if (phases.length !== 8) {
      logger.warn('Unexpected phase count', {
        expected: 8,
        actual: phases.length,
        file: indexPath,
      })
    }

    // Sort by phase order to ensure correct sequence
    phases.sort((a, b) => a.phaseOrder - b.phaseOrder)

    logger.info('Parsed phases from stories index', {
      count: phases.length,
      phases: phases.map(p => `${p.id}: ${p.phaseName}`),
    })

    return phases
  } catch (err) {
    const error = err as Error
    logger.error('Failed to parse stories index', {
      file: indexPath,
      error: error.message,
    })
    throw error
  }
}
