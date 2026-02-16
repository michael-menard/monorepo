import { describe, it, expect } from 'vitest'
import { randomUUID } from 'crypto'
import {
  SessionCreateInputSchema,
  SessionUpdateInputSchema,
  SessionCompleteInputSchema,
  SessionQueryInputSchema,
  SessionCleanupInputSchema,
} from '../__types__/index'

describe('Session Management Zod Schemas (AC-6)', () => {
  describe('SessionCreateInputSchema', () => {
    it('should validate minimal input (agentName only)', () => {
      const input = {
        agentName: 'test-agent',
      }

      const result = SessionCreateInputSchema.parse(input)

      expect(result.agentName).toBe('test-agent')
      expect(result.inputTokens).toBe(0)
      expect(result.outputTokens).toBe(0)
      expect(result.cachedTokens).toBe(0)
    })

    it('should validate full input with all fields', () => {
      const sessionId = randomUUID()
      const startedAt = new Date()
      const input = {
        sessionId,
        agentName: 'dev-execute-leader',
        storyId: 'WINT-0110',
        phase: 'execute',
        inputTokens: 100,
        outputTokens: 50,
        cachedTokens: 25,
        startedAt,
      }

      const result = SessionCreateInputSchema.parse(input)

      expect(result.sessionId).toBe(sessionId)
      expect(result.agentName).toBe('dev-execute-leader')
      expect(result.storyId).toBe('WINT-0110')
      expect(result.phase).toBe('execute')
      expect(result.inputTokens).toBe(100)
      expect(result.outputTokens).toBe(50)
      expect(result.cachedTokens).toBe(25)
      expect(result.startedAt).toEqual(startedAt)
    })

    it('should reject missing agentName', () => {
      expect(() =>
        SessionCreateInputSchema.parse({
          sessionId: randomUUID(),
        }),
      ).toThrow()
    })

    it('should reject empty agentName', () => {
      expect(() =>
        SessionCreateInputSchema.parse({
          agentName: '',
        }),
      ).toThrow()
    })

    it('should reject invalid UUID for sessionId', () => {
      expect(() =>
        SessionCreateInputSchema.parse({
          sessionId: 'not-a-uuid',
          agentName: 'test-agent',
        }),
      ).toThrow()
    })

    it('should reject negative token counts', () => {
      expect(() =>
        SessionCreateInputSchema.parse({
          agentName: 'test-agent',
          inputTokens: -100,
        }),
      ).toThrow()

      expect(() =>
        SessionCreateInputSchema.parse({
          agentName: 'test-agent',
          outputTokens: -50,
        }),
      ).toThrow()

      expect(() =>
        SessionCreateInputSchema.parse({
          agentName: 'test-agent',
          cachedTokens: -25,
        }),
      ).toThrow()
    })

    it('should accept null values for optional fields', () => {
      const input = {
        agentName: 'test-agent',
        storyId: null,
        phase: null,
      }

      const result = SessionCreateInputSchema.parse(input)

      expect(result.storyId).toBeNull()
      expect(result.phase).toBeNull()
    })
  })

  describe('SessionUpdateInputSchema', () => {
    it('should validate incremental mode (default)', () => {
      const sessionId = randomUUID()
      const input = {
        sessionId,
        inputTokens: 100,
      }

      const result = SessionUpdateInputSchema.parse(input)

      expect(result.sessionId).toBe(sessionId)
      expect(result.mode).toBe('incremental')
      expect(result.inputTokens).toBe(100)
    })

    it('should validate absolute mode', () => {
      const sessionId = randomUUID()
      const input = {
        sessionId,
        mode: 'absolute' as const,
        outputTokens: 500,
      }

      const result = SessionUpdateInputSchema.parse(input)

      expect(result.mode).toBe('absolute')
    })

    it('should reject invalid mode enum', () => {
      const sessionId = randomUUID()
      expect(() =>
        SessionUpdateInputSchema.parse({
          sessionId,
          // @ts-expect-error - testing invalid enum
          mode: 'invalid-mode',
        }),
      ).toThrow()
    })

    it('should reject missing sessionId', () => {
      expect(() =>
        SessionUpdateInputSchema.parse({
          inputTokens: 100,
        }),
      ).toThrow()
    })

    it('should reject invalid UUID for sessionId', () => {
      expect(() =>
        SessionUpdateInputSchema.parse({
          sessionId: 'not-a-uuid',
          inputTokens: 100,
        }),
      ).toThrow()
    })

    it('should reject negative token counts', () => {
      const sessionId = randomUUID()

      expect(() =>
        SessionUpdateInputSchema.parse({
          sessionId,
          inputTokens: -100,
        }),
      ).toThrow()
    })

    it('should accept updating only specific token fields', () => {
      const sessionId = randomUUID()
      const input = {
        sessionId,
        inputTokens: 100,
        // outputTokens and cachedTokens not specified
      }

      const result = SessionUpdateInputSchema.parse(input)

      expect(result.inputTokens).toBe(100)
      expect(result.outputTokens).toBeUndefined()
      expect(result.cachedTokens).toBeUndefined()
    })
  })

  describe('SessionCompleteInputSchema', () => {
    it('should validate minimal input (sessionId only)', () => {
      const sessionId = randomUUID()
      const input = {
        sessionId,
      }

      const result = SessionCompleteInputSchema.parse(input)

      expect(result.sessionId).toBe(sessionId)
      expect(result.endedAt).toBeUndefined()
    })

    it('should validate with endedAt timestamp', () => {
      const sessionId = randomUUID()
      const endedAt = new Date()
      const input = {
        sessionId,
        endedAt,
      }

      const result = SessionCompleteInputSchema.parse(input)

      expect(result.endedAt).toEqual(endedAt)
    })

    it('should validate with final token counts', () => {
      const sessionId = randomUUID()
      const input = {
        sessionId,
        inputTokens: 5000,
        outputTokens: 2500,
        cachedTokens: 1000,
      }

      const result = SessionCompleteInputSchema.parse(input)

      expect(result.inputTokens).toBe(5000)
      expect(result.outputTokens).toBe(2500)
      expect(result.cachedTokens).toBe(1000)
    })

    it('should reject missing sessionId', () => {
      expect(() =>
        SessionCompleteInputSchema.parse({
          endedAt: new Date(),
        }),
      ).toThrow()
    })

    it('should reject invalid UUID for sessionId', () => {
      expect(() =>
        SessionCompleteInputSchema.parse({
          sessionId: 'not-a-uuid',
        }),
      ).toThrow()
    })

    it('should reject negative token counts', () => {
      const sessionId = randomUUID()

      expect(() =>
        SessionCompleteInputSchema.parse({
          sessionId,
          inputTokens: -100,
        }),
      ).toThrow()
    })
  })

  describe('SessionQueryInputSchema', () => {
    it('should validate empty input (query all)', () => {
      const input = {}

      const result = SessionQueryInputSchema.parse(input)

      expect(result.activeOnly).toBe(false)
      expect(result.limit).toBe(50)
      expect(result.offset).toBe(0)
    })

    it('should validate with agentName filter', () => {
      const input = {
        agentName: 'dev-execute-leader',
      }

      const result = SessionQueryInputSchema.parse(input)

      expect(result.agentName).toBe('dev-execute-leader')
    })

    it('should validate with storyId filter', () => {
      const input = {
        storyId: 'WINT-0110',
      }

      const result = SessionQueryInputSchema.parse(input)

      expect(result.storyId).toBe('WINT-0110')
    })

    it('should validate with activeOnly filter', () => {
      const input = {
        activeOnly: true,
      }

      const result = SessionQueryInputSchema.parse(input)

      expect(result.activeOnly).toBe(true)
    })

    it('should validate custom limit and offset', () => {
      const input = {
        limit: 100,
        offset: 50,
      }

      const result = SessionQueryInputSchema.parse(input)

      expect(result.limit).toBe(100)
      expect(result.offset).toBe(50)
    })

    it('should reject limit exceeding 1000', () => {
      expect(() =>
        SessionQueryInputSchema.parse({
          limit: 2000,
        }),
      ).toThrow()
    })

    it('should reject negative limit', () => {
      expect(() =>
        SessionQueryInputSchema.parse({
          limit: -10,
        }),
      ).toThrow()
    })

    it('should reject negative offset', () => {
      expect(() =>
        SessionQueryInputSchema.parse({
          offset: -5,
        }),
      ).toThrow()
    })

    it('should validate combined filters', () => {
      const input = {
        agentName: 'dev-execute-leader',
        storyId: 'WINT-0110',
        activeOnly: true,
        limit: 25,
        offset: 10,
      }

      const result = SessionQueryInputSchema.parse(input)

      expect(result.agentName).toBe('dev-execute-leader')
      expect(result.storyId).toBe('WINT-0110')
      expect(result.activeOnly).toBe(true)
      expect(result.limit).toBe(25)
      expect(result.offset).toBe(10)
    })
  })

  describe('SessionCleanupInputSchema', () => {
    it('should validate empty input (use defaults)', () => {
      const input = {}

      const result = SessionCleanupInputSchema.parse(input)

      expect(result.retentionDays).toBe(90)
      expect(result.dryRun).toBe(true)
    })

    it('should validate custom retentionDays', () => {
      const input = {
        retentionDays: 30,
      }

      const result = SessionCleanupInputSchema.parse(input)

      expect(result.retentionDays).toBe(30)
    })

    it('should validate dryRun=false (explicit opt-in)', () => {
      const input = {
        dryRun: false,
      }

      const result = SessionCleanupInputSchema.parse(input)

      expect(result.dryRun).toBe(false)
    })

    it('should reject negative retentionDays', () => {
      expect(() =>
        SessionCleanupInputSchema.parse({
          retentionDays: -10,
        }),
      ).toThrow()
    })

    it('should reject zero retentionDays', () => {
      expect(() =>
        SessionCleanupInputSchema.parse({
          retentionDays: 0,
        }),
      ).toThrow()
    })

    it('should validate different retention periods', () => {
      const retentionPeriods = [1, 7, 30, 90, 180, 365]

      for (const retentionDays of retentionPeriods) {
        const result = SessionCleanupInputSchema.parse({ retentionDays })
        expect(result.retentionDays).toBe(retentionDays)
      }
    })
  })
})
