/**
 * markdown.ts
 *
 * Shared markdown parsing utilities for the orchestrator package.
 * Used by normalize-plan, extract-flows, and other nodes that need
 * to extract structured content from markdown documents.
 *
 * @module utils/markdown
 */

/**
 * Extract a markdown section value by heading name.
 * Supports ## Heading and # Heading formats.
 * Returns trimmed content between this heading and the next heading of the
 * SAME OR HIGHER level (lower or equal # count). Sub-headings within the
 * section are included.
 */
export function extractSection(markdown: string, sectionName: string): string {
  const lines = markdown.split('\n')
  let capturing = false
  let captureLevel = 0
  const captured: string[] = []

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const heading = headingMatch[2].trim()

      if (capturing) {
        // Stop only when we encounter a heading of the same or higher level
        if (level <= captureLevel) {
          break
        }
        // Sub-heading inside section — keep capturing
      } else if (heading.toLowerCase() === sectionName.toLowerCase()) {
        capturing = true
        captureLevel = level
        continue
      }
    }
    if (capturing) {
      captured.push(line)
    }
  }

  return captured.join('\n').trim()
}

/**
 * Extract a list from a section — returns array of non-empty lines
 * stripped of leading list markers (-, *, numbers).
 * Excludes lines that are sub-headings (### ...).
 */
export function extractList(markdown: string, sectionName: string): string[] {
  const section = extractSection(markdown, sectionName)
  if (!section) return []

  return section
    .split('\n')
    .filter(line => !line.match(/^#{1,6}\s/)) // skip sub-headings
    .map(line => line.replace(/^[-*\d.]+\s*/, '').trim())
    .filter(line => line.length > 0)
}
