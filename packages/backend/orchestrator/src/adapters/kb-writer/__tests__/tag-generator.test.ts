/**
 * Tag Generator Tests
 *
 * @see LNGG-0050 AC-6
 */

import { describe, it, expect } from 'vitest'
import { generateTags } from '../utils/tag-generator.js'

describe('generateTags', () => {
  it('generates lesson tags', () => {
    const tags = generateTags({
      entryType: 'lesson',
      storyId: 'LNGG-0050',
    })

    expect(tags).toContain('lesson-learned')
    expect(tags).toContain('story:lngg-0050')
    expect(tags.some(tag => tag.startsWith('date:'))).toBe(true)
  })

  it('generates decision tags', () => {
    const tags = generateTags({
      entryType: 'decision',
      storyId: 'LNGG-0050',
    })

    expect(tags).toContain('decision')
    expect(tags).toContain('architecture')
    expect(tags).toContain('story:lngg-0050')
  })

  it('generates constraint tags', () => {
    const tags = generateTags({
      entryType: 'constraint',
      storyId: 'LNGG-0050',
    })

    expect(tags).toContain('constraint')
  })

  it('generates runbook tags', () => {
    const tags = generateTags({
      entryType: 'runbook',
      storyId: 'LNGG-0050',
    })

    expect(tags).toContain('runbook')
  })

  it('generates note tags', () => {
    const tags = generateTags({
      entryType: 'note',
      storyId: 'LNGG-0050',
    })

    expect(tags).toContain('note')
  })

  it('lowercases story ID', () => {
    const tags = generateTags({
      entryType: 'lesson',
      storyId: 'LNGG-0050',
    })

    expect(tags).toContain('story:lngg-0050')
    expect(tags).not.toContain('story:LNGG-0050')
  })

  it('formats date as YYYY-MM', () => {
    const tags = generateTags({
      entryType: 'lesson',
      storyId: 'LNGG-0050',
    })

    const dateTag = tags.find(tag => tag.startsWith('date:'))
    expect(dateTag).toMatch(/^date:\d{4}-\d{2}$/)
  })

  it('includes domain when provided', () => {
    const tags = generateTags({
      entryType: 'lesson',
      storyId: 'LNGG-0050',
      domain: 'Backend',
    })

    expect(tags).toContain('domain:backend')
  })

  it('includes severity when provided', () => {
    const tags = generateTags({
      entryType: 'lesson',
      storyId: 'LNGG-0050',
      severity: 'high',
    })

    expect(tags).toContain('severity:high')
  })

  it('includes priority when provided', () => {
    const tags = generateTags({
      entryType: 'constraint',
      storyId: 'LNGG-0050',
      priority: 'medium',
    })

    expect(tags).toContain('priority:medium')
  })

  it('includes custom tags', () => {
    const tags = generateTags({
      entryType: 'lesson',
      storyId: 'LNGG-0050',
      customTags: ['performance', 'optimization'],
    })

    expect(tags).toContain('performance')
    expect(tags).toContain('optimization')
  })

  it('deduplicates tags', () => {
    const tags = generateTags({
      entryType: 'lesson',
      storyId: 'LNGG-0050',
      customTags: ['lesson-learned', 'duplicate'],
    })

    const lessonTags = tags.filter(tag => tag === 'lesson-learned')
    expect(lessonTags.length).toBe(1)
  })

  it('handles missing optional fields', () => {
    const tags = generateTags({
      entryType: 'note',
    })

    expect(tags).toContain('note')
    expect(tags.some(tag => tag.startsWith('date:'))).toBe(true)
    expect(tags.length).toBeGreaterThan(0)
  })
})
