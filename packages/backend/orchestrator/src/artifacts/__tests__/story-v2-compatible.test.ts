/**
 * Story Schema V2 (Backward Compatible) Tests
 *
 * Validates that the schema works with both:
 * - Legacy format (status, epic, acceptance_criteria, etc.)
 * - New v1 format (state, feature, acs, etc.)
 */

import { describe, it, expect } from 'vitest'
import {
  StoryArtifactSchema,
  createStoryArtifact,
  normalizeStoryArtifact,
  isLegacyFormat,
  getStoryState,
  getStoryFeature,
  getStoryAcceptanceCriteria,
  getStoryDependencies,
  updateStoryState,
  isStoryBlocked,
  isStoryComplete,
  isStoryWorkable,
  type StoryArtifact,
} from '../story-v2-compatible'

describe('StoryArtifactSchema - Backward Compatibility', () => {
  describe('Legacy Format Parsing', () => {
    it('should parse a legacy story file (WKFL-001 format)', () => {
      const legacyStory = {
        id: 'WKFL-001',
        title: 'Meta-Learning Loop: Retrospective Agent',
        status: 'uat',
        priority: 'P0',
        phase: 'foundation',
        epic: 'workflow-learning',
        prefix: 'WKFL',
        dependencies: [],
        blocks: ['WKFL-002', 'WKFL-006'],
        owner: null,
        estimated_tokens: 80000,
        tags: ['foundation', 'data-capture', 'kb-integration'],
        summary: 'Create a retrospective agent',
        goal: 'Establish the data foundation for all learning',
        non_goals: ['Auto-applying changes', 'Cross-project learning'],
        scope: {
          in: ['OUTCOME.yaml schema definition', 'workflow-retro.agent.md creation'],
          out: ['Calibration calculation', 'Pattern mining across stories'],
        },
        acceptance_criteria: [
          {
            id: 'AC-1',
            description: 'OUTCOME.yaml schema defined',
            verification: 'Schema file exists',
          },
        ],
        technical_notes: 'See implementation details',
        created_at: '2026-02-06T17:00:00-07:00',
        updated_at: '2026-02-07T22:05:00Z',
      }

      const result = StoryArtifactSchema.safeParse(legacyStory)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('WKFL-001')
        expect(result.data.title).toBe('Meta-Learning Loop: Retrospective Agent')
        expect(result.data.status).toBe('uat')
        expect(result.data.epic).toBe('workflow-learning')
        expect(result.data.acceptance_criteria).toHaveLength(1)
      }
    })

    it('should parse legacy story with minimal fields', () => {
      const minimalLegacy = {
        id: 'TEST-001',
        title: 'Test Story',
        status: 'backlog',
        epic: 'test-epic',
      }

      const result = StoryArtifactSchema.safeParse(minimalLegacy)

      expect(result.success).toBe(true)
    })
  })

  describe('New Format Parsing', () => {
    it('should parse a new v1 format story (LNGG-0010 format)', () => {
      const newStory = {
        schema: 1,
        id: 'LNGG-0010',
        feature: 'platform',
        type: 'infrastructure',
        state: 'in-progress',
        title: 'Story File Adapter',
        points: 5,
        priority: 'high',
        blocked_by: null,
        depends_on: [],
        follow_up_from: null,
        scope: {
          packages: ['packages/backend/orchestrator'],
          surfaces: ['packages', 'testing'],
        },
        goal: 'Create a type-safe Story File Adapter',
        non_goals: ['Story creation logic', 'Index file updates'],
        acs: [
          {
            id: 'AC-1',
            description: 'Adapter reads existing story YAML files',
            testable: true,
            automated: true,
          },
        ],
        risks: [
          {
            id: 'RISK-1',
            description: 'Schema mismatch with existing files',
            severity: 'high',
            mitigation: 'Survey files first',
          },
        ],
        created_at: '2026-02-13T00:00:00Z',
        updated_at: '2026-02-13T13:00:00Z',
      }

      const result = StoryArtifactSchema.safeParse(newStory)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.schema).toBe(1)
        expect(result.data.id).toBe('LNGG-0010')
        expect(result.data.feature).toBe('platform')
        expect(result.data.state).toBe('in-progress')
        expect(result.data.acs).toHaveLength(1)
      }
    })

    it('should parse new format with minimal fields', () => {
      const minimal = {
        id: 'TEST-002',
        title: 'Test Story V1',
      }

      const result = StoryArtifactSchema.safeParse(minimal)

      expect(result.success).toBe(true)
    })
  })

  describe('Helper Functions - Field Access', () => {
    it('should get state from legacy story (status field)', () => {
      const legacyStory = { id: 'TEST-001', title: 'Test', status: 'uat' } as StoryArtifact

      const state = getStoryState(legacyStory)

      expect(state).toBe('uat')
    })

    it('should get state from new story (state field)', () => {
      const newStory = { id: 'TEST-002', title: 'Test', state: 'in-progress' } as StoryArtifact

      const state = getStoryState(newStory)

      expect(state).toBe('in-progress')
    })

    it('should prefer state over status when both present', () => {
      const mixed = {
        id: 'TEST-003',
        title: 'Test',
        state: 'in-progress',
        status: 'uat',
      } as StoryArtifact

      const state = getStoryState(mixed)

      expect(state).toBe('in-progress')
    })

    it('should get feature from legacy story (epic field)', () => {
      const legacyStory = { id: 'TEST-001', title: 'Test', epic: 'platform' } as StoryArtifact

      const feature = getStoryFeature(legacyStory)

      expect(feature).toBe('platform')
    })

    it('should get feature from new story (feature field)', () => {
      const newStory = { id: 'TEST-002', title: 'Test', feature: 'platform' } as StoryArtifact

      const feature = getStoryFeature(newStory)

      expect(feature).toBe('platform')
    })

    it('should get acceptance criteria from legacy story', () => {
      const legacyStory = {
        id: 'TEST-001',
        title: 'Test',
        acceptance_criteria: [{ id: 'AC-1', description: 'Test' }],
      } as StoryArtifact

      const acs = getStoryAcceptanceCriteria(legacyStory)

      expect(acs).toHaveLength(1)
      expect(acs?.[0].id).toBe('AC-1')
    })

    it('should get acceptance criteria from new story', () => {
      const newStory = {
        id: 'TEST-002',
        title: 'Test',
        acs: [{ id: 'AC-1', description: 'Test' }],
      } as StoryArtifact

      const acs = getStoryAcceptanceCriteria(newStory)

      expect(acs).toHaveLength(1)
      expect(acs?.[0].id).toBe('AC-1')
    })

    it('should get dependencies from legacy story', () => {
      const legacyStory = {
        id: 'TEST-001',
        title: 'Test',
        dependencies: ['TEST-002', 'TEST-003'],
      } as StoryArtifact

      const deps = getStoryDependencies(legacyStory)

      expect(deps).toHaveLength(2)
      expect(deps).toContain('TEST-002')
    })

    it('should get dependencies from new story', () => {
      const newStory = {
        id: 'TEST-002',
        title: 'Test',
        depends_on: ['TEST-001'],
      } as StoryArtifact

      const deps = getStoryDependencies(newStory)

      expect(deps).toHaveLength(1)
      expect(deps).toContain('TEST-001')
    })
  })

  describe('Normalization', () => {
    it('should detect legacy format', () => {
      const legacyStory = {
        id: 'TEST-001',
        title: 'Test',
        status: 'uat',
        epic: 'platform',
      } as StoryArtifact

      expect(isLegacyFormat(legacyStory)).toBe(true)
    })

    it('should detect new format', () => {
      const newStory = {
        id: 'TEST-002',
        title: 'Test',
        state: 'in-progress',
        feature: 'platform',
      } as StoryArtifact

      expect(isLegacyFormat(newStory)).toBe(false)
    })

    it('should normalize legacy story to v1 format', () => {
      const legacyStory = {
        id: 'TEST-001',
        title: 'Test Story',
        status: 'uat',
        epic: 'platform',
        acceptance_criteria: [{ id: 'AC-1', description: 'Test' }],
        dependencies: ['TEST-002'],
      } as StoryArtifact

      const normalized = normalizeStoryArtifact(legacyStory)

      expect(normalized.schema).toBe(1)
      expect(normalized.state).toBe('uat')
      expect(normalized.feature).toBe('platform')
      expect(normalized.acs).toHaveLength(1)
      expect(normalized.depends_on).toHaveLength(1)
    })

    it('should preserve original fields after normalization', () => {
      const legacyStory = {
        id: 'TEST-001',
        title: 'Test',
        status: 'uat',
        epic: 'platform',
        tags: ['test', 'legacy'],
        owner: 'dev-team',
      } as StoryArtifact

      const normalized = normalizeStoryArtifact(legacyStory)

      expect(normalized.tags).toEqual(['test', 'legacy'])
      expect(normalized.owner).toBe('dev-team')
    })
  })

  describe('Update Functions', () => {
    it('should update state on new format story', () => {
      const story = {
        id: 'TEST-001',
        title: 'Test',
        state: 'in-progress',
        updated_at: '2026-02-13T00:00:00Z',
      } as StoryArtifact

      const updated = updateStoryState(story, 'ready-for-qa')

      expect(updated.state).toBe('ready-for-qa')
      expect(updated.updated_at).not.toBe('2026-02-13T00:00:00Z')
    })

    it('should update both state and status on legacy format story', () => {
      const story = {
        id: 'TEST-001',
        title: 'Test',
        status: 'in-progress',
        updated_at: '2026-02-13T00:00:00Z',
      } as StoryArtifact

      const updated = updateStoryState(story, 'ready-for-qa')

      expect(updated.state).toBe('ready-for-qa')
      expect(updated.status).toBe('ready-for-qa')
    })
  })

  describe('Status Checks', () => {
    it('should check if story is blocked', () => {
      const blocked = { id: 'TEST-001', title: 'Test', blocked_by: 'TEST-002' } as StoryArtifact
      const notBlocked = { id: 'TEST-003', title: 'Test', blocked_by: null } as StoryArtifact

      expect(isStoryBlocked(blocked)).toBe(true)
      expect(isStoryBlocked(notBlocked)).toBe(false)
    })

    it('should check if story is complete', () => {
      const done = { id: 'TEST-001', title: 'Test', state: 'done' } as StoryArtifact
      const uat = { id: 'TEST-002', title: 'Test', status: 'uat' } as StoryArtifact
      const inProgress = { id: 'TEST-003', title: 'Test', state: 'in-progress' } as StoryArtifact

      expect(isStoryComplete(done)).toBe(true)
      expect(isStoryComplete(uat)).toBe(true)
      expect(isStoryComplete(inProgress)).toBe(false)
    })

    it('should check if story is workable', () => {
      const workable = {
        id: 'TEST-001',
        title: 'Test',
        state: 'ready-to-work',
        blocked_by: null,
      } as StoryArtifact
      const blocked = {
        id: 'TEST-002',
        title: 'Test',
        state: 'ready-to-work',
        blocked_by: 'TEST-001',
      } as StoryArtifact
      const inProgress = { id: 'TEST-003', title: 'Test', state: 'in-progress' } as StoryArtifact

      expect(isStoryWorkable(workable)).toBe(true)
      expect(isStoryWorkable(blocked)).toBe(false)
      expect(isStoryWorkable(inProgress)).toBe(false)
    })
  })

  describe('Create Story Artifact', () => {
    it('should create a new story in v1 format', () => {
      const story = createStoryArtifact('TEST-001', 'platform', 'Test Story', 'Test goal', {
        type: 'feature',
        state: 'draft',
        points: 3,
        priority: 'medium',
      })

      expect(story.schema).toBe(1)
      expect(story.id).toBe('TEST-001')
      expect(story.feature).toBe('platform')
      expect(story.title).toBe('Test Story')
      expect(story.goal).toBe('Test goal')
      expect(story.type).toBe('feature')
      expect(story.state).toBe('draft')
      expect(story.points).toBe(3)
      expect(story.priority).toBe('medium')
    })

    it('should apply defaults when creating story', () => {
      const story = createStoryArtifact('TEST-001', 'platform', 'Test Story', 'Test goal')

      expect(story.type).toBe('feature')
      expect(story.state).toBe('draft')
      expect(story.priority).toBe('medium')
      expect(story.blocked_by).toBe(null)
      expect(story.depends_on).toEqual([])
      expect(story.acs).toEqual([])
      expect(story.risks).toEqual([])
    })
  })

  describe('Unknown Fields Preservation', () => {
    it('should preserve unknown fields via passthrough', () => {
      const storyWithCustomFields = {
        id: 'TEST-001',
        title: 'Test',
        custom_field: 'custom value',
        another_unknown: 123,
        nested: { field: 'value' },
      }

      const result = StoryArtifactSchema.safeParse(storyWithCustomFields)

      expect(result.success).toBe(true)
      if (result.success) {
        expect((result.data as any).custom_field).toBe('custom value')
        expect((result.data as any).another_unknown).toBe(123)
        expect((result.data as any).nested).toEqual({ field: 'value' })
      }
    })
  })
})
