/**
 * KBMEM Schemas Unit Tests
 *
 * Tests for Task, Work State, and Knowledge Entry type schemas
 * added as part of the 3-bucket memory architecture.
 *
 * @see KBMEM-000c for test infrastructure requirements
 * @see plans/future/kb-memory-architecture/PLAN.md
 */

import { describe, it, expect } from 'vitest'
import {
  TaskTypeSchema,
  TaskPrioritySchema,
  TaskStatusSchema,
  TaskEffortSchema,
  TaskSchema,
  NewTaskSchema,
  UpdateTaskSchema,
  WorkPhaseSchema,
  WorkConstraintSchema,
  RecentActionSchema,
  BlockerSchema,
  WorkStateSchema,
  UpdateWorkStateSchema,
  KnowledgeEntryTypeSchema,
} from '../index.js'

describe('KBMEM Type Schemas', () => {
  describe('Task Schemas (Bucket C)', () => {
    describe('TaskTypeSchema', () => {
      it('should accept valid task types', () => {
        expect(TaskTypeSchema.parse('follow_up')).toBe('follow_up')
        expect(TaskTypeSchema.parse('improvement')).toBe('improvement')
        expect(TaskTypeSchema.parse('bug')).toBe('bug')
        expect(TaskTypeSchema.parse('tech_debt')).toBe('tech_debt')
        expect(TaskTypeSchema.parse('feature_idea')).toBe('feature_idea')
      })

      it('should reject invalid task types', () => {
        expect(() => TaskTypeSchema.parse('invalid')).toThrow()
        expect(() => TaskTypeSchema.parse('')).toThrow()
        expect(() => TaskTypeSchema.parse(null)).toThrow()
      })
    })

    describe('TaskPrioritySchema', () => {
      it('should accept valid priorities', () => {
        expect(TaskPrioritySchema.parse('p0')).toBe('p0')
        expect(TaskPrioritySchema.parse('p1')).toBe('p1')
        expect(TaskPrioritySchema.parse('p2')).toBe('p2')
        expect(TaskPrioritySchema.parse('p3')).toBe('p3')
      })

      it('should reject invalid priorities', () => {
        expect(() => TaskPrioritySchema.parse('p4')).toThrow()
        expect(() => TaskPrioritySchema.parse('high')).toThrow()
        expect(() => TaskPrioritySchema.parse(1)).toThrow()
      })
    })

    describe('TaskStatusSchema', () => {
      it('should accept valid statuses', () => {
        expect(TaskStatusSchema.parse('open')).toBe('open')
        expect(TaskStatusSchema.parse('triaged')).toBe('triaged')
        expect(TaskStatusSchema.parse('in_progress')).toBe('in_progress')
        expect(TaskStatusSchema.parse('blocked')).toBe('blocked')
        expect(TaskStatusSchema.parse('done')).toBe('done')
        expect(TaskStatusSchema.parse('wont_do')).toBe('wont_do')
        expect(TaskStatusSchema.parse('promoted')).toBe('promoted')
      })

      it('should reject invalid statuses', () => {
        expect(() => TaskStatusSchema.parse('closed')).toThrow()
        expect(() => TaskStatusSchema.parse('pending')).toThrow()
      })
    })

    describe('TaskEffortSchema', () => {
      it('should accept valid effort estimates', () => {
        expect(TaskEffortSchema.parse('xs')).toBe('xs')
        expect(TaskEffortSchema.parse('s')).toBe('s')
        expect(TaskEffortSchema.parse('m')).toBe('m')
        expect(TaskEffortSchema.parse('l')).toBe('l')
        expect(TaskEffortSchema.parse('xl')).toBe('xl')
      })

      it('should reject invalid effort estimates', () => {
        expect(() => TaskEffortSchema.parse('xxl')).toThrow()
        expect(() => TaskEffortSchema.parse('small')).toThrow()
        expect(() => TaskEffortSchema.parse(1)).toThrow()
      })
    })

    describe('NewTaskSchema', () => {
      it('should accept valid minimal task', () => {
        const task = {
          title: 'Fix login bug',
          taskType: 'bug',
        }
        const result = NewTaskSchema.parse(task)
        expect(result.title).toBe('Fix login bug')
        expect(result.taskType).toBe('bug')
      })

      it('should accept valid full task', () => {
        const task = {
          title: 'Add HEIC support validation',
          description: 'Need to validate HEIC files before processing',
          sourceStoryId: 'WISH-2045',
          sourcePhase: 'implementation',
          sourceAgent: 'dev-implement-backend-coder',
          taskType: 'follow_up',
          priority: 'p1',
          tags: ['heic', 'validation'],
          estimatedEffort: 'm',
        }
        const result = NewTaskSchema.parse(task)
        expect(result.title).toBe('Add HEIC support validation')
        expect(result.taskType).toBe('follow_up')
        expect(result.priority).toBe('p1')
        expect(result.tags).toEqual(['heic', 'validation'])
      })

      it('should reject task without title', () => {
        const task = {
          taskType: 'bug',
        }
        expect(() => NewTaskSchema.parse(task)).toThrow()
      })

      it('should reject task without taskType', () => {
        const task = {
          title: 'Some task',
        }
        expect(() => NewTaskSchema.parse(task)).toThrow()
      })

      it('should reject task with empty title', () => {
        const task = {
          title: '',
          taskType: 'bug',
        }
        expect(() => NewTaskSchema.parse(task)).toThrow()
      })
    })

    describe('TaskSchema', () => {
      it('should accept valid task with UUID', () => {
        const task = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          title: 'Test task',
          taskType: 'bug',
          status: 'open',
        }
        const result = TaskSchema.parse(task)
        expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000')
      })

      it('should default status to open', () => {
        const task = {
          title: 'Test task',
          taskType: 'bug',
        }
        const result = TaskSchema.parse(task)
        expect(result.status).toBe('open')
      })

      it('should accept blockedBy as valid UUID', () => {
        const task = {
          title: 'Blocked task',
          taskType: 'follow_up',
          blockedBy: '550e8400-e29b-41d4-a716-446655440000',
        }
        const result = TaskSchema.parse(task)
        expect(result.blockedBy).toBe('550e8400-e29b-41d4-a716-446655440000')
      })

      it('should reject blockedBy with invalid UUID', () => {
        const task = {
          title: 'Blocked task',
          taskType: 'follow_up',
          blockedBy: 'not-a-uuid',
        }
        expect(() => TaskSchema.parse(task)).toThrow()
      })
    })

    describe('UpdateTaskSchema', () => {
      it('should accept partial updates', () => {
        const update = {
          status: 'in_progress',
        }
        const result = UpdateTaskSchema.parse(update)
        expect(result.status).toBe('in_progress')
        expect(result.title).toBeUndefined()
      })

      it('should accept priority update', () => {
        const update = {
          priority: 'p0',
        }
        const result = UpdateTaskSchema.parse(update)
        expect(result.priority).toBe('p0')
      })

      it('should accept null for nullable fields', () => {
        const update = {
          blockedBy: null,
          priority: null,
        }
        const result = UpdateTaskSchema.parse(update)
        expect(result.blockedBy).toBeNull()
        expect(result.priority).toBeNull()
      })

      it('should accept empty object (no changes)', () => {
        const result = UpdateTaskSchema.parse({})
        expect(Object.keys(result)).toHaveLength(0)
      })
    })
  })

  describe('Work State Schemas (Bucket B)', () => {
    describe('WorkPhaseSchema', () => {
      it('should accept all valid phases', () => {
        const phases = [
          'planning',
          'in-elaboration',
          'ready-to-work',
          'implementation',
          'ready-for-code-review',
          'review',
          'ready-for-qa',
          'in-qa',
          'verification',
          'uat',
          'complete',
        ]
        phases.forEach(phase => {
          expect(WorkPhaseSchema.parse(phase)).toBe(phase)
        })
      })

      it('should reject invalid phases', () => {
        expect(() => WorkPhaseSchema.parse('started')).toThrow()
        expect(() => WorkPhaseSchema.parse('in-progress')).toThrow()
        expect(() => WorkPhaseSchema.parse('done')).toThrow()
      })
    })

    describe('WorkConstraintSchema', () => {
      it('should accept minimal constraint', () => {
        const constraint = {
          constraint: 'Use Zod schemas for all types',
        }
        const result = WorkConstraintSchema.parse(constraint)
        expect(result.constraint).toBe('Use Zod schemas for all types')
      })

      it('should accept full constraint', () => {
        const constraint = {
          constraint: 'No barrel files',
          source: 'CLAUDE.md',
          priority: 1,
        }
        const result = WorkConstraintSchema.parse(constraint)
        expect(result.source).toBe('CLAUDE.md')
        expect(result.priority).toBe(1)
      })
    })

    describe('RecentActionSchema', () => {
      it('should accept minimal action', () => {
        const action = {
          action: 'Created backend handler',
        }
        const result = RecentActionSchema.parse(action)
        expect(result.action).toBe('Created backend handler')
        expect(result.completed).toBe(false) // default
      })

      it('should accept completed action', () => {
        const action = {
          action: 'Added unit tests',
          completed: true,
          timestamp: '2026-02-04T10:00:00Z',
        }
        const result = RecentActionSchema.parse(action)
        expect(result.completed).toBe(true)
        expect(result.timestamp).toBe('2026-02-04T10:00:00Z')
      })
    })

    describe('BlockerSchema', () => {
      it('should accept minimal blocker', () => {
        const blocker = {
          title: 'Missing API key',
        }
        const result = BlockerSchema.parse(blocker)
        expect(result.title).toBe('Missing API key')
      })

      it('should accept full blocker', () => {
        const blocker = {
          title: 'Database migration pending',
          description: 'Cannot proceed until migration runs',
          waitingOn: 'DBA team',
        }
        const result = BlockerSchema.parse(blocker)
        expect(result.description).toBe('Cannot proceed until migration runs')
        expect(result.waitingOn).toBe('DBA team')
      })
    })

    describe('WorkStateSchema', () => {
      it('should accept minimal work state', () => {
        const state = {
          storyId: 'WISH-2045',
        }
        const result = WorkStateSchema.parse(state)
        expect(result.storyId).toBe('WISH-2045')
        expect(result.constraints).toEqual([])
        expect(result.nextSteps).toEqual([])
      })

      it('should accept full work state', () => {
        const state = {
          storyId: 'KBMEM-001',
          branch: 'feat/kbmem-001-entry-type',
          phase: 'implementation',
          constraints: [{ constraint: 'Use Zod', source: 'CLAUDE.md' }],
          recentActions: [{ action: 'Created migration', completed: true }],
          nextSteps: ['Run tests', 'Update documentation'],
          blockers: [],
          kbReferences: { 'ADR-001': '550e8400-e29b-41d4-a716-446655440000' },
        }
        const result = WorkStateSchema.parse(state)
        expect(result.branch).toBe('feat/kbmem-001-entry-type')
        expect(result.phase).toBe('implementation')
        expect(result.constraints).toHaveLength(1)
        expect(result.recentActions).toHaveLength(1)
        expect(result.nextSteps).toHaveLength(2)
      })

      it('should reject empty story ID', () => {
        const state = {
          storyId: '',
        }
        expect(() => WorkStateSchema.parse(state)).toThrow()
      })

      it('should reject invalid phase', () => {
        const state = {
          storyId: 'WISH-2045',
          phase: 'invalid-phase',
        }
        expect(() => WorkStateSchema.parse(state)).toThrow()
      })

      it('should validate kbReferences as UUID map', () => {
        const state = {
          storyId: 'WISH-2045',
          kbReferences: { 'ADR-001': 'not-a-uuid' },
        }
        expect(() => WorkStateSchema.parse(state)).toThrow()
      })
    })

    describe('UpdateWorkStateSchema', () => {
      it('should accept partial updates', () => {
        const update = {
          phase: 'review',
        }
        const result = UpdateWorkStateSchema.parse(update)
        expect(result.phase).toBe('review')
      })

      it('should accept next steps update', () => {
        const update = {
          nextSteps: ['Step 1', 'Step 2'],
        }
        const result = UpdateWorkStateSchema.parse(update)
        expect(result.nextSteps).toEqual(['Step 1', 'Step 2'])
      })

      it('should accept blockers update', () => {
        const update = {
          blockers: [{ title: 'New blocker', description: 'Details' }],
        }
        const result = UpdateWorkStateSchema.parse(update)
        expect(result.blockers).toHaveLength(1)
      })

      it('should accept empty object', () => {
        const result = UpdateWorkStateSchema.parse({})
        expect(Object.keys(result)).toHaveLength(0)
      })
    })
  })

  describe('Knowledge Entry Type Schema (Bucket A Extension)', () => {
    describe('KnowledgeEntryTypeSchema', () => {
      it('should accept all valid entry types', () => {
        expect(KnowledgeEntryTypeSchema.parse('note')).toBe('note')
        expect(KnowledgeEntryTypeSchema.parse('decision')).toBe('decision')
        expect(KnowledgeEntryTypeSchema.parse('constraint')).toBe('constraint')
        expect(KnowledgeEntryTypeSchema.parse('runbook')).toBe('runbook')
        expect(KnowledgeEntryTypeSchema.parse('lesson')).toBe('lesson')
      })

      it('should reject invalid entry types', () => {
        expect(() => KnowledgeEntryTypeSchema.parse('document')).toThrow()
        expect(() => KnowledgeEntryTypeSchema.parse('adr')).toThrow()
        expect(() => KnowledgeEntryTypeSchema.parse('')).toThrow()
      })
    })
  })
})
