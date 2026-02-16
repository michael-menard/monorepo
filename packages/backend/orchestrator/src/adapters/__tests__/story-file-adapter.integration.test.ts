/**
 * Story File Adapter Integration Tests
 *
 * Tests backward compatibility with real story files.
 * Verifies AC-7: Schema compatibility with existing story files.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { StoryFileAdapter } from '../story-file-adapter.js'
import type { StoryArtifact } from '../../artifacts/story-v2-compatible.js'

describe('StoryFileAdapter - Integration Tests', () => {
  const adapter = new StoryFileAdapter()
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'story-integration-test-'))
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('AC-7: Backward compatibility', () => {
    it('should handle legacy format (status, epic, acceptance_criteria)', async () => {
      const legacyStory: StoryArtifact = {
        id: 'INTG-001',
        title: 'Legacy Format Story',
        status: 'backlog',
        epic: 'test-epic',
        acceptance_criteria: [
          { id: 'AC-1', description: 'Test criterion' },
        ],
        content: '# Legacy Story Content',
      }

      const filePath = path.join(tempDir, 'legacy.yaml')
      await adapter.write(filePath, legacyStory)

      // Read back
      const read = await adapter.read(filePath)
      expect(read.status).toBe('backlog')
      expect(read.epic).toBe('test-epic')
      expect(read.acceptance_criteria).toHaveLength(1)
    })

    it('should handle v2 format (state, feature, acs)', async () => {
      const v2Story: StoryArtifact = {
        schema: 1,
        id: 'INTG-002',
        title: 'V2 Format Story',
        state: 'in-progress',
        feature: 'platform',
        acs: [
          { id: 'AC-1', description: 'Test criterion', testable: true },
        ],
        content: '# V2 Story Content',
      }

      const filePath = path.join(tempDir, 'v2.yaml')
      await adapter.write(filePath, v2Story)

      // Read back
      const read = await adapter.read(filePath)
      expect(read.state).toBe('in-progress')
      expect(read.feature).toBe('platform')
      expect(read.acs).toHaveLength(1)
    })

    it('should preserve unknown fields via passthrough', async () => {
      const storyWithExtra: StoryArtifact = {
        id: 'INTG-003',
        title: 'Story with Extra Fields',
        custom_field: 'custom value',
        another_field: 123,
      } as StoryArtifact

      const filePath = path.join(tempDir, 'extra.yaml')
      await adapter.write(filePath, storyWithExtra)

      // Read back
      const read = await adapter.read(filePath)
      expect(read.id).toBe('INTG-003')
      expect((read as any).custom_field).toBe('custom value')
      expect((read as any).another_field).toBe(123)
    })
  })

  describe('Round-trip compatibility', () => {
    it('should preserve all fields through write-read cycle', async () => {
      const complexStory: StoryArtifact = {
        schema: 1,
        id: 'INTG-004',
        title: 'Complex Story',
        type: 'feature',
        state: 'in-progress',
        feature: 'platform',
        points: 5,
        priority: 'high',
        acs: [
          { id: 'AC-1', description: 'First criterion', testable: true },
          { id: 'AC-2', description: 'Second criterion', testable: false },
        ],
        risks: [
          { id: 'RISK-1', description: 'Test risk', severity: 'high', mitigation: 'Mitigate it' },
        ],
        depends_on: ['INTG-005', 'INTG-006'],
        goal: 'Test goal',
        non_goals: ['Not this', 'Not that'],
        scope: {
          packages: ['@repo/orchestrator'],
          surfaces: ['packages'],
        },
        content: '# Complex Story\n\nWith detailed content.',
      }

      const filePath = path.join(tempDir, 'complex.yaml')

      // Write
      await adapter.write(filePath, complexStory)

      // Read back
      const read = await adapter.read(filePath)

      // Verify all fields preserved
      expect(read.id).toBe(complexStory.id)
      expect(read.title).toBe(complexStory.title)
      expect(read.type).toBe(complexStory.type)
      expect(read.state).toBe(complexStory.state)
      expect(read.feature).toBe(complexStory.feature)
      expect(read.points).toBe(complexStory.points)
      expect(read.priority).toBe(complexStory.priority)
      expect(read.acs).toHaveLength(2)
      expect(read.risks).toHaveLength(1)
      expect(read.depends_on).toEqual(complexStory.depends_on)
      expect(read.goal).toBe(complexStory.goal)
      expect(read.non_goals).toEqual(complexStory.non_goals)
      expect(read.content).toContain('Complex Story')
    })
  })
})
