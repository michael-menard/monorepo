import { describe, it, expect } from 'vitest'
import {
  SyntheticTestStorySchema,
  ChangeSpecSchema,
  SyntheticAcSchema,
  syntheticTestStory,
  syntheticEvidenceStub,
} from '../synthetic-story.ts'

describe('SyntheticTestStorySchema', () => {
  it('parses the pre-built syntheticTestStory fixture without ZodError', () => {
    const result = SyntheticTestStorySchema.safeParse(syntheticTestStory)
    expect(result.success).toBe(true)
    if (!result.success) {
      throw new Error(`ZodError: ${result.error.message}`)
    }
  })

  it('fixture has required storyId prefixed with e2e-', () => {
    expect(syntheticTestStory.storyId).toMatch(/^e2e-/)
  })

  it('fixture has at least one AC', () => {
    expect(syntheticTestStory.acs.length).toBeGreaterThanOrEqual(1)
  })

  it('fixture changeSpec targets a non-critical utility file in orchestrator', () => {
    expect(syntheticTestStory.changeSpec.targetFile).toContain('packages/backend/orchestrator')
    expect(syntheticTestStory.changeSpec.targetFile).toContain('utils')
  })

  it('fixture changeSpec codeToAdd is non-empty', () => {
    expect(syntheticTestStory.changeSpec.codeToAdd.trim().length).toBeGreaterThan(0)
  })

  it('fixture queueName is pipeline-e2e', () => {
    expect(syntheticTestStory.queueName).toBe('pipeline-e2e')
  })

  it('fixture createdAt is a valid ISO 8601 datetime', () => {
    expect(() => new Date(syntheticTestStory.createdAt)).not.toThrow()
    expect(new Date(syntheticTestStory.createdAt).toISOString()).toBe(syntheticTestStory.createdAt)
  })

  it('rejects fixture with empty acs array', () => {
    const invalid = { ...syntheticTestStory, acs: [] }
    const result = SyntheticTestStorySchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects fixture with missing storyId', () => {
    const { storyId: _omitted, ...rest } = syntheticTestStory
    const result = SyntheticTestStorySchema.safeParse(rest)
    expect(result.success).toBe(false)
  })
})

describe('ChangeSpecSchema', () => {
  it('parses valid ChangeSpec', () => {
    const result = ChangeSpecSchema.safeParse(syntheticTestStory.changeSpec)
    expect(result.success).toBe(true)
  })

  it('rejects ChangeSpec with missing targetFile', () => {
    const { targetFile: _omitted, ...rest } = syntheticTestStory.changeSpec
    const result = ChangeSpecSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })
})

describe('SyntheticAcSchema', () => {
  it('parses valid AC from fixture', () => {
    const result = SyntheticAcSchema.safeParse(syntheticTestStory.acs[0])
    expect(result.success).toBe(true)
  })
})

describe('syntheticEvidenceStub', () => {
  it('has matching story_id', () => {
    expect(syntheticEvidenceStub.story_id).toBe(syntheticTestStory.storyId)
  })

  it('has acceptance_criteria with PASS status', () => {
    expect(syntheticEvidenceStub.acceptance_criteria.length).toBeGreaterThan(0)
    for (const ac of syntheticEvidenceStub.acceptance_criteria) {
      expect(ac.status).toBe('PASS')
    }
  })

  it('has commands_run with SUCCESS results', () => {
    expect(syntheticEvidenceStub.commands_run.length).toBeGreaterThan(0)
    for (const cmd of syntheticEvidenceStub.commands_run) {
      expect(cmd.result).toBe('SUCCESS')
    }
  })
})
