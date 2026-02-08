/**
 * Story Schemas Unit Tests (KBAR-001)
 *
 * Tests for Story, StoryDependency, and StoryArtifact type schemas
 * added as part of the KB Story & Artifact Migration epic.
 *
 * @see KBAR-001 for implementation details
 * @see plans/active/kb-story-artifact-migration/PLAN.md
 */

import { describe, it, expect } from 'vitest'
import {
  StoryTypeSchema,
  StoryPrioritySchema,
  StoryStateSchema,
  StoryPhaseSchema,
  DependencyTypeSchema,
  ArtifactTypeSchema,
  StorySchema,
  NewStorySchema,
  UpdateStorySchema,
  StoryDependencySchema,
  NewStoryDependencySchema,
  StoryArtifactSchema,
  NewStoryArtifactSchema,
  UpdateStoryArtifactSchema,
} from '../index.js'

describe('Story Schemas (KBAR-001)', () => {
  describe('Enum Schemas', () => {
    describe('StoryTypeSchema', () => {
      it('should accept valid story types', () => {
        expect(StoryTypeSchema.parse('feature')).toBe('feature')
        expect(StoryTypeSchema.parse('bug')).toBe('bug')
        expect(StoryTypeSchema.parse('spike')).toBe('spike')
        expect(StoryTypeSchema.parse('chore')).toBe('chore')
        expect(StoryTypeSchema.parse('tech_debt')).toBe('tech_debt')
      })

      it('should reject invalid story types', () => {
        expect(() => StoryTypeSchema.parse('task')).toThrow()
        expect(() => StoryTypeSchema.parse('epic')).toThrow()
        expect(() => StoryTypeSchema.parse('')).toThrow()
        expect(() => StoryTypeSchema.parse(null)).toThrow()
      })
    })

    describe('StoryPrioritySchema', () => {
      it('should accept valid priorities', () => {
        expect(StoryPrioritySchema.parse('critical')).toBe('critical')
        expect(StoryPrioritySchema.parse('high')).toBe('high')
        expect(StoryPrioritySchema.parse('medium')).toBe('medium')
        expect(StoryPrioritySchema.parse('low')).toBe('low')
      })

      it('should reject invalid priorities', () => {
        expect(() => StoryPrioritySchema.parse('p0')).toThrow()
        expect(() => StoryPrioritySchema.parse('urgent')).toThrow()
        expect(() => StoryPrioritySchema.parse(1)).toThrow()
      })
    })

    describe('StoryStateSchema', () => {
      it('should accept all valid states', () => {
        const states = [
          'backlog',
          'ready',
          'in_progress',
          'ready_for_review',
          'in_review',
          'ready_for_qa',
          'in_qa',
          'completed',
          'cancelled',
          'deferred',
        ]
        states.forEach(state => {
          expect(StoryStateSchema.parse(state)).toBe(state)
        })
      })

      it('should reject invalid states', () => {
        expect(() => StoryStateSchema.parse('open')).toThrow()
        expect(() => StoryStateSchema.parse('done')).toThrow()
        expect(() => StoryStateSchema.parse('in-progress')).toThrow()
      })
    })

    describe('StoryPhaseSchema', () => {
      it('should accept all valid phases', () => {
        const phases = [
          'setup',
          'analysis',
          'planning',
          'implementation',
          'code_review',
          'qa_verification',
          'completion',
        ]
        phases.forEach(phase => {
          expect(StoryPhaseSchema.parse(phase)).toBe(phase)
        })
      })

      it('should reject invalid phases', () => {
        expect(() => StoryPhaseSchema.parse('design')).toThrow()
        expect(() => StoryPhaseSchema.parse('testing')).toThrow()
        expect(() => StoryPhaseSchema.parse('review')).toThrow()
      })
    })

    describe('DependencyTypeSchema', () => {
      it('should accept valid dependency types', () => {
        expect(DependencyTypeSchema.parse('depends_on')).toBe('depends_on')
        expect(DependencyTypeSchema.parse('blocked_by')).toBe('blocked_by')
        expect(DependencyTypeSchema.parse('follow_up_from')).toBe('follow_up_from')
        expect(DependencyTypeSchema.parse('enables')).toBe('enables')
      })

      it('should reject invalid dependency types', () => {
        expect(() => DependencyTypeSchema.parse('blocks')).toThrow()
        expect(() => DependencyTypeSchema.parse('related_to')).toThrow()
        expect(() => DependencyTypeSchema.parse('')).toThrow()
      })
    })

    describe('ArtifactTypeSchema', () => {
      it('should accept all valid artifact types', () => {
        const types = [
          'checkpoint',
          'scope',
          'plan',
          'evidence',
          'verification',
          'analysis',
          'context',
          'fix_summary',
          'proof',
          'elaboration',
          'review',
          'qa_gate',
          'completion_report',
        ]
        types.forEach(type => {
          expect(ArtifactTypeSchema.parse(type)).toBe(type)
        })
      })

      it('should reject invalid artifact types', () => {
        expect(() => ArtifactTypeSchema.parse('document')).toThrow()
        expect(() => ArtifactTypeSchema.parse('report')).toThrow()
        expect(() => ArtifactTypeSchema.parse('')).toThrow()
      })
    })
  })

  describe('Story Schemas', () => {
    describe('NewStorySchema', () => {
      it('should accept valid minimal story', () => {
        const story = {
          storyId: 'WISH-2047',
          title: 'Add HEIC support',
        }
        const result = NewStorySchema.parse(story)
        expect(result.storyId).toBe('WISH-2047')
        expect(result.title).toBe('Add HEIC support')
        expect(result.storyFile).toBe('story.yaml')
        expect(result.iteration).toBe(0)
        expect(result.blocked).toBe(false)
      })

      it('should accept valid full story', () => {
        const story = {
          storyId: 'KBAR-001',
          feature: 'kbar',
          epic: 'KB Story Migration',
          title: 'Database Schema Migrations',
          storyDir: 'plans/active/kb-story-artifact-migration/ready/KBAR-001',
          storyFile: 'story.yaml',
          storyType: 'feature',
          points: 5,
          priority: 'high',
          state: 'in_progress',
          phase: 'implementation',
          iteration: 0,
          blocked: false,
          touchesBackend: true,
          touchesDatabase: true,
          touchesFrontend: false,
          touchesInfra: false,
          fileHash: 'abc123',
        }
        const result = NewStorySchema.parse(story)
        expect(result.storyId).toBe('KBAR-001')
        expect(result.feature).toBe('kbar')
        expect(result.storyType).toBe('feature')
        expect(result.priority).toBe('high')
        expect(result.points).toBe(5)
        expect(result.touchesBackend).toBe(true)
        expect(result.touchesDatabase).toBe(true)
      })

      it('should reject story without storyId', () => {
        const story = {
          title: 'Some story',
        }
        expect(() => NewStorySchema.parse(story)).toThrow()
      })

      it('should reject story without title', () => {
        const story = {
          storyId: 'WISH-2047',
        }
        expect(() => NewStorySchema.parse(story)).toThrow()
      })

      it('should reject story with empty storyId', () => {
        const story = {
          storyId: '',
          title: 'Some story',
        }
        expect(() => NewStorySchema.parse(story)).toThrow()
      })

      it('should reject story with empty title', () => {
        const story = {
          storyId: 'WISH-2047',
          title: '',
        }
        expect(() => NewStorySchema.parse(story)).toThrow()
      })

      it('should reject invalid storyType', () => {
        const story = {
          storyId: 'WISH-2047',
          title: 'Test',
          storyType: 'invalid',
        }
        expect(() => NewStorySchema.parse(story)).toThrow()
      })

      it('should reject negative points', () => {
        const story = {
          storyId: 'WISH-2047',
          title: 'Test',
          points: -1,
        }
        expect(() => NewStorySchema.parse(story)).toThrow()
      })

      it('should reject negative iteration', () => {
        const story = {
          storyId: 'WISH-2047',
          title: 'Test',
          iteration: -1,
        }
        expect(() => NewStorySchema.parse(story)).toThrow()
      })
    })

    describe('StorySchema', () => {
      it('should accept valid story with UUID', () => {
        const story = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          storyId: 'WISH-2047',
          title: 'Test story',
        }
        const result = StorySchema.parse(story)
        expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000')
      })

      it('should default blocked to false', () => {
        const story = {
          storyId: 'WISH-2047',
          title: 'Test story',
        }
        const result = StorySchema.parse(story)
        expect(result.blocked).toBe(false)
      })

      it('should default iteration to 0', () => {
        const story = {
          storyId: 'WISH-2047',
          title: 'Test story',
        }
        const result = StorySchema.parse(story)
        expect(result.iteration).toBe(0)
      })

      it('should accept null for nullable fields', () => {
        const story = {
          storyId: 'WISH-2047',
          title: 'Test story',
          feature: null,
          epic: null,
          storyType: null,
          priority: null,
          state: null,
          phase: null,
          blockedReason: null,
          blockedByStory: null,
        }
        const result = StorySchema.parse(story)
        expect(result.feature).toBeNull()
        expect(result.storyType).toBeNull()
        expect(result.priority).toBeNull()
      })
    })

    describe('UpdateStorySchema', () => {
      it('should accept partial updates', () => {
        const update = {
          state: 'in_progress',
          phase: 'implementation',
        }
        const result = UpdateStorySchema.parse(update)
        expect(result.state).toBe('in_progress')
        expect(result.phase).toBe('implementation')
        expect(result.title).toBeUndefined()
      })

      it('should accept priority update', () => {
        const update = {
          priority: 'critical',
        }
        const result = UpdateStorySchema.parse(update)
        expect(result.priority).toBe('critical')
      })

      it('should accept blocked state update', () => {
        const update = {
          blocked: true,
          blockedReason: 'Waiting for API changes',
          blockedByStory: 'WISH-2046',
        }
        const result = UpdateStorySchema.parse(update)
        expect(result.blocked).toBe(true)
        expect(result.blockedReason).toBe('Waiting for API changes')
        expect(result.blockedByStory).toBe('WISH-2046')
      })

      it('should accept null for nullable fields', () => {
        const update = {
          blockedReason: null,
          blockedByStory: null,
          completedAt: null,
        }
        const result = UpdateStorySchema.parse(update)
        expect(result.blockedReason).toBeNull()
        expect(result.blockedByStory).toBeNull()
        expect(result.completedAt).toBeNull()
      })

      it('should accept empty object (no changes)', () => {
        const result = UpdateStorySchema.parse({})
        expect(Object.keys(result)).toHaveLength(0)
      })

      it('should accept iteration update', () => {
        const update = {
          iteration: 2,
        }
        const result = UpdateStorySchema.parse(update)
        expect(result.iteration).toBe(2)
      })
    })
  })

  describe('Story Dependency Schemas', () => {
    describe('NewStoryDependencySchema', () => {
      it('should accept valid dependency', () => {
        const dependency = {
          storyId: 'WISH-2047',
          targetStoryId: 'WISH-2046',
          dependencyType: 'depends_on',
        }
        const result = NewStoryDependencySchema.parse(dependency)
        expect(result.storyId).toBe('WISH-2047')
        expect(result.targetStoryId).toBe('WISH-2046')
        expect(result.dependencyType).toBe('depends_on')
        expect(result.satisfied).toBe(false)
      })

      it('should accept satisfied dependency', () => {
        const dependency = {
          storyId: 'KBAR-002',
          targetStoryId: 'KBAR-001',
          dependencyType: 'blocked_by',
          satisfied: true,
        }
        const result = NewStoryDependencySchema.parse(dependency)
        expect(result.satisfied).toBe(true)
      })

      it('should reject missing storyId', () => {
        const dependency = {
          targetStoryId: 'WISH-2046',
          dependencyType: 'depends_on',
        }
        expect(() => NewStoryDependencySchema.parse(dependency)).toThrow()
      })

      it('should reject missing targetStoryId', () => {
        const dependency = {
          storyId: 'WISH-2047',
          dependencyType: 'depends_on',
        }
        expect(() => NewStoryDependencySchema.parse(dependency)).toThrow()
      })

      it('should reject missing dependencyType', () => {
        const dependency = {
          storyId: 'WISH-2047',
          targetStoryId: 'WISH-2046',
        }
        expect(() => NewStoryDependencySchema.parse(dependency)).toThrow()
      })

      it('should reject invalid dependencyType', () => {
        const dependency = {
          storyId: 'WISH-2047',
          targetStoryId: 'WISH-2046',
          dependencyType: 'invalid',
        }
        expect(() => NewStoryDependencySchema.parse(dependency)).toThrow()
      })

      it('should reject empty storyId', () => {
        const dependency = {
          storyId: '',
          targetStoryId: 'WISH-2046',
          dependencyType: 'depends_on',
        }
        expect(() => NewStoryDependencySchema.parse(dependency)).toThrow()
      })
    })

    describe('StoryDependencySchema', () => {
      it('should accept valid dependency with UUID', () => {
        const dependency = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          storyId: 'WISH-2047',
          targetStoryId: 'WISH-2046',
          dependencyType: 'follows_up_from',
        }
        // Note: follows_up_from is not valid, this should fail
        expect(() => StoryDependencySchema.parse(dependency)).toThrow()
      })

      it('should accept all valid dependency types', () => {
        const types = ['depends_on', 'blocked_by', 'follow_up_from', 'enables']
        types.forEach(type => {
          const dependency = {
            storyId: 'WISH-2047',
            targetStoryId: 'WISH-2046',
            dependencyType: type,
          }
          const result = StoryDependencySchema.parse(dependency)
          expect(result.dependencyType).toBe(type)
        })
      })
    })
  })

  describe('Story Artifact Schemas', () => {
    describe('NewStoryArtifactSchema', () => {
      it('should accept valid minimal artifact', () => {
        const artifact = {
          storyId: 'WISH-2047',
          artifactType: 'checkpoint',
        }
        const result = NewStoryArtifactSchema.parse(artifact)
        expect(result.storyId).toBe('WISH-2047')
        expect(result.artifactType).toBe('checkpoint')
      })

      it('should accept valid full artifact', () => {
        const artifact = {
          storyId: 'KBAR-001',
          artifactType: 'plan',
          artifactName: 'Implementation Plan',
          kbEntryId: '550e8400-e29b-41d4-a716-446655440000',
          filePath: '_implementation/PLAN.md',
          phase: 'planning',
          iteration: 0,
          summary: { key: 'value', steps: ['step1', 'step2'] },
        }
        const result = NewStoryArtifactSchema.parse(artifact)
        expect(result.storyId).toBe('KBAR-001')
        expect(result.artifactType).toBe('plan')
        expect(result.artifactName).toBe('Implementation Plan')
        expect(result.kbEntryId).toBe('550e8400-e29b-41d4-a716-446655440000')
        expect(result.phase).toBe('planning')
        expect(result.summary).toEqual({ key: 'value', steps: ['step1', 'step2'] })
      })

      it('should accept artifact without KB entry link', () => {
        const artifact = {
          storyId: 'WISH-2047',
          artifactType: 'evidence',
          filePath: '_implementation/test-results.json',
          phase: 'qa_verification',
        }
        const result = NewStoryArtifactSchema.parse(artifact)
        expect(result.kbEntryId).toBeUndefined()
        expect(result.filePath).toBe('_implementation/test-results.json')
      })

      it('should accept artifact with KB entry link but no file path', () => {
        const artifact = {
          storyId: 'WISH-2047',
          artifactType: 'context',
          kbEntryId: '550e8400-e29b-41d4-a716-446655440000',
        }
        const result = NewStoryArtifactSchema.parse(artifact)
        expect(result.kbEntryId).toBe('550e8400-e29b-41d4-a716-446655440000')
        expect(result.filePath).toBeUndefined()
      })

      it('should reject missing storyId', () => {
        const artifact = {
          artifactType: 'checkpoint',
        }
        expect(() => NewStoryArtifactSchema.parse(artifact)).toThrow()
      })

      it('should reject missing artifactType', () => {
        const artifact = {
          storyId: 'WISH-2047',
        }
        expect(() => NewStoryArtifactSchema.parse(artifact)).toThrow()
      })

      it('should reject invalid artifactType', () => {
        const artifact = {
          storyId: 'WISH-2047',
          artifactType: 'invalid',
        }
        expect(() => NewStoryArtifactSchema.parse(artifact)).toThrow()
      })

      it('should reject invalid kbEntryId (not UUID)', () => {
        const artifact = {
          storyId: 'WISH-2047',
          artifactType: 'checkpoint',
          kbEntryId: 'not-a-uuid',
        }
        expect(() => NewStoryArtifactSchema.parse(artifact)).toThrow()
      })

      it('should reject invalid phase', () => {
        const artifact = {
          storyId: 'WISH-2047',
          artifactType: 'checkpoint',
          phase: 'invalid',
        }
        expect(() => NewStoryArtifactSchema.parse(artifact)).toThrow()
      })

      it('should reject negative iteration', () => {
        const artifact = {
          storyId: 'WISH-2047',
          artifactType: 'checkpoint',
          iteration: -1,
        }
        expect(() => NewStoryArtifactSchema.parse(artifact)).toThrow()
      })
    })

    describe('StoryArtifactSchema', () => {
      it('should accept valid artifact with UUID', () => {
        const artifact = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          storyId: 'WISH-2047',
          artifactType: 'proof',
        }
        const result = StoryArtifactSchema.parse(artifact)
        expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000')
      })

      it('should accept null for nullable fields', () => {
        const artifact = {
          storyId: 'WISH-2047',
          artifactType: 'checkpoint',
          artifactName: null,
          kbEntryId: null,
          filePath: null,
          phase: null,
          iteration: null,
          summary: null,
        }
        const result = StoryArtifactSchema.parse(artifact)
        expect(result.artifactName).toBeNull()
        expect(result.kbEntryId).toBeNull()
        expect(result.filePath).toBeNull()
        expect(result.phase).toBeNull()
        expect(result.iteration).toBeNull()
        expect(result.summary).toBeNull()
      })
    })

    describe('UpdateStoryArtifactSchema', () => {
      it('should accept partial updates', () => {
        const update = {
          artifactName: 'Updated Plan',
          phase: 'implementation',
        }
        const result = UpdateStoryArtifactSchema.parse(update)
        expect(result.artifactName).toBe('Updated Plan')
        expect(result.phase).toBe('implementation')
      })

      it('should accept kbEntryId update', () => {
        const update = {
          kbEntryId: '550e8400-e29b-41d4-a716-446655440000',
        }
        const result = UpdateStoryArtifactSchema.parse(update)
        expect(result.kbEntryId).toBe('550e8400-e29b-41d4-a716-446655440000')
      })

      it('should accept summary update', () => {
        const update = {
          summary: { status: 'completed', findings: [] },
        }
        const result = UpdateStoryArtifactSchema.parse(update)
        expect(result.summary).toEqual({ status: 'completed', findings: [] })
      })

      it('should accept null for nullable fields', () => {
        const update = {
          kbEntryId: null,
          filePath: null,
          summary: null,
        }
        const result = UpdateStoryArtifactSchema.parse(update)
        expect(result.kbEntryId).toBeNull()
        expect(result.filePath).toBeNull()
        expect(result.summary).toBeNull()
      })

      it('should accept empty object (no changes)', () => {
        const result = UpdateStoryArtifactSchema.parse({})
        expect(Object.keys(result)).toHaveLength(0)
      })

      it('should accept iteration update', () => {
        const update = {
          iteration: 3,
        }
        const result = UpdateStoryArtifactSchema.parse(update)
        expect(result.iteration).toBe(3)
      })
    })
  })
})
