/**
 * Agent Mission Extractor
 * WINT-2040: Extract mission, role, scope, and signals from .agent.md body content
 *
 * Uses section-based regex extraction targeting H2/H3 headings.
 * Handles missing sections gracefully (returns null).
 * Body string comes from parseFrontmatter() { content } return value.
 */

import { z } from 'zod'

/**
 * Schema for extracted mission summary data
 * AC-7: All I/O types are Zod-validated schemas
 */
export const MissionSummarySchema = z.object({
  mission: z.string().max(200).nullable(),
  role: z.string().nullable(),
  scope: z.string().nullable(),
  triggers: z.array(z.string()).nullable(),
})

export type MissionSummary = z.infer<typeof MissionSummarySchema>

/**
 * Extract text content from a named H2 or H3 section in Markdown body content.
 * Stops at the next heading of equal or higher level.
 *
 * @param body - Markdown body content (frontmatter already stripped)
 * @param sectionName - Section heading to look for (case-insensitive)
 * @returns Extracted section text, or null if section not found
 */
export function extractSection(body: string, sectionName: string): string | null {
  // Match H2 (##) or H3 (###) headings with the given section name (case-insensitive)
  const escapedName = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const headingRegex = new RegExp(`^#{2,3}\\s+${escapedName}\\s*$`, 'im')

  const match = headingRegex.exec(body)
  if (!match) {
    return null
  }

  const startIndex = match.index + match[0].length
  const afterHeading = body.slice(startIndex)

  // Find the next H2 or H3 heading (##) to determine section end
  const nextHeadingMatch = /^#{2,3}\s+/m.exec(afterHeading)
  const sectionContent = nextHeadingMatch
    ? afterHeading.slice(0, nextHeadingMatch.index)
    : afterHeading

  // Trim and return null if empty
  const trimmed = sectionContent.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Extract bullet-list items from text content.
 * Handles both `- item` and `* item` list formats.
 *
 * @param text - Text content potentially containing a list
 * @returns Array of list item strings, or null if no items found
 */
export function extractListItems(text: string | null): string[] | null {
  if (!text) return null

  const lines = text.split('\n')
  const items: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    // Match bullet list items (- or *)
    const listMatch = /^[-*]\s+(.+)$/.exec(trimmed)
    if (listMatch) {
      items.push(listMatch[1].trim())
    }
  }

  return items.length > 0 ? items : null
}

/**
 * Truncate text to a maximum length, preserving whole words where possible.
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum character count
 * @returns Truncated text
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text

  // Reserve 3 chars for ellipsis so result stays within maxLength
  const limit = maxLength - 3

  // Try to cut at a sentence boundary first
  const truncated = text.slice(0, limit)
  const lastSentenceEnd = Math.max(truncated.lastIndexOf('. '), truncated.lastIndexOf('.\n'))

  if (lastSentenceEnd > limit * 0.6) {
    return truncated.slice(0, lastSentenceEnd + 1).trim()
  }

  // Fall back to word boundary
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > limit * 0.6) {
    return truncated.slice(0, lastSpace).trim() + '...'
  }

  // Hard truncate with ellipsis — stays within maxLength
  return truncated + '...'
}
/**
 * Extract mission summary from .agent.md body content.
 * Targets ## Mission, ## Role, ## Scope sections and frontmatter triggers.
 *
 * AC-2: Extracts mission summary and scope from Markdown body content
 * AC-7: Returns Zod-validated MissionSummary
 *
 * @param body - Markdown body content (frontmatter already stripped by gray-matter)
 * @returns Zod-validated MissionSummary object
 */
export function extractMissionSummary(body: string): MissionSummary {
  // Extract ## Mission section
  const missionText = extractSection(body, 'Mission')
  const mission = missionText ? truncateText(missionText, 200) : null

  // Extract ## Role section (some agents use Role instead of Mission)
  const roleText = extractSection(body, 'Role')
  const role = roleText ? truncateText(roleText, 300) : null

  // Extract ## Scope section
  const scopeText = extractSection(body, 'Scope')
  const scope = scopeText ? truncateText(scopeText, 300) : null

  // Extract triggers from ## Signals / ## Triggers section (body-based)
  const signalsText = extractSection(body, 'Signals') ?? extractSection(body, 'Triggers')
  const triggers = extractListItems(signalsText)

  return MissionSummarySchema.parse({
    mission,
    role,
    scope,
    triggers,
  })
}
