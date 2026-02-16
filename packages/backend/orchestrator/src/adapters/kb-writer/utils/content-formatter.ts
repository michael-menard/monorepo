/**
 * Content Formatting Utilities
 *
 * Formats KB entry content with consistent headers and structure.
 * Extracted from persist-learnings.ts formatLearningContent().
 *
 * @see LNGG-0050 AC-4
 */

import type {
  KbLessonRequest,
  KbDecisionRequest,
  KbConstraintRequest,
  KbRunbookRequest,
  KbNoteRequest,
} from '../__types__/index.js'

/**
 * Format lesson content for KB storage
 *
 * @param request - Lesson write request
 * @returns Formatted content with header
 */
export function formatLesson(request: KbLessonRequest): string {
  const header = `**[${request.storyId}] LESSON**`
  const severity = request.severity ? ` (${request.severity})` : ''
  const category = request.category ? ` - ${request.category}` : ''

  return `${header}${category}${severity}\n\n${request.content}`
}

/**
 * Format decision content for KB storage
 *
 * @param request - Decision write request
 * @returns Formatted content with header
 */
export function formatDecision(request: KbDecisionRequest): string {
  const header = `**[${request.storyId}] DECISION**`
  const title = request.title ? ` - ${request.title}` : ''

  let content = `${header}${title}\n\n${request.content}`

  if (request.rationale) {
    content += `\n\n**Rationale:** ${request.rationale}`
  }

  if (request.consequences) {
    content += `\n\n**Consequences:** ${request.consequences}`
  }

  return content
}

/**
 * Format constraint content for KB storage
 *
 * @param request - Constraint write request
 * @returns Formatted content with header
 */
export function formatConstraint(request: KbConstraintRequest): string {
  const header = `**[${request.storyId}] CONSTRAINT**`
  const priority = request.priority ? ` (${request.priority})` : ''
  const scope = request.scope ? ` - ${request.scope}` : ''

  return `${header}${scope}${priority}\n\n${request.content}`
}

/**
 * Format runbook content for KB storage
 *
 * @param request - Runbook write request
 * @returns Formatted content with header
 */
export function formatRunbook(request: KbRunbookRequest): string {
  const header = `**[${request.storyId}] RUNBOOK**`
  const title = request.title ? ` - ${request.title}` : ''

  let content = `${header}${title}\n\n${request.content}`

  if (request.steps && request.steps.length > 0) {
    content += '\n\n**Steps:**\n'
    request.steps.forEach((step, index) => {
      content += `${index + 1}. ${step}\n`
    })
  }

  return content
}

/**
 * Format note content for KB storage
 *
 * @param request - Note write request
 * @returns Formatted content with header
 */
export function formatNote(request: KbNoteRequest): string {
  const header = request.storyId ? `**[${request.storyId}] NOTE**` : '**NOTE**'

  let content = `${header}\n\n${request.content}`

  if (request.metadata && Object.keys(request.metadata).length > 0) {
    content += '\n\n**Metadata:**\n'
    for (const [key, value] of Object.entries(request.metadata)) {
      content += `- ${key}: ${JSON.stringify(value)}\n`
    }
  }

  return content
}
