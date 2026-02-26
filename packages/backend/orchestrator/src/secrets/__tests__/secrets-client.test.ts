/**
 * secrets-client.test.ts
 *
 * Unit tests for SecretsClient covering:
 * - HP-1: env engine returns from process.env
 * - HP-2: aws engine fetches from AWS Secrets Manager
 * - HP-3: cache hit returns cached value without SDK call
 * - HP-4: prefetch populates cache
 * - HP-5: getSync returns cached value
 * - HP-6: audit log on cache-miss (no secret value logged)
 * - HP-7: flush() clears cache
 * - HP-8: configurable TTL from SECRETS_CACHE_TTL_MS
 * - EC-1: missing env var throws in env mode
 * - EC-2: missing AWS_REGION throws in constructor for aws engine
 * - EC-3: AWS SDK error propagates
 * - EC-4: getSync without prefetch throws
 * - ED-1: TTL expiry with fake timers
 * - ED-2: concurrent get() calls deduplicate to single SDK call
 * - ED-3: SECRETS_CACHE_TTL_MS configures TTL
 * - ED-4: module-level singleton exported, all methods present
 *
 * @module secrets/__tests__/secrets-client
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { SecretsClient, SecretsClientConfigSchema, secretsClient } from '../index.js'

// ============================================================================
// AWS SDK mock setup
// Vitest vi.mock hoists to top-level — use a module-scoped send spy
// ============================================================================

const mockSend = vi.fn()

vi.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: vi.fn().mockImplementation(() => ({ send: mockSend })),
  GetSecretValueCommand: vi.fn().mockImplementation(args => ({ SecretId: args.SecretId })),
}))

// ============================================================================
// HP-1: env engine — reads from process.env
// ============================================================================

describe('SecretsClient — env engine (HP-1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.SECRETS_ENGINE
    delete process.env.AWS_REGION
    delete process.env.SECRETS_CACHE_TTL_MS
  })

  test('HP-1: get() returns value from process.env in env mode', async () => {
    process.env.HP1_SECRET = 'hp1-test-value'
    const client = new SecretsClient({ engine: 'env' })
    const value = await client.get('HP1_SECRET')
    expect(value).toBe('hp1-test-value')
    delete process.env.HP1_SECRET
  })

  test('HP-1: get() in env mode does not call AWS SDK', async () => {
    process.env.HP1_NO_AWS = 'value'
    const client = new SecretsClient({ engine: 'env' })
    await client.get('HP1_NO_AWS')
    expect(mockSend).not.toHaveBeenCalled()
    delete process.env.HP1_NO_AWS
  })

  test('HP-5: getSync() in env mode reads from process.env', () => {
    process.env.HP1_SYNC_SECRET = 'sync-value'
    const client = new SecretsClient({ engine: 'env' })
    expect(client.getSync('HP1_SYNC_SECRET')).toBe('sync-value')
    delete process.env.HP1_SYNC_SECRET
  })
})

// ============================================================================
// HP-2, HP-3: AWS fetch and cache hit
// ============================================================================

describe('SecretsClient — AWS fetch and caching (HP-2, HP-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('HP-2: get() fetches from AWS Secrets Manager when cache is empty', async () => {
    mockSend.mockResolvedValueOnce({ SecretString: 'aws-secret-value' })

    const client = new SecretsClient({ engine: 'aws-secrets-manager', awsRegion: 'us-east-1' })
    const value = await client.get('MY_AWS_SECRET')

    expect(value).toBe('aws-secret-value')
    expect(mockSend).toHaveBeenCalledOnce()
  })

  test('HP-3: get() returns cached value on second call (no extra SDK call)', async () => {
    mockSend.mockResolvedValueOnce({ SecretString: 'cached-value' })

    const client = new SecretsClient({ engine: 'aws-secrets-manager', awsRegion: 'us-east-1' })

    const first = await client.get('CACHE_SECRET')
    const second = await client.get('CACHE_SECRET')

    expect(first).toBe('cached-value')
    expect(second).toBe('cached-value')
    expect(mockSend).toHaveBeenCalledOnce() // Only fetched once
  })
})

// ============================================================================
// HP-4, HP-5: prefetch and getSync
// ============================================================================

describe('SecretsClient — prefetch and getSync (HP-4, HP-5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('HP-4: prefetch() populates cache for all provided secrets', async () => {
    mockSend
      .mockResolvedValueOnce({ SecretString: 'val-a' })
      .mockResolvedValueOnce({ SecretString: 'val-b' })

    const client = new SecretsClient({ engine: 'aws-secrets-manager', awsRegion: 'us-east-1' })
    await client.prefetch(['SECRET_A', 'SECRET_B'])

    // getSync should now work without error
    expect(client.getSync('SECRET_A')).toBe('val-a')
    expect(client.getSync('SECRET_B')).toBe('val-b')
    expect(mockSend).toHaveBeenCalledTimes(2)
  })

  test('HP-5: getSync() returns cached value after prefetch', async () => {
    mockSend.mockResolvedValueOnce({ SecretString: 'prefetched-val' })

    const client = new SecretsClient({ engine: 'aws-secrets-manager', awsRegion: 'us-east-1' })
    await client.prefetch(['SYNC_SECRET'])

    const value = client.getSync('SYNC_SECRET')
    expect(value).toBe('prefetched-val')
  })
})

// ============================================================================
// HP-6: audit log on cache-miss
// ============================================================================

describe('SecretsClient — audit log (HP-6)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('HP-6: get() logs audit event on cache-miss without secret value', async () => {
    const { logger } = await import('@repo/logger')
    const logSpy = vi.spyOn(logger, 'info')

    mockSend.mockResolvedValueOnce({ SecretString: 'do-not-log-me' })

    const client = new SecretsClient({ engine: 'aws-secrets-manager', awsRegion: 'us-east-1' })
    await client.get('AUDIT_SECRET')

    // Find the cache-miss audit log
    const auditCall = logSpy.mock.calls.find(
      ([msg]) => typeof msg === 'string' && msg.includes('cache miss'),
    )
    expect(auditCall).toBeDefined()

    if (auditCall) {
      const [, meta] = auditCall
      expect(meta).toHaveProperty('secretName', 'AUDIT_SECRET')
      expect(meta).toHaveProperty('engine', 'aws-secrets-manager')
      expect(meta).toHaveProperty('latencyMs')
      // Must NOT contain the secret value
      const metaStr = JSON.stringify(meta)
      expect(metaStr).not.toContain('do-not-log-me')
    }

    logSpy.mockRestore()
  })
})

// ============================================================================
// HP-7: flush
// ============================================================================

describe('SecretsClient — flush (HP-7)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('HP-7: flush() clears cache so next get() re-fetches', async () => {
    mockSend
      .mockResolvedValueOnce({ SecretString: 'original-val' })
      .mockResolvedValueOnce({ SecretString: 'refreshed-val' })

    const client = new SecretsClient({ engine: 'aws-secrets-manager', awsRegion: 'us-east-1' })

    const first = await client.get('FLUSH_SECRET')
    expect(first).toBe('original-val')

    client.flush()

    const second = await client.get('FLUSH_SECRET')
    expect(second).toBe('refreshed-val')
    expect(mockSend).toHaveBeenCalledTimes(2)
  })
})

// ============================================================================
// HP-8: default TTL
// ============================================================================

describe('SecretsClient — TTL configuration (HP-8)', () => {
  afterEach(() => {
    delete process.env.SECRETS_CACHE_TTL_MS
  })

  test('HP-8: default cacheTtlMs is 300000ms', () => {
    const client = new SecretsClient({ engine: 'aws-secrets-manager', awsRegion: 'us-east-1' })
    const config = (client as any).config
    expect(config.cacheTtlMs).toBe(300_000)
  })
})

// ============================================================================
// EC: error conditions
// ============================================================================

describe('SecretsClient — error conditions (EC)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.AWS_REGION
  })

  test('EC-1: get() in env mode throws when env var not set', async () => {
    delete process.env.EC1_NOT_SET
    const client = new SecretsClient({ engine: 'env' })
    await expect(client.get('EC1_NOT_SET')).rejects.toThrow(/Secret not found in environment/)
  })

  test('EC-1: getSync() in env mode throws when env var not set', () => {
    delete process.env.EC1_NOT_SET_SYNC
    const client = new SecretsClient({ engine: 'env' })
    expect(() => client.getSync('EC1_NOT_SET_SYNC')).toThrow(/Secret not found in environment/)
  })

  test('EC-2: constructor throws when engine=aws-secrets-manager without AWS_REGION', () => {
    expect(() => {
      new SecretsClient({ engine: 'aws-secrets-manager' })
    }).toThrow(/AWS_REGION is required when SECRETS_ENGINE=aws-secrets-manager/)
  })

  test('EC-3: AWS SDK error propagates from get()', async () => {
    mockSend.mockRejectedValueOnce(new Error('AccessDeniedException: secrets not accessible'))

    const client = new SecretsClient({ engine: 'aws-secrets-manager', awsRegion: 'us-east-1' })
    await expect(client.get('DENIED_SECRET')).rejects.toThrow(/AccessDeniedException/)
  })

  test('EC-4: getSync() throws when called before prefetch in aws mode', () => {
    const client = new SecretsClient({ engine: 'aws-secrets-manager', awsRegion: 'us-east-1' })
    expect(() => client.getSync('UNPREFETCHED_SECRET')).toThrow(/not in cache/)
  })
})

// ============================================================================
// ED: edge cases
// ============================================================================

describe('SecretsClient — edge cases (ED)', () => {
  afterEach(() => {
    vi.useRealTimers()
    delete process.env.SECRETS_CACHE_TTL_MS
  })

  test('ED-1: TTL expiry causes re-fetch after cache expires', async () => {
    vi.useFakeTimers()
    vi.clearAllMocks()

    mockSend
      .mockResolvedValueOnce({ SecretString: 'first-val' })
      .mockResolvedValueOnce({ SecretString: 'second-val' })

    const client = new SecretsClient({
      engine: 'aws-secrets-manager',
      awsRegion: 'us-east-1',
      cacheTtlMs: 1000, // 1 second TTL
    })

    const first = await client.get('TTL_SECRET')
    expect(first).toBe('first-val')

    // Advance time past TTL
    vi.advanceTimersByTime(2000)

    const second = await client.get('TTL_SECRET')
    expect(second).toBe('second-val')
    expect(mockSend).toHaveBeenCalledTimes(2)

    vi.useRealTimers()
  })

  test('ED-1: getSync() throws when TTL expired', async () => {
    vi.useFakeTimers()
    vi.clearAllMocks()

    mockSend.mockResolvedValueOnce({ SecretString: 'expiring-val' })

    const client = new SecretsClient({
      engine: 'aws-secrets-manager',
      awsRegion: 'us-east-1',
      cacheTtlMs: 1000, // 1 second TTL
    })

    await client.prefetch(['EXPIRING_SECRET'])
    expect(client.getSync('EXPIRING_SECRET')).toBe('expiring-val')

    // Advance time past TTL
    vi.advanceTimersByTime(2000)

    expect(() => client.getSync('EXPIRING_SECRET')).toThrow(/cache entry has expired/)

    vi.useRealTimers()
  })

  test('ED-2: concurrent get() calls deduplicate to single SDK call', async () => {
    vi.clearAllMocks()

    // Use a delayed resolution to ensure concurrent calls happen before resolution
    let resolveSecret: (val: { SecretString: string }) => void
    const promise = new Promise<{ SecretString: string }>(resolve => {
      resolveSecret = resolve
    })
    mockSend.mockReturnValueOnce(promise)

    const client = new SecretsClient({ engine: 'aws-secrets-manager', awsRegion: 'us-east-1' })

    // Start 5 concurrent get() calls
    const allPromises = [
      client.get('DEDUP_SECRET'),
      client.get('DEDUP_SECRET'),
      client.get('DEDUP_SECRET'),
      client.get('DEDUP_SECRET'),
      client.get('DEDUP_SECRET'),
    ]

    // Resolve the AWS call
    resolveSecret!({ SecretString: 'dedup-val' })

    const results = await Promise.all(allPromises)

    expect(results).toEqual(['dedup-val', 'dedup-val', 'dedup-val', 'dedup-val', 'dedup-val'])
    expect(mockSend).toHaveBeenCalledOnce() // Only one AWS SDK call despite 5 concurrent requests
  })

  test('ED-3: SECRETS_CACHE_TTL_MS env var configures TTL', () => {
    process.env.SECRETS_CACHE_TTL_MS = '60000'
    // Use default constructor path (reads from env)
    const client = new SecretsClient({ engine: 'aws-secrets-manager', awsRegion: 'us-east-1' })
    const config = (client as any).config
    expect(config.cacheTtlMs).toBe(60000)
  })

  test('ED-3: SecretsClientConfigSchema validates cacheTtlMs correctly', () => {
    const result = SecretsClientConfigSchema.safeParse({
      engine: 'env',
      cacheTtlMs: 60000,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.cacheTtlMs).toBe(60000)
    }
  })

  test('ED-4: module-level secretsClient singleton is exported', () => {
    expect(secretsClient).toBeInstanceOf(SecretsClient)
  })

  test('ED-4: SecretsClient exports all required methods', () => {
    const client = new SecretsClient({ engine: 'env' })
    expect(typeof client.get).toBe('function')
    expect(typeof client.getSync).toBe('function')
    expect(typeof client.prefetch).toBe('function')
    expect(typeof client.flush).toBe('function')
  })
})

// ============================================================================
// SecretsClientConfigSchema export test (AC-10)
// ============================================================================

describe('SecretsClientConfigSchema (AC-10)', () => {
  test('SecretsClientConfigSchema is exported and validates env mode', () => {
    const result = SecretsClientConfigSchema.safeParse({ engine: 'env' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.engine).toBe('env')
      expect(result.data.cacheTtlMs).toBe(300_000)
    }
  })

  test('SecretsClientConfigSchema rejects aws engine without awsRegion', () => {
    const result = SecretsClientConfigSchema.safeParse({ engine: 'aws-secrets-manager' })
    expect(result.success).toBe(false)
  })

  test('SecretsClientConfigSchema accepts aws engine with awsRegion', () => {
    const result = SecretsClientConfigSchema.safeParse({
      engine: 'aws-secrets-manager',
      awsRegion: 'us-east-1',
    })
    expect(result.success).toBe(true)
  })
})
