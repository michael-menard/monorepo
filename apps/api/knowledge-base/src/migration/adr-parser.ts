/**
 * ADR-LOG.md Parser
 *
 * Parses ADR-LOG.md files to extract individual Architecture Decision Records
 * for KB import.
 *
 * @see Migration plan for ADR migration requirements
 */

import { logger } from '@repo/logger'
import {
  type ADREntry,
  type ParsedADRFile,
  type ADRStatus,
  ADR_STATUSES,
} from './__types__/index.js'

/**
 * Regex patterns for parsing ADR-LOG.md structure.
 */
const PATTERNS = {
  // ADR section heading: ## ADR-XXX: Title
  adrHeading: /^##\s+(ADR-\d+):\s*(.+)$/m,

  // Date line: **Date**: YYYY-MM-DD
  dateLine: /^\*\*Date\*\*:\s*(\d{4}-\d{2}-\d{2})/m,

  // Status line: **Status**: Active | Deprecated | Superseded
  statusLine: /^\*\*Status\*\*:\s*(\w+)/m,

  // Context line: **Context**: ...
  contextLine: /^\*\*Context\*\*:\s*(.+)$/m,

  // Subsection heading: ### Section Name
  subsectionHeading: /^###\s+(.+)$/m,

  // Related file: - `path/to/file`
  relatedFile: /^-\s+`([^`]+)`/,

  // Code block
  codeBlock: /^```[\s\S]*?^```$/m,
}

/**
 * Parse a single ADR-LOG.md file.
 *
 * @param content - File content to parse
 * @param sourceFile - Source file path for traceability
 * @returns Parsed ADRs and warnings
 */
export function parseADRFile(content: string, sourceFile: string): ParsedADRFile {
  const adrs: ADREntry[] = []
  const warnings: string[] = []

  logger.debug('Parsing ADR file', { sourceFile, contentLength: content.length })

  // Split by ADR headings
  const sections = content.split(/(?=^## ADR-\d+:)/m).filter(s => s.trim())

  for (const section of sections) {
    const lines = section.split('\n')
    const headingLine = lines[0]

    // Check for ADR heading
    const headingMatch = headingLine?.match(PATTERNS.adrHeading)
    if (!headingMatch) continue

    const adr: ADREntry = {
      id: headingMatch[1],
      title: headingMatch[2].trim(),
      status: 'Active',
      decision: '',
      related_files: [],
      source_file: sourceFile,
    }

    // Parse metadata lines
    const sectionContent = lines.slice(1).join('\n')

    // Extract date
    const dateMatch = sectionContent.match(PATTERNS.dateLine)
    if (dateMatch) {
      adr.date = dateMatch[1]
    }

    // Extract status
    const statusMatch = sectionContent.match(PATTERNS.statusLine)
    if (statusMatch) {
      const status = statusMatch[1] as ADRStatus
      if (ADR_STATUSES.includes(status)) {
        adr.status = status
      }
    }

    // Extract context
    const contextMatch = sectionContent.match(PATTERNS.contextLine)
    if (contextMatch) {
      adr.context = contextMatch[1].trim()
    }

    // Parse subsections
    const subsections = parseSubsections(sectionContent)

    // Map subsections to ADR fields
    if (subsections['Problem']) {
      adr.problem = subsections['Problem']
    }
    if (subsections['Decision']) {
      adr.decision = subsections['Decision']
    }
    if (subsections['Consequences']) {
      adr.consequences = subsections['Consequences']
    }

    // Extract related files
    if (subsections['Related Files']) {
      const relatedContent = subsections['Related Files']
      const fileMatches = relatedContent.matchAll(/`([^`]+)`/g)
      for (const match of fileMatches) {
        adr.related_files.push(match[1])
      }
    }

    // If no decision extracted, use entire section content
    if (!adr.decision && sectionContent.length > 50) {
      adr.decision = normalizeContent(sectionContent.slice(0, 500))
      warnings.push(`ADR ${adr.id}: No explicit Decision section found, using section content`)
    }

    // Only add if we have meaningful content
    if (adr.decision || adr.problem || adr.context) {
      adrs.push(adr)
    } else {
      warnings.push(`ADR ${adr.id}: No meaningful content extracted`)
    }
  }

  if (adrs.length === 0 && content.length > 100) {
    warnings.push(`No ADRs extracted from ${sourceFile} - format may not match expected structure`)
  }

  logger.info('Parsed ADR file', {
    sourceFile,
    adrsExtracted: adrs.length,
    warningCount: warnings.length,
  })

  return {
    source_file: sourceFile,
    adrs,
    warnings,
  }
}

/**
 * Parse subsections from section content.
 *
 * @param content - Section content to parse
 * @returns Map of subsection name to content
 */
function parseSubsections(content: string): Record<string, string> {
  const subsections: Record<string, string> = {}
  const parts = content.split(/(?=^### )/m)

  for (const part of parts) {
    const lines = part.split('\n')
    const headingMatch = lines[0]?.match(PATTERNS.subsectionHeading)

    if (headingMatch) {
      const name = headingMatch[1].trim()
      const subsectionContent = lines.slice(1).join('\n').trim()
      if (subsectionContent) {
        subsections[name] = normalizeContent(subsectionContent)
      }
    }
  }

  return subsections
}

/**
 * Normalize content by trimming and collapsing excessive whitespace.
 *
 * @param content - Raw content to normalize
 * @returns Normalized content
 */
function normalizeContent(content: string): string {
  // Trim and remove empty lines at edges
  let normalized = content.trim()

  // Collapse more than 2 consecutive newlines
  normalized = normalized.replace(/\n{3,}/g, '\n\n')

  // Remove trailing whitespace from each line
  normalized = normalized
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')

  return normalized
}

export { PATTERNS }
