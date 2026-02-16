/**
 * Content Formatter Tests
 *
 * @see LNGG-0050 AC-6
 */

import { describe, it, expect } from 'vitest'
import {
  formatLesson,
  formatDecision,
  formatConstraint,
  formatRunbook,
  formatNote,
} from '../utils/content-formatter.js'

describe('formatLesson', () => {
  it('formats basic lesson', () => {
    const result = formatLesson({
      content: 'Always validate inputs',
      storyId: 'LNGG-0050',
      role: 'all',
    })

    expect(result).toBe('**[LNGG-0050] LESSON**\n\nAlways validate inputs')
  })

  it('includes severity', () => {
    const result = formatLesson({
      content: 'Database migration failed',
      storyId: 'LNGG-0050',
      severity: 'high',
      role: 'dev',
    })

    expect(result).toContain('(high)')
    expect(result).toContain('Database migration failed')
  })

  it('includes category', () => {
    const result = formatLesson({
      content: 'Pattern works well',
      storyId: 'LNGG-0050',
      category: 'pattern',
      role: 'all',
    })

    expect(result).toContain('- pattern')
  })

  it('includes both category and severity', () => {
    const result = formatLesson({
      content: 'Blocker encountered',
      storyId: 'LNGG-0050',
      category: 'blocker',
      severity: 'high',
      role: 'all',
    })

    expect(result).toContain('- blocker')
    expect(result).toContain('(high)')
  })
})

describe('formatDecision', () => {
  it('formats basic decision', () => {
    const result = formatDecision({
      content: 'Use PostgreSQL for storage',
      storyId: 'LNGG-0050',
      role: 'all',
    })

    expect(result).toBe('**[LNGG-0050] DECISION**\n\nUse PostgreSQL for storage')
  })

  it('includes title', () => {
    const result = formatDecision({
      content: 'We chose PostgreSQL',
      storyId: 'LNGG-0050',
      title: 'Database Selection',
      role: 'all',
    })

    expect(result).toContain('- Database Selection')
  })

  it('includes rationale', () => {
    const result = formatDecision({
      content: 'Use PostgreSQL',
      storyId: 'LNGG-0050',
      rationale: 'Best for our use case',
      role: 'all',
    })

    expect(result).toContain('**Rationale:** Best for our use case')
  })

  it('includes consequences', () => {
    const result = formatDecision({
      content: 'Use PostgreSQL',
      storyId: 'LNGG-0050',
      consequences: 'Need to run migrations',
      role: 'all',
    })

    expect(result).toContain('**Consequences:** Need to run migrations')
  })

  it('includes all optional fields', () => {
    const result = formatDecision({
      content: 'Use PostgreSQL',
      storyId: 'LNGG-0050',
      title: 'DB Choice',
      rationale: 'Strong ecosystem',
      consequences: 'Migration complexity',
      role: 'all',
    })

    expect(result).toContain('- DB Choice')
    expect(result).toContain('**Rationale:** Strong ecosystem')
    expect(result).toContain('**Consequences:** Migration complexity')
  })
})

describe('formatConstraint', () => {
  it('formats basic constraint', () => {
    const result = formatConstraint({
      content: 'Must use Zod schemas',
      storyId: 'LNGG-0050',
      role: 'dev',
    })

    expect(result).toBe('**[LNGG-0050] CONSTRAINT**\n\nMust use Zod schemas')
  })

  it('includes priority', () => {
    const result = formatConstraint({
      content: 'No barrel files',
      storyId: 'LNGG-0050',
      priority: 'high',
      role: 'dev',
    })

    expect(result).toContain('(high)')
  })

  it('includes scope', () => {
    const result = formatConstraint({
      content: 'Use TypeScript strict mode',
      storyId: 'LNGG-0050',
      scope: 'backend',
      role: 'dev',
    })

    expect(result).toContain('- backend')
  })
})

describe('formatRunbook', () => {
  it('formats basic runbook', () => {
    const result = formatRunbook({
      content: 'Deploy to production',
      storyId: 'LNGG-0050',
      role: 'all',
    })

    expect(result).toBe('**[LNGG-0050] RUNBOOK**\n\nDeploy to production')
  })

  it('includes title', () => {
    const result = formatRunbook({
      content: 'Deploy steps',
      storyId: 'LNGG-0050',
      title: 'Production Deployment',
      role: 'all',
    })

    expect(result).toContain('- Production Deployment')
  })

  it('includes steps as numbered list', () => {
    const result = formatRunbook({
      content: 'Deployment process',
      storyId: 'LNGG-0050',
      steps: ['Run tests', 'Build', 'Deploy'],
      role: 'all',
    })

    expect(result).toContain('**Steps:**')
    expect(result).toContain('1. Run tests')
    expect(result).toContain('2. Build')
    expect(result).toContain('3. Deploy')
  })
})

describe('formatNote', () => {
  it('formats basic note', () => {
    const result = formatNote({
      content: 'Remember to update docs',
      role: 'all',
    })

    expect(result).toBe('**NOTE**\n\nRemember to update docs')
  })

  it('includes story ID when provided', () => {
    const result = formatNote({
      content: 'Update docs',
      storyId: 'LNGG-0050',
      role: 'all',
    })

    expect(result).toBe('**[LNGG-0050] NOTE**\n\nUpdate docs')
  })

  it('includes metadata', () => {
    const result = formatNote({
      content: 'Important note',
      storyId: 'LNGG-0050',
      metadata: {
        source: 'QA',
        priority: 3,
      },
      role: 'all',
    })

    expect(result).toContain('**Metadata:**')
    expect(result).toContain('- source: "QA"')
    expect(result).toContain('- priority: 3')
  })
})
