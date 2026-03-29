import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import * as yaml from 'yaml'
import {
  YamlArtifactBridge,
  createYamlArtifactBridge,
} from '../yaml-artifact-bridge.js'
import {
  YamlArtifactReader,
  createYamlArtifactReader,
  type ClaudeStoryYaml,
  type ClaudeElaborationYaml,
  type ClaudePlanYaml,
} from '../yaml-artifact-reader.js'
import {
  YamlArtifactWriter,
  createYamlArtifactWriter,
} from '../yaml-artifact-writer.js'
import { createPathResolver } from '../path-resolver.js'

describe('YamlArtifactBridge', () => {
  let tempDir: string
  let bridge: YamlArtifactBridge

  beforeEach(async () => {
    // Create a temporary directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'yaml-bridge-test-'))

    // Create bridge with temp directory as workspace
    bridge = createYamlArtifactBridge({
      workspaceRoot: tempDir,
      plansRoot: 'plans/future',
    })
  })

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('loadFromYaml', () => {
    it('loads story from YAML file', async () => {
      // Setup: Create a story.yaml file
      const storyDir = path.join(tempDir, 'plans/future/wish/UAT/WISH-2001')
      await fs.mkdir(storyDir, { recursive: true })

      const storyData: ClaudeStoryYaml = {
        schema: 1,
        id: 'WISH-2001',
        feature: 'wish',
        type: 'feature',
        state: 'uat',
        title: 'Test Story',
        points: 3,
        priority: 'medium',
        blocked_by: null,
        depends_on: [],
        follow_up_from: null,
        scope: {
          packages: [],
          surfaces: ['frontend', 'infra'], // Uses YAML short form
        },
        goal: 'Test goal',
        non_goals: [],
        acs: [],
        risks: [],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      await fs.writeFile(
        path.join(storyDir, 'story.yaml'),
        yaml.stringify(storyData),
      )

      // Test
      const result = await bridge.loadFromYaml('WISH-2001', 'wish', 'uat')

      expect(result.loaded).toBe(true)
      expect(result.source).toBe('yaml')
      expect(result.story).not.toBeNull()
      expect(result.story?.id).toBe('WISH-2001')
      expect(result.story?.title).toBe('Test Story')
      // Surface normalization should have happened
      expect(result.story?.scope.surfaces).toContain('infrastructure')
    })

    it('returns not loaded when story file does not exist', async () => {
      const result = await bridge.loadFromYaml('WISH-9999', 'wish', 'uat')

      expect(result.loaded).toBe(false)
      expect(result.source).toBe('none')
      expect(result.error).toContain('not found')
    })

    it('loads multiple artifacts', async () => {
      // Setup: Create multiple YAML files
      const storyDir = path.join(tempDir, 'plans/future/wish/UAT/WISH-2001')
      await fs.mkdir(storyDir, { recursive: true })

      const storyData: ClaudeStoryYaml = {
        schema: 1,
        id: 'WISH-2001',
        feature: 'wish',
        type: 'feature',
        state: 'uat',
        title: 'Test Story',
        points: 3,
        priority: null,
        blocked_by: null,
        depends_on: [],
        follow_up_from: null,
        scope: { packages: [], surfaces: [] },
        goal: 'Test goal',
        non_goals: [],
        acs: [],
        risks: [],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      const elabData: ClaudeElaborationYaml = {
        schema: 1,
        story_id: 'WISH-2001',
        date: '2026-01-01',
        verdict: 'pass',
        gaps: [],
      }

      const planData: ClaudePlanYaml = {
        schema: 1,
        story_id: 'WISH-2001',
        version: 1,
        approved: true,
        estimates: { files: 5, tokens: 10000 },
        chunks: [],
        reuse: [],
      }

      await Promise.all([
        fs.writeFile(path.join(storyDir, 'story.yaml'), yaml.stringify(storyData)),
        fs.writeFile(path.join(storyDir, 'elaboration.yaml'), yaml.stringify(elabData)),
        fs.writeFile(path.join(storyDir, 'plan.yaml'), yaml.stringify(planData)),
      ])

      // Test
      const result = await bridge.loadFromYaml('WISH-2001', 'wish', 'uat')

      expect(result.loaded).toBe(true)
      expect(result.story).not.toBeNull()
      expect(result.elaboration).not.toBeNull()
      expect(result.plan).not.toBeNull()
      expect(result.elaboration?.verdict).toBe('pass')
      expect(result.plan?.approved).toBe(true)
    })
  })

  describe('saveToYaml', () => {
    it('writes story to YAML file', async () => {
      const storyData: ClaudeStoryYaml = {
        schema: 1,
        id: 'WISH-2002',
        feature: 'wish',
        type: 'feature',
        state: 'in-progress',
        title: 'New Story',
        points: 5,
        priority: 'high',
        blocked_by: null,
        depends_on: [],
        follow_up_from: null,
        scope: {
          packages: ['@repo/core'],
          surfaces: ['frontend', 'infrastructure'], // Uses normalized form
        },
        goal: 'Implement feature',
        non_goals: [],
        acs: [],
        risks: [],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      // Test
      const result = await bridge.saveToYaml('WISH-2002', 'wish', 'in-progress', {
        story: storyData,
      })

      expect(result.success).toBe(true)
      expect(result.artifacts.some(a => a.artifactType === 'story')).toBe(true)

      // Verify file was created
      const filePath = path.join(
        tempDir,
        'plans/future/wish/in-progress/WISH-2002/story.yaml',
      )
      const content = await fs.readFile(filePath, 'utf-8')
      const parsed = yaml.parse(content)

      expect(parsed.id).toBe('WISH-2002')
      expect(parsed.title).toBe('New Story')
      // Surface should be denormalized for YAML
      expect(parsed.scope.surfaces).toContain('infra')
    })

    it('creates directory if it does not exist', async () => {
      const storyData: ClaudeStoryYaml = {
        schema: 1,
        id: 'WISH-3000',
        feature: 'wish',
        type: 'feature',
        state: 'draft',
        title: 'Story in New Directory',
        points: null,
        priority: null,
        blocked_by: null,
        depends_on: [],
        follow_up_from: null,
        scope: { packages: [], surfaces: [] },
        goal: 'Test',
        non_goals: [],
        acs: [],
        risks: [],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      const result = await bridge.saveToYaml('WISH-3000', 'wish', 'backlog', {
        story: storyData,
      })

      expect(result.success).toBe(true)

      // Verify directory was created
      const dirPath = path.join(tempDir, 'plans/future/wish/backlog/WISH-3000')
      const stat = await fs.stat(dirPath)
      expect(stat.isDirectory()).toBe(true)
    })
  })

  describe('round-trip', () => {
    it('preserves data through save and load', async () => {
      const originalStory: ClaudeStoryYaml = {
        schema: 1,
        id: 'WISH-4000',
        feature: 'wish',
        type: 'enhancement',
        state: 'ready-to-work',
        title: 'Round Trip Test',
        points: 8,
        priority: 'medium',
        blocked_by: null,
        depends_on: ['WISH-3999'],
        follow_up_from: 'WISH-3998',
        scope: {
          packages: ['@repo/ui', '@repo/api'],
          surfaces: ['frontend', 'backend', 'infrastructure'],
        },
        goal: 'Test round trip',
        non_goals: ['Not doing this'],
        acs: [
          { id: 'AC-001', description: 'First criterion', testable: true, automated: false },
        ],
        risks: [
          { id: 'RISK-001', description: 'Risk description', severity: 'high', mitigation: 'Mitigate it' },
        ],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-02T00:00:00Z',
      }

      // Save
      await bridge.saveToYaml('WISH-4000', 'wish', 'ready-to-work', {
        story: originalStory,
      })

      // Load
      const result = await bridge.loadFromYaml('WISH-4000', 'wish', 'ready-to-work')

      expect(result.loaded).toBe(true)
      expect(result.story).not.toBeNull()

      const loadedStory = result.story!

      // Core fields preserved
      expect(loadedStory.id).toBe(originalStory.id)
      expect(loadedStory.title).toBe(originalStory.title)
      expect(loadedStory.type).toBe(originalStory.type)
      expect(loadedStory.state).toBe(originalStory.state)
      expect(loadedStory.points).toBe(originalStory.points)
      expect(loadedStory.priority).toBe(originalStory.priority)
      expect(loadedStory.goal).toBe(originalStory.goal)

      // Arrays preserved
      expect(loadedStory.depends_on).toEqual(originalStory.depends_on)
      expect(loadedStory.non_goals).toEqual(originalStory.non_goals)
      expect(loadedStory.scope.packages).toEqual(originalStory.scope.packages)

      // ACs and risks preserved
      expect(loadedStory.acs).toHaveLength(1)
      expect(loadedStory.acs[0].id).toBe('AC-001')
      expect(loadedStory.risks).toHaveLength(1)
      expect(loadedStory.risks[0].id).toBe('RISK-001')

      // Surfaces normalized on read (infra -> infrastructure)
      expect(loadedStory.scope.surfaces).toContain('infrastructure')
    })
  })
})

describe('YamlArtifactReader', () => {
  let tempDir: string
  let reader: YamlArtifactReader

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'yaml-reader-test-'))
    const pathResolver = createPathResolver(tempDir)
    reader = createYamlArtifactReader(pathResolver)
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('readStory', () => {
    it('reads and validates story file', async () => {
      const storyDir = path.join(tempDir, 'plans/future/wish/UAT/WISH-2001')
      await fs.mkdir(storyDir, { recursive: true })

      const storyData = {
        schema: 1,
        id: 'WISH-2001',
        feature: 'wish',
        type: 'feature',
        state: 'uat',
        title: 'Test',
        goal: 'Test',
        scope: { packages: [], surfaces: ['infra'] },
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      await fs.writeFile(
        path.join(storyDir, 'story.yaml'),
        yaml.stringify(storyData),
      )

      const result = await reader.readStory('wish', 'uat', 'WISH-2001')

      expect(result.success).toBe(true)
      expect(result.data?.id).toBe('WISH-2001')
      expect(result.data?.scope.surfaces).toContain('infrastructure')
      expect(result.warnings).toContain('Surface types were normalized (infra → infrastructure)')
    })

    it('returns error for missing file', async () => {
      const result = await reader.readStory('wish', 'uat', 'WISH-9999')

      expect(result.success).toBe(false)
      expect(result.error).toBe('File not found')
    })
  })

  describe('findAndReadStory', () => {
    it('finds story across multiple stages', async () => {
      // Create story in UAT stage
      const storyDir = path.join(tempDir, 'plans/future/wish/UAT/WISH-2001')
      await fs.mkdir(storyDir, { recursive: true })

      const storyData = {
        schema: 1,
        id: 'WISH-2001',
        feature: 'wish',
        type: 'feature',
        state: 'uat',
        title: 'Found Story',
        goal: 'Test',
        scope: { packages: [], surfaces: [] },
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      await fs.writeFile(
        path.join(storyDir, 'story.yaml'),
        yaml.stringify(storyData),
      )

      // Search without knowing the stage
      const result = await reader.findAndReadStory('wish', 'WISH-2001')

      expect(result).not.toBeNull()
      expect(result?.success).toBe(true)
      expect(result?.data?.title).toBe('Found Story')
      expect(result?.path.stageDirectory).toBe('UAT')
    })

    it('returns null when story not found in any stage', async () => {
      const result = await reader.findAndReadStory('wish', 'WISH-9999')
      expect(result).toBeNull()
    })
  })
})

describe('YamlArtifactWriter', () => {
  let tempDir: string
  let writer: YamlArtifactWriter

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'yaml-writer-test-'))
    const pathResolver = createPathResolver(tempDir)
    writer = createYamlArtifactWriter(pathResolver)
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('writeStory', () => {
    it('writes story to correct path', async () => {
      const storyData: ClaudeStoryYaml = {
        schema: 1,
        id: 'WISH-2001',
        feature: 'wish',
        type: 'feature',
        state: 'in-progress',
        title: 'Written Story',
        points: null,
        priority: null,
        blocked_by: null,
        depends_on: [],
        follow_up_from: null,
        scope: { packages: [], surfaces: ['infrastructure'] },
        goal: 'Test',
        non_goals: [],
        acs: [],
        risks: [],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      const result = await writer.writeStory('wish', 'in-progress', 'WISH-2001', storyData)

      expect(result.success).toBe(true)
      expect(result.created).toBe(true) // Directory was created

      // Verify file content
      const filePath = path.join(
        tempDir,
        'plans/future/wish/in-progress/WISH-2001/story.yaml',
      )
      const content = await fs.readFile(filePath, 'utf-8')
      const parsed = yaml.parse(content)

      expect(parsed.title).toBe('Written Story')
      // Should denormalize infrastructure to infra
      expect(parsed.scope.surfaces).toContain('infra')
    })

    it('creates nested directories', async () => {
      const storyData: ClaudeStoryYaml = {
        schema: 1,
        id: 'NEW-001',
        feature: 'new-feature',
        type: 'feature',
        state: 'draft',
        title: 'New Feature Story',
        points: null,
        priority: null,
        blocked_by: null,
        depends_on: [],
        follow_up_from: null,
        scope: { packages: [], surfaces: [] },
        goal: 'Test',
        non_goals: [],
        acs: [],
        risks: [],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      const result = await writer.writeStory('new-feature', 'backlog', 'NEW-001', storyData)

      expect(result.success).toBe(true)
      expect(result.created).toBe(true)

      // Verify directory structure was created
      const dirPath = path.join(tempDir, 'plans/future/new-feature/backlog/NEW-001')
      const stat = await fs.stat(dirPath)
      expect(stat.isDirectory()).toBe(true)
    })
  })

  describe('deleteArtifact', () => {
    it('deletes existing artifact', async () => {
      // First create the file
      const storyData: ClaudeStoryYaml = {
        schema: 1,
        id: 'WISH-DEL',
        feature: 'wish',
        type: 'feature',
        state: 'draft',
        title: 'To Delete',
        points: null,
        priority: null,
        blocked_by: null,
        depends_on: [],
        follow_up_from: null,
        scope: { packages: [], surfaces: [] },
        goal: 'Test',
        non_goals: [],
        acs: [],
        risks: [],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      await writer.writeStory('wish', 'backlog', 'WISH-DEL', storyData)

      // Now delete
      const result = await writer.deleteArtifact('wish', 'backlog', 'WISH-DEL', 'story')

      expect(result.success).toBe(true)

      // Verify file is gone
      const filePath = path.join(
        tempDir,
        'plans/future/wish/backlog/WISH-DEL/story.yaml',
      )
      await expect(fs.access(filePath)).rejects.toThrow()
    })

    it('succeeds when file does not exist', async () => {
      const result = await writer.deleteArtifact('wish', 'backlog', 'NONEXISTENT', 'story')

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('File did not exist')
    })
  })
})
