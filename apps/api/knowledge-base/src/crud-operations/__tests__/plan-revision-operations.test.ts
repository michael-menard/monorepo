/**
 * Tests for computeRevisionDiff (APRS-1050)
 *
 * Pure function tests — no database access required.
 * Covers AC-3: field changes, sections JSONB, first revision, identical, missing revisions.
 */

import { describe, it, expect } from 'vitest'
import { computeRevisionDiff } from '../plan-revision-operations.js'

/** Helper to create a mock revision record */
function makeRevision(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-uuid',
    planId: 'plan-uuid',
    revisionNumber: 1,
    rawContent: '# Plan\nSome content',
    contentHash: 'abc123def456',
    sections: [{ heading: 'Overview', level: 1, startLine: 1 }],
    changeReason: 'Initial creation',
    changedBy: 'agent-pm',
    createdAt: new Date('2026-03-21T00:00:00Z'),
    ...overrides,
  } as ReturnType<typeof makeRevision>
}

describe('computeRevisionDiff', () => {
  it('detects field modifications between two revisions', () => {
    const revA = makeRevision({
      revisionNumber: 1,
      rawContent: '# Plan v1',
      contentHash: 'hash-v1',
      changeReason: 'Initial',
      changedBy: 'agent-pm',
    })
    const revB = makeRevision({
      revisionNumber: 2,
      rawContent: '# Plan v2',
      contentHash: 'hash-v2',
      changeReason: 'Updated scope',
      changedBy: 'agent-dev',
    })

    const result = computeRevisionDiff(revA, revB, 'test-plan', 1, 2)

    expect(result.has_changes).toBe(true)
    expect(result.plan_slug).toBe('test-plan')
    expect(result.revision_a).toBe(1)
    expect(result.revision_b).toBe(2)

    expect(result.fields.rawContent.changeType).toBe('modified')
    expect(result.fields.rawContent.oldValue).toBe('# Plan v1')
    expect(result.fields.rawContent.newValue).toBe('# Plan v2')

    expect(result.fields.contentHash.changeType).toBe('modified')
    expect(result.fields.changeReason.changeType).toBe('modified')
    expect(result.fields.changedBy.changeType).toBe('modified')
  })

  it('detects sections JSONB changes', () => {
    const revA = makeRevision({
      sections: [{ heading: 'Overview', level: 1, startLine: 1 }],
    })
    const revB = makeRevision({
      sections: [
        { heading: 'Overview', level: 1, startLine: 1 },
        { heading: 'Details', level: 2, startLine: 5 },
      ],
    })

    const result = computeRevisionDiff(revA, revB, 'test-plan', 1, 2)

    expect(result.fields.sections.changeType).toBe('modified')
    expect(result.has_changes).toBe(true)
  })

  it('handles first revision (no prior — revA is null)', () => {
    const revB = makeRevision({ revisionNumber: 1 })

    const result = computeRevisionDiff(null, revB, 'test-plan', 1, 2)

    expect(result.has_changes).toBe(true)
    expect(result.fields.rawContent.changeType).toBe('added')
    expect(result.fields.rawContent.oldValue).toBeNull()
    expect(result.fields.rawContent.newValue).toBe('# Plan\nSome content')

    expect(result.fields.contentHash.changeType).toBe('added')
    expect(result.fields.sections.changeType).toBe('added')
    expect(result.fields.changeReason.changeType).toBe('added')
    expect(result.fields.changedBy.changeType).toBe('added')
  })

  it('reports no changes for identical revisions', () => {
    const rev = makeRevision()

    const result = computeRevisionDiff(rev, rev, 'test-plan', 1, 1)

    expect(result.has_changes).toBe(false)

    for (const field of Object.values(result.fields)) {
      expect(field.changeType).toBe('unchanged')
    }
  })

  it('handles null-to-null fields as unchanged', () => {
    const revA = makeRevision({
      contentHash: null,
      sections: null,
      changeReason: null,
      changedBy: null,
    })
    const revB = makeRevision({
      contentHash: null,
      sections: null,
      changeReason: null,
      changedBy: null,
    })

    const result = computeRevisionDiff(revA, revB, 'test-plan', 1, 2)

    expect(result.fields.contentHash.changeType).toBe('unchanged')
    expect(result.fields.sections.changeType).toBe('unchanged')
    expect(result.fields.changeReason.changeType).toBe('unchanged')
    expect(result.fields.changedBy.changeType).toBe('unchanged')
  })

  it('detects field removal (value to null)', () => {
    const revA = makeRevision({
      changeReason: 'Some reason',
      changedBy: 'agent-pm',
    })
    const revB = makeRevision({
      changeReason: null,
      changedBy: null,
    })

    const result = computeRevisionDiff(revA, revB, 'test-plan', 1, 2)

    expect(result.fields.changeReason.changeType).toBe('removed')
    expect(result.fields.changeReason.oldValue).toBe('Some reason')
    expect(result.fields.changeReason.newValue).toBeNull()

    expect(result.fields.changedBy.changeType).toBe('removed')
  })

  it('handles both revisions null (edge case)', () => {
    const result = computeRevisionDiff(null, null, 'test-plan', 1, 2)

    expect(result.has_changes).toBe(false)
    for (const field of Object.values(result.fields)) {
      expect(field.changeType).toBe('unchanged')
      expect(field.oldValue).toBeNull()
      expect(field.newValue).toBeNull()
    }
  })

  it('includes all expected diff fields', () => {
    const rev = makeRevision()
    const result = computeRevisionDiff(rev, rev, 'test-plan', 1, 1)

    const expectedFields = ['rawContent', 'contentHash', 'sections', 'changeReason', 'changedBy']
    expect(Object.keys(result.fields).sort()).toEqual(expectedFields.sort())

    for (const fieldDiff of Object.values(result.fields)) {
      expect(fieldDiff).toHaveProperty('field')
      expect(fieldDiff).toHaveProperty('oldValue')
      expect(fieldDiff).toHaveProperty('newValue')
      expect(fieldDiff).toHaveProperty('changeType')
    }
  })
})
