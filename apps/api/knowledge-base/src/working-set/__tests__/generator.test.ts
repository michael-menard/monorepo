/**
 * Working Set Generator Tests (KBMEM-007)
 */

import { describe, it, expect } from 'vitest'
import {
  generateWorkingSetMd,
  parseWorkingSetMd,
  mergeConstraints,
  type Constraint,
  type WorkingSetConfig,
} from '../generator.js'

describe('Working Set Generator', () => {
  describe('mergeConstraints', () => {
    it('should prioritize story constraints over epic and project', () => {
      const constraints: Constraint[] = [
        { constraint: 'Project constraint', scope: 'project', source: 'CLAUDE.md' },
        { constraint: 'Story constraint', scope: 'story', source: 'Story req' },
        { constraint: 'Epic constraint', scope: 'epic', source: 'Epic spec' },
      ]

      const merged = mergeConstraints(constraints, 5)

      expect(merged[0].constraint).toBe('Story constraint')
      expect(merged[1].constraint).toBe('Epic constraint')
      expect(merged[2].constraint).toBe('Project constraint')
    })

    it('should respect explicit priority within same scope', () => {
      const constraints: Constraint[] = [
        { constraint: 'Low priority', scope: 'project', priority: 1 },
        { constraint: 'High priority', scope: 'project', priority: 5 },
        { constraint: 'Medium priority', scope: 'project', priority: 3 },
      ]

      const merged = mergeConstraints(constraints, 5)

      expect(merged[0].constraint).toBe('High priority')
      expect(merged[1].constraint).toBe('Medium priority')
      expect(merged[2].constraint).toBe('Low priority')
    })

    it('should limit to specified number of constraints', () => {
      const constraints: Constraint[] = [
        { constraint: 'One', scope: 'project' },
        { constraint: 'Two', scope: 'project' },
        { constraint: 'Three', scope: 'project' },
        { constraint: 'Four', scope: 'project' },
        { constraint: 'Five', scope: 'project' },
        { constraint: 'Six', scope: 'project' },
      ]

      const merged = mergeConstraints(constraints, 3)

      expect(merged).toHaveLength(3)
    })

    it('should use default limit of 5', () => {
      const constraints: Constraint[] = Array.from({ length: 10 }, (_, i) => ({
        constraint: `Constraint ${i + 1}`,
        scope: 'project' as const,
      }))

      const merged = mergeConstraints(constraints)

      expect(merged).toHaveLength(5)
    })
  })

  describe('generateWorkingSetMd', () => {
    it('should generate valid markdown with all sections', () => {
      const config: WorkingSetConfig = {
        storyId: 'WISH-2045',
        branch: 'feat/wish-2045-heic-support',
        phase: 'implementation',
        started: '2026-02-04T10:00:00Z',
        constraints: [
          { constraint: 'Use Zod schemas', source: 'CLAUDE.md', scope: 'project' },
          { constraint: 'Server-side image processing', source: 'ADR-003', scope: 'story' },
        ],
        recentActions: [
          { action: 'Created sharp adapter', completed: true },
          { action: 'Added unit tests', completed: true },
          { action: 'Add E2E test', completed: false },
        ],
        nextSteps: [
          'Write Playwright test for HEIC upload',
          'Update PROOF document',
          'Run full verification',
        ],
        blockers: [],
        kbReferences: [
          { name: 'ADR-003', kbId: '123e4567-e89b-12d3-a456-426614174000' },
        ],
      }

      const md = generateWorkingSetMd(config)

      expect(md).toContain('# Working Set')
      expect(md).toContain('**Story**: WISH-2045')
      expect(md).toContain('**Branch**: feat/wish-2045-heic-support')
      expect(md).toContain('**Phase**: implementation')
      expect(md).toContain('## Constraints (Top 5)')
      expect(md).toContain('Server-side image processing (ADR-003)')
      expect(md).toContain('Use Zod schemas (CLAUDE.md)')
      expect(md).toContain('[x] Created sharp adapter')
      expect(md).toContain('[ ] Add E2E test')
      expect(md).toContain('1. Write Playwright test for HEIC upload')
      expect(md).toContain('_None_') // No blockers
      expect(md).toContain('ADR-003: 123e4567-e89b-12d3-a456-426614174000')
    })

    it('should handle empty/minimal config', () => {
      const config: WorkingSetConfig = {
        storyId: 'TEST-001',
        constraints: [],
        recentActions: [],
        nextSteps: [],
        blockers: [],
        kbReferences: [],
      }

      const md = generateWorkingSetMd(config)

      expect(md).toContain('**Story**: TEST-001')
      expect(md).toContain('_No constraints loaded_')
      expect(md).toContain('_No recent actions_')
      expect(md).toContain('_No next steps defined_')
      expect(md).toContain('_None_')
      expect(md).toContain('_No KB references_')
    })

    it('should handle blockers with waiting on info', () => {
      const config: WorkingSetConfig = {
        storyId: 'TEST-001',
        blockers: [
          { title: 'API key missing', waitingOn: 'DevOps', description: 'Need production API key' },
        ],
        constraints: [],
        recentActions: [],
        nextSteps: [],
        kbReferences: [],
      }

      const md = generateWorkingSetMd(config)

      expect(md).toContain('**API key missing** (waiting on: DevOps)')
      expect(md).toContain('Need production API key')
    })

    it('should merge and prioritize constraints correctly', () => {
      const config: WorkingSetConfig = {
        storyId: 'TEST-001',
        constraints: [
          { constraint: 'Project rule', scope: 'project', priority: 1 },
          { constraint: 'Story rule', scope: 'story', priority: 1 },
          { constraint: 'Epic rule', scope: 'epic', priority: 1 },
        ],
        recentActions: [],
        nextSteps: [],
        blockers: [],
        kbReferences: [],
      }

      const md = generateWorkingSetMd(config)

      // Story should come first in the numbered list
      const constraintSection = md.match(/## Constraints[^\n]*\n([\s\S]*?)(?=\n## )/)
      expect(constraintSection).toBeTruthy()
      const lines = constraintSection![1].trim().split('\n')
      expect(lines[0]).toContain('Story rule')
      expect(lines[1]).toContain('Epic rule')
      expect(lines[2]).toContain('Project rule')
    })
  })

  describe('parseWorkingSetMd', () => {
    it('should parse a generated working set back to config', () => {
      const original: WorkingSetConfig = {
        storyId: 'WISH-2045',
        branch: 'feat/wish-2045-heic-support',
        phase: 'implementation',
        started: '2026-02-04T10:00:00Z',
        constraints: [
          { constraint: 'Use Zod schemas', source: 'CLAUDE.md', scope: 'project' },
        ],
        recentActions: [
          { action: 'Created sharp adapter', completed: true },
          { action: 'Add E2E test', completed: false },
        ],
        nextSteps: [
          'Write Playwright test',
          'Update PROOF document',
        ],
        blockers: [],
        kbReferences: [
          { name: 'ADR-003', kbId: '123e4567-e89b-12d3-a456-426614174000' },
        ],
      }

      const md = generateWorkingSetMd(original)
      const parsed = parseWorkingSetMd(md)

      expect(parsed.storyId).toBe('WISH-2045')
      expect(parsed.branch).toBe('feat/wish-2045-heic-support')
      expect(parsed.phase).toBe('implementation')
      expect(parsed.started).toBe('2026-02-04T10:00:00Z')
      expect(parsed.constraints).toHaveLength(1)
      expect(parsed.constraints![0].constraint).toBe('Use Zod schemas')
      expect(parsed.recentActions).toHaveLength(2)
      expect(parsed.recentActions![0].completed).toBe(true)
      expect(parsed.recentActions![1].completed).toBe(false)
      expect(parsed.nextSteps).toHaveLength(2)
      expect(parsed.kbReferences).toHaveLength(1)
      expect(parsed.kbReferences![0].kbId).toBe('123e4567-e89b-12d3-a456-426614174000')
    })

    it('should parse blockers with waiting on info', () => {
      const md = `# Working Set

## Current Context
- **Story**: TEST-001

## Constraints (Top 5)
_No constraints loaded_

## Recent Actions
_No recent actions_

## Next Steps
_No next steps defined_

## Open Blockers
- **API key missing** (waiting on: DevOps)
- **Database access**

## KB References
_No KB references_
`

      const parsed = parseWorkingSetMd(md)

      expect(parsed.blockers).toHaveLength(2)
      expect(parsed.blockers![0].title).toBe('API key missing')
      expect(parsed.blockers![0].waitingOn).toBe('DevOps')
      expect(parsed.blockers![1].title).toBe('Database access')
      expect(parsed.blockers![1].waitingOn).toBeUndefined()
    })

    it('should handle empty sections gracefully', () => {
      const md = `# Working Set

## Current Context
- **Story**: TEST-001

## Constraints (Top 5)
_No constraints loaded_

## Recent Actions
_No recent actions_

## Next Steps
_No next steps defined_

## Open Blockers
_None_

## KB References
_No KB references_
`

      const parsed = parseWorkingSetMd(md)

      expect(parsed.storyId).toBe('TEST-001')
      expect(parsed.constraints).toBeUndefined()
      expect(parsed.recentActions).toBeUndefined()
      expect(parsed.nextSteps).toBeUndefined()
      expect(parsed.blockers).toBeUndefined()
      expect(parsed.kbReferences).toBeUndefined()
    })
  })

  describe('round-trip', () => {
    it('should preserve data through generate -> parse cycle', () => {
      const original: WorkingSetConfig = {
        storyId: 'KBMEM-007',
        branch: 'feature/kbmem-007',
        phase: 'verification',
        started: '2026-02-04T15:30:00Z',
        constraints: [
          { constraint: 'Test coverage required', source: 'CLAUDE.md', scope: 'project' },
          { constraint: 'Story-specific rule', source: 'Story spec', scope: 'story' },
        ],
        recentActions: [
          { action: 'Implemented generator', completed: true },
          { action: 'Added tests', completed: true },
          { action: 'Update docs', completed: false },
        ],
        nextSteps: [
          'Run verification',
          'Create PR',
        ],
        blockers: [
          { title: 'Code review pending', waitingOn: 'Tech lead' },
        ],
        kbReferences: [
          { name: 'KBMEM plan', kbId: 'aabbccdd-1122-3344-5566-778899aabbcc' },
        ],
      }

      const md = generateWorkingSetMd(original)
      const parsed = parseWorkingSetMd(md)

      // Core fields should match
      expect(parsed.storyId).toBe(original.storyId)
      expect(parsed.branch).toBe(original.branch)
      expect(parsed.phase).toBe(original.phase)
      expect(parsed.started).toBe(original.started)

      // Constraints (note: order changes due to priority merge)
      expect(parsed.constraints).toHaveLength(2)

      // Recent actions
      expect(parsed.recentActions).toHaveLength(3)
      const completedCount = parsed.recentActions!.filter(a => a.completed).length
      expect(completedCount).toBe(2)

      // Next steps
      expect(parsed.nextSteps).toEqual(original.nextSteps)

      // Blockers
      expect(parsed.blockers).toHaveLength(1)
      expect(parsed.blockers![0].title).toBe('Code review pending')
      expect(parsed.blockers![0].waitingOn).toBe('Tech lead')

      // KB references
      expect(parsed.kbReferences).toHaveLength(1)
      expect(parsed.kbReferences![0].kbId).toBe(original.kbReferences[0].kbId)
    })
  })
})
