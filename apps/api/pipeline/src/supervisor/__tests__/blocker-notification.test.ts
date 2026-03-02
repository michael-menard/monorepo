/**
 * Unit tests for BlockerNotificationModule
 *
 * APIP-2010 AC-9:
 * HP-1: PERMANENT failure → @repo/db insert called with blocker_type='technical', severity='high'
 * HP-2: WallClockTimeoutError with checkpointThreadId → description contains threadId
 * HP-4: Worker 'completed' fires → resolveBlocker() → resolved_at set via UPDATE
 * ED-1: Idempotency guard → second PERMANENT failure does not insert duplicate row
 * EC-2: Webhook 500 → logger.warn
 * EC-3: Webhook timeout → aborts at 2000ms
 * ED-2: No webhookUrl → fetch not called
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createBlockerNotificationModule,
  sendWebhookNotification,
  resetStoryUuidCache,
} from '../blocker-notification/index.js'
import { WallClockTimeoutError } from '../wall-clock-timeout.js'
import { PipelineSupervisorConfigSchema } from '../__types__/index.js'
import { logger } from '@repo/logger'

// ─────────────────────────────────────────────────────────────────────────────
// Mock @repo/logger
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('@repo/logger', async importOriginal => {
  const actual = await importOriginal<typeof import('@repo/logger')>()
  return {
    ...actual,
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      fatal: vi.fn(),
      trace: vi.fn(),
      child: vi.fn().mockReturnThis(),
    },
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Mock fetch globally
// ─────────────────────────────────────────────────────────────────────────────

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// ─────────────────────────────────────────────────────────────────────────────
// Helpers: Extract SQL text from drizzle sql`` template objects
// drizzle sql`` objects have queryChunks with {value: [string]} and param nodes
// ─────────────────────────────────────────────────────────────────────────────

function extractSqlText(query: unknown): string {
  if (!query || typeof query !== 'object') return String(query)
  const q = query as { queryChunks?: unknown[] }
  if (!q.queryChunks) return String(query)
  return q.queryChunks
    .map(chunk => {
      if (chunk && typeof chunk === 'object' && !Array.isArray(chunk)) {
        const c = chunk as { value?: string[] }
        if (c.value && Array.isArray(c.value)) return c.value[0] ?? ''
      }
      if (typeof chunk === 'string') return chunk
      return String(chunk)
    })
    .join('')
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const STORY_UUID = 'aaaaaaaa-0000-0000-0000-000000000001'
const STORY_ID = 'APIP-TEST-001'

/**
 * Create a mock NodePgDatabase that simulates wint.stories lookup.
 * The execute mock returns a uuid row for the given story_id.
 */
function createMockDb(
  options: {
    storyUuid?: string
    existingBlocker?: boolean
    rowCount?: number
  } = {},
) {
  const { storyUuid = STORY_UUID, existingBlocker = false, rowCount = 1 } = options

  const executeMock = vi.fn().mockImplementation((query: unknown) => {
    const sqlText = extractSqlText(query)

    // UUID resolution query
    if (sqlText.includes('wint.stories') && sqlText.includes('SELECT id')) {
      return Promise.resolve({
        rows: storyUuid ? [{ id: storyUuid }] : [],
        rowCount: storyUuid ? 1 : 0,
      })
    }

    // Idempotency check query
    if (sqlText.includes('wint.story_blockers') && sqlText.includes('SELECT id')) {
      return Promise.resolve({
        rows: existingBlocker ? [{ id: 'existing-blocker-uuid' }] : [],
        rowCount: existingBlocker ? 1 : 0,
      })
    }

    // INSERT query
    if (sqlText.includes('INSERT INTO wint.story_blockers')) {
      return Promise.resolve({ rows: [], rowCount: 1 })
    }

    // UPDATE query (resolve)
    if (sqlText.includes('UPDATE wint.story_blockers')) {
      return Promise.resolve({ rows: [], rowCount })
    }

    return Promise.resolve({ rows: [], rowCount: 0 })
  })

  return { execute: executeMock }
}

const defaultConfig = PipelineSupervisorConfigSchema.parse({
  queueName: 'test-queue',
})

const configWithWebhook = PipelineSupervisorConfigSchema.parse({
  queueName: 'test-queue',
  webhookUrl: 'https://example.com/webhook',
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('BlockerNotificationModule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStoryUuidCache()
    mockFetch.mockResolvedValue({ ok: true, status: 200 })
  })

  afterEach(() => {
    resetStoryUuidCache()
  })

  // ─── HP-1: PERMANENT failure → insert technical blocker ──────────────────

  describe('HP-1: PERMANENT failure → insert blocker_type=technical, severity=high', () => {
    it('calls db.execute INSERT with blocker_type=technical and severity=high', async () => {
      const db = createMockDb()
      const module = createBlockerNotificationModule(db as any, defaultConfig)

      const permanentError = new TypeError('Validation failed — permanent')
      await module.insertBlocker(STORY_ID, permanentError)

      const insertCall = db.execute.mock.calls.find(call =>
        extractSqlText(call[0]).includes('INSERT INTO wint.story_blockers'),
      )
      expect(insertCall).toBeDefined()
      const insertSql = extractSqlText(insertCall![0])
      expect(insertSql).toContain("'technical'")
      expect(insertSql).toContain("'high'")
    })

    it('logs blocker_inserted event with storyId, blockerType, severity', async () => {
      const db = createMockDb()
      const module = createBlockerNotificationModule(db as any, defaultConfig)

      await module.insertBlocker(STORY_ID, new TypeError('permanent error'))

      const logCall = vi.mocked(logger).info.mock.calls.find(call => call[0] === 'blocker_inserted')
      expect(logCall).toBeDefined()
      expect(logCall![1]).toMatchObject({
        event: 'blocker_inserted',
        storyId: STORY_ID,
        blockerType: 'technical',
        severity: 'high',
      })
    })

    it('skips insert if storyId not found in wint.stories', async () => {
      const db = createMockDb({ storyUuid: '' })
      const module = createBlockerNotificationModule(db as any, defaultConfig)

      await module.insertBlocker(STORY_ID, new TypeError('error'))

      const insertCall = db.execute.mock.calls.find(call =>
        extractSqlText(call[0]).includes('INSERT INTO wint.story_blockers'),
      )
      expect(insertCall).toBeUndefined()

      const warnCall = vi.mocked(logger).warn.mock.calls.find(
        call => call[0] === 'blocker_insert_skipped_no_uuid',
      )
      expect(warnCall).toBeDefined()
    })
  })

  // ─── HP-2: WallClockTimeoutError → description contains threadId ─────────

  describe('HP-2: WallClockTimeoutError → blocker_description contains threadId', () => {
    it('includes checkpointThreadId in blocker_description', async () => {
      const db = createMockDb()
      const module = createBlockerNotificationModule(db as any, defaultConfig)

      const timeoutError = new WallClockTimeoutError(600_000, 'elaboration')
      const jobData = {
        storyId: STORY_ID,
        stage: 'elaboration',
        attemptNumber: 2,
      }

      await module.insertBlocker(STORY_ID, timeoutError, jobData)

      // Verify the description captured in the INSERT SQL contains the threadId
      const insertCall = db.execute.mock.calls.find(call =>
        extractSqlText(call[0]).includes('INSERT INTO wint.story_blockers'),
      )
      expect(insertCall).toBeDefined()

      // The description should be in the logger call (cleaner than parsing SQL)
      const logCall = vi.mocked(logger).info.mock.calls.find(call => call[0] === 'blocker_inserted')
      expect(logCall).toBeDefined()
      expect(logCall![1].blockerDescription).toContain(`${STORY_ID}:elaboration:2`)
    })

    it('derives threadId from jobData for WallClockTimeoutError', async () => {
      const db = createMockDb()
      const module = createBlockerNotificationModule(db as any, defaultConfig)

      const timeoutError = new WallClockTimeoutError(600_000, 'story-creation')
      const jobData = { storyId: 'APIP-042', stage: 'story-creation', attemptNumber: 3 }

      await module.insertBlocker('APIP-042', timeoutError, jobData)

      const logCall = vi.mocked(logger).info.mock.calls.find(call => call[0] === 'blocker_inserted')
      expect(logCall).toBeDefined()
      expect(logCall![1].blockerDescription).toContain('APIP-042:story-creation:3')
    })
  })

  // ─── HP-4: resolveBlocker → resolved_at set via UPDATE ───────────────────

  describe('HP-4: resolveBlocker() → resolved_at set via UPDATE', () => {
    it('calls db.execute UPDATE with resolved_at = NOW()', async () => {
      const db = createMockDb({ rowCount: 1 })
      const module = createBlockerNotificationModule(db as any, defaultConfig)

      await module.resolveBlocker(STORY_ID)

      const updateCall = db.execute.mock.calls.find(call =>
        extractSqlText(call[0]).includes('UPDATE wint.story_blockers'),
      )
      expect(updateCall).toBeDefined()
      expect(extractSqlText(updateCall![0])).toContain('resolved_at = NOW()')
    })

    it('logs blocker_resolved event when rows updated', async () => {
      const db = createMockDb({ rowCount: 1 })
      const module = createBlockerNotificationModule(db as any, defaultConfig)

      await module.resolveBlocker(STORY_ID)

      const logCall = vi.mocked(logger).info.mock.calls.find(
        call => call[0] === 'blocker_resolved',
      )
      expect(logCall).toBeDefined()
      expect(logCall![1]).toMatchObject({
        event: 'blocker_resolved',
        storyId: STORY_ID,
      })
    })

    it('does not log blocker_resolved when no rows updated', async () => {
      const db = createMockDb({ rowCount: 0 })
      const module = createBlockerNotificationModule(db as any, defaultConfig)

      await module.resolveBlocker(STORY_ID)

      const logCall = vi.mocked(logger).info.mock.calls.find(
        call => call[0] === 'blocker_resolved',
      )
      expect(logCall).toBeUndefined()
    })
  })

  // ─── ED-1: Idempotency guard ──────────────────────────────────────────────

  describe('ED-1: Idempotency guard — second PERMANENT failure does not insert duplicate row', () => {
    it('skips INSERT if unresolved technical blocker already exists', async () => {
      const db = createMockDb({ existingBlocker: true })
      const module = createBlockerNotificationModule(db as any, defaultConfig)

      await module.insertBlocker(STORY_ID, new TypeError('already blocked'))

      const insertCalls = db.execute.mock.calls.filter(call =>
        extractSqlText(call[0]).includes('INSERT INTO wint.story_blockers'),
      )
      expect(insertCalls).toHaveLength(0)

      const logCall = vi.mocked(logger).info.mock.calls.find(
        call => call[0] === 'blocker_insert_skipped_idempotent',
      )
      expect(logCall).toBeDefined()
    })
  })

  // ─── EC-2: Webhook 500 → logger.warn ─────────────────────────────────────

  describe('EC-2: Webhook HTTP 500 → logger.warn, does not throw', () => {
    it('warns on webhook 500 response', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' })

      const db = createMockDb()
      const module = createBlockerNotificationModule(db as any, configWithWebhook)

      // insertBlocker triggers webhook; fire-and-forget so we wait a tick
      await module.insertBlocker(STORY_ID, new TypeError('error'))

      // Give the fire-and-forget webhook a chance to complete
      await new Promise(resolve => setTimeout(resolve, 20))

      const warnCall = vi.mocked(logger).warn.mock.calls.find(
        call => call[0] === 'webhook_notification_failed',
      )
      expect(warnCall).toBeDefined()
      expect(warnCall![1]).toMatchObject({
        event: 'webhook_notification_failed',
        storyId: STORY_ID,
      })
    })
  })

  // ─── EC-3: Webhook timeout → aborts at 2000ms ────────────────────────────

  describe('EC-3: Webhook timeout → aborts at 2000ms', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('aborts webhook fetch after 2000ms timeout', async () => {
      // Mock fetch to hang until AbortSignal fires
      mockFetch.mockImplementation((_url: string, options: RequestInit) => {
        return new Promise((_resolve, reject) => {
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              reject(new DOMException('The operation was aborted', 'AbortError'))
            })
          }
        })
      })

      const webhookPromise = sendWebhookNotification('https://example.com/slow', {
        event: 'test',
      })

      vi.advanceTimersByTime(2001)

      await expect(webhookPromise).rejects.toThrow()
    })
  })

  // ─── ED-2: No webhookUrl → fetch not called ───────────────────────────────

  describe('ED-2: No webhookUrl → fetch not called', () => {
    it('does not call fetch when webhookUrl is not configured', async () => {
      const db = createMockDb()
      const module = createBlockerNotificationModule(db as any, defaultConfig)

      await module.insertBlocker(STORY_ID, new TypeError('error'))

      // Allow any micro-tasks to settle
      await new Promise(resolve => setTimeout(resolve, 20))

      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  // ─── AC-6: Structured log fields ─────────────────────────────────────────

  describe('AC-6: Structured logger events include storyId, blockerType, severity', () => {
    it('insertBlocker logs with all required fields', async () => {
      const db = createMockDb()
      const module = createBlockerNotificationModule(db as any, defaultConfig)

      await module.insertBlocker(STORY_ID, new TypeError('err'))

      const logCall = vi.mocked(logger).info.mock.calls.find(call => call[0] === 'blocker_inserted')
      expect(logCall).toBeDefined()
      expect(logCall![1]).toHaveProperty('storyId', STORY_ID)
      expect(logCall![1]).toHaveProperty('blockerType', 'technical')
      expect(logCall![1]).toHaveProperty('severity', 'high')
      expect(logCall![1]).toHaveProperty('blockerDescription')
    })

    it('resolveBlocker logs with storyId and resolvedAt', async () => {
      const db = createMockDb({ rowCount: 1 })
      const module = createBlockerNotificationModule(db as any, defaultConfig)

      await module.resolveBlocker(STORY_ID)

      const logCall = vi.mocked(logger).info.mock.calls.find(call => call[0] === 'blocker_resolved')
      expect(logCall).toBeDefined()
      expect(logCall![1]).toHaveProperty('storyId', STORY_ID)
      expect(logCall![1]).toHaveProperty('resolvedAt')
    })
  })

  // ─── insertDependencyBlocker ───────────────────────────────────────────────

  describe('insertDependencyBlocker: circuit OPEN → dependency blocker', () => {
    it('inserts dependency blocker type', async () => {
      const db = createMockDb()
      const module = createBlockerNotificationModule(db as any, defaultConfig)

      await module.insertDependencyBlocker(STORY_ID, 'elaboration')

      const insertCall = db.execute.mock.calls.find(call =>
        extractSqlText(call[0]).includes('INSERT INTO wint.story_blockers'),
      )
      expect(insertCall).toBeDefined()
      expect(extractSqlText(insertCall![0])).toContain("'dependency'")
    })

    it('logs dependency_blocker_inserted event', async () => {
      const db = createMockDb()
      const module = createBlockerNotificationModule(db as any, defaultConfig)

      await module.insertDependencyBlocker(STORY_ID, 'elaboration')

      const logCall = vi.mocked(logger).info.mock.calls.find(
        call => call[0] === 'dependency_blocker_inserted',
      )
      expect(logCall).toBeDefined()
      expect(logCall![1]).toMatchObject({
        event: 'dependency_blocker_inserted',
        storyId: STORY_ID,
        blockerType: 'dependency',
      })
    })

    it('idempotency guard prevents duplicate dependency blocker', async () => {
      const db = createMockDb({ existingBlocker: true })
      const module = createBlockerNotificationModule(db as any, defaultConfig)

      await module.insertDependencyBlocker(STORY_ID, 'elaboration')

      const insertCalls = db.execute.mock.calls.filter(call =>
        extractSqlText(call[0]).includes('INSERT INTO wint.story_blockers'),
      )
      expect(insertCalls).toHaveLength(0)
    })
  })
})
