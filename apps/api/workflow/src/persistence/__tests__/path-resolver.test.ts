import { describe, it, expect } from 'vitest'
import * as path from 'path'
import {
  PathResolver,
  createPathResolver,
  inferFeatureFromStoryId,
  isValidStoryId,
  normalizeStage,
} from '../path-resolver.js'

describe('PathResolver', () => {
  const workspaceRoot = '/Users/test/workspace'

  describe('constructor', () => {
    it('creates resolver with default config', () => {
      const resolver = createPathResolver(workspaceRoot)
      expect(resolver.plansRoot).toBe(path.join(workspaceRoot, 'plans/future'))
    })

    it('creates resolver with custom plansRoot', () => {
      const resolver = createPathResolver(workspaceRoot, { plansRoot: 'custom/plans' })
      expect(resolver.plansRoot).toBe(path.join(workspaceRoot, 'custom/plans'))
    })
  })

  describe('getStageDirectory', () => {
    const resolver = createPathResolver(workspaceRoot)

    it('maps draft to backlog', () => {
      expect(resolver.getStageDirectory('draft')).toBe('backlog')
    })

    it('maps uat to UAT (preserving case)', () => {
      expect(resolver.getStageDirectory('uat')).toBe('UAT')
    })

    it('maps done to completed', () => {
      expect(resolver.getStageDirectory('done')).toBe('completed')
    })

    it('passes through unknown stages', () => {
      expect(resolver.getStageDirectory('custom')).toBe('custom')
    })
  })

  describe('getStageFromDirectory', () => {
    const resolver = createPathResolver(workspaceRoot)

    it('normalizes directory names to stages', () => {
      expect(resolver.getStageFromDirectory('backlog')).toBe('backlog')
      expect(resolver.getStageFromDirectory('UAT')).toBe('uat')
      expect(resolver.getStageFromDirectory('completed')).toBe('completed')
    })

    it('handles case insensitivity', () => {
      expect(resolver.getStageFromDirectory('BACKLOG')).toBe('backlog')
      expect(resolver.getStageFromDirectory('uat')).toBe('uat')
    })

    it('returns null for unknown directories', () => {
      expect(resolver.getStageFromDirectory('unknown')).toBeNull()
    })
  })

  describe('getArtifactFilename', () => {
    const resolver = createPathResolver(workspaceRoot)

    it('returns correct filenames', () => {
      expect(resolver.getArtifactFilename('story')).toBe('story.yaml')
      expect(resolver.getArtifactFilename('elaboration')).toBe('elaboration.yaml')
      expect(resolver.getArtifactFilename('plan')).toBe('plan.yaml')
      expect(resolver.getArtifactFilename('verification')).toBe('verification.yaml')
      expect(resolver.getArtifactFilename('proof')).toBe('proof.yaml')
    })
  })

  describe('getArtifactTypeFromFilename', () => {
    const resolver = createPathResolver(workspaceRoot)

    it('returns artifact type from filename', () => {
      expect(resolver.getArtifactTypeFromFilename('story.yaml')).toBe('story')
      expect(resolver.getArtifactTypeFromFilename('elaboration.yaml')).toBe('elaboration')
    })

    it('returns null for unknown filenames', () => {
      expect(resolver.getArtifactTypeFromFilename('unknown.yaml')).toBeNull()
    })
  })

  describe('getStoryDirectoryPath', () => {
    const resolver = createPathResolver(workspaceRoot)

    it('builds correct path for story directory', () => {
      const result = resolver.getStoryDirectoryPath('wish', 'uat', 'WISH-2001')
      expect(result).toBe(path.join(workspaceRoot, 'plans/future/wish/UAT/WISH-2001'))
    })

    it('handles different stages', () => {
      const backlog = resolver.getStoryDirectoryPath('wish', 'backlog', 'WISH-2001')
      expect(backlog).toContain('/backlog/')

      const inProgress = resolver.getStoryDirectoryPath('wish', 'in-progress', 'WISH-2001')
      expect(inProgress).toContain('/in-progress/')
    })
  })

  describe('getArtifactPath', () => {
    const resolver = createPathResolver(workspaceRoot)

    it('builds correct path for artifact', () => {
      const result = resolver.getArtifactPath('wish', 'uat', 'WISH-2001', 'story')
      expect(result).toBe(
        path.join(workspaceRoot, 'plans/future/wish/UAT/WISH-2001/story.yaml'),
      )
    })
  })

  describe('resolveArtifactPath', () => {
    const resolver = createPathResolver(workspaceRoot)

    it('returns resolved path information', () => {
      const result = resolver.resolveArtifactPath('wish', 'uat', 'WISH-2001', 'story')

      expect(result.absolutePath).toBe(
        path.join(workspaceRoot, 'plans/future/wish/UAT/WISH-2001/story.yaml'),
      )
      expect(result.relativePath).toBe('wish/UAT/WISH-2001/story.yaml')
      expect(result.feature).toBe('wish')
      expect(result.stageDirectory).toBe('UAT')
      expect(result.storyId).toBe('WISH-2001')
      expect(result.artifactType).toBe('story')
      expect(result.filename).toBe('story.yaml')
    })
  })

  describe('parsePath', () => {
    const resolver = createPathResolver(workspaceRoot)

    it('parses a valid artifact path', () => {
      const filePath = path.join(
        workspaceRoot,
        'plans/future/wish/UAT/WISH-2001/story.yaml',
      )
      const result = resolver.parsePath(filePath)

      expect(result).not.toBeNull()
      expect(result?.feature).toBe('wish')
      expect(result?.stageDirectory).toBe('UAT')
      expect(result?.storyId).toBe('WISH-2001')
      expect(result?.artifactType).toBe('story')
    })

    it('returns null for invalid path', () => {
      const result = resolver.parsePath('/some/other/path')
      expect(result).toBeNull()
    })

    it('returns null for path with unknown artifact type', () => {
      const filePath = path.join(
        workspaceRoot,
        'plans/future/wish/UAT/WISH-2001/unknown.yaml',
      )
      const result = resolver.parsePath(filePath)
      expect(result).toBeNull()
    })
  })

  describe('getAllStageDirectories', () => {
    const resolver = createPathResolver(workspaceRoot)

    it('returns all stage directories', () => {
      const stages = resolver.getAllStageDirectories()
      expect(stages).toContain('backlog')
      expect(stages).toContain('UAT')
      expect(stages).toContain('completed')
      expect(stages).toContain('in-progress')
    })
  })

  describe('getSearchPaths', () => {
    const resolver = createPathResolver(workspaceRoot)

    it('returns paths for all stages', () => {
      const paths = resolver.getSearchPaths('wish', 'WISH-2001', 'story')
      expect(paths.length).toBeGreaterThan(0)
      expect(paths.some(p => p.includes('/UAT/'))).toBe(true)
      expect(paths.some(p => p.includes('/backlog/'))).toBe(true)
    })
  })

  describe('getProofOrVerificationPath', () => {
    it('returns verification as primary by default', () => {
      const resolver = createPathResolver(workspaceRoot, { preferVerificationYaml: true })
      const { primary, fallback } = resolver.getProofOrVerificationPath('wish', 'uat', 'WISH-2001')

      expect(primary).toContain('verification.yaml')
      expect(fallback).toContain('proof.yaml')
    })

    it('returns proof as primary when configured', () => {
      const resolver = createPathResolver(workspaceRoot, { preferVerificationYaml: false })
      const { primary, fallback } = resolver.getProofOrVerificationPath('wish', 'uat', 'WISH-2001')

      expect(primary).toContain('proof.yaml')
      expect(fallback).toContain('verification.yaml')
    })
  })

  describe('extractFeatureFromStoryId', () => {
    const resolver = createPathResolver(workspaceRoot)

    it('extracts feature from story ID', () => {
      expect(resolver.extractFeatureFromStoryId('WISH-2001')).toBe('wish')
      expect(resolver.extractFeatureFromStoryId('KNOW-123')).toBe('know')
    })

    it('returns null for invalid story ID', () => {
      expect(resolver.extractFeatureFromStoryId('invalid')).toBeNull()
    })
  })
})

describe('inferFeatureFromStoryId', () => {
  it('extracts feature prefix in lowercase', () => {
    expect(inferFeatureFromStoryId('WISH-2001')).toBe('wish')
    expect(inferFeatureFromStoryId('KNOW-123')).toBe('know')
    expect(inferFeatureFromStoryId('FLOW-456')).toBe('flow')
  })

  it('handles mixed case', () => {
    expect(inferFeatureFromStoryId('Wish-2001')).toBe('wish')
  })

  it('returns null for invalid format', () => {
    expect(inferFeatureFromStoryId('invalid')).toBeNull()
    expect(inferFeatureFromStoryId('WISH')).toBeNull()
    expect(inferFeatureFromStoryId('2001')).toBeNull()
  })
})

describe('isValidStoryId', () => {
  it('returns true for valid story IDs', () => {
    expect(isValidStoryId('WISH-2001')).toBe(true)
    expect(isValidStoryId('KNOW-123')).toBe(true)
    expect(isValidStoryId('A-1')).toBe(true)
  })

  it('returns false for invalid story IDs', () => {
    expect(isValidStoryId('invalid')).toBe(false)
    expect(isValidStoryId('WISH-')).toBe(false)
    expect(isValidStoryId('-2001')).toBe(false)
    expect(isValidStoryId('')).toBe(false)
  })
})

describe('normalizeStage', () => {
  it('normalizes stage names', () => {
    expect(normalizeStage('backlog')).toBe('backlog')
    expect(normalizeStage('UAT')).toBe('uat')
    expect(normalizeStage('completed')).toBe('completed')
  })

  it('handles case insensitivity', () => {
    expect(normalizeStage('BACKLOG')).toBe('backlog')
    expect(normalizeStage('Uat')).toBe('uat')
  })

  it('returns null for unknown stages', () => {
    expect(normalizeStage('unknown')).toBeNull()
  })
})
