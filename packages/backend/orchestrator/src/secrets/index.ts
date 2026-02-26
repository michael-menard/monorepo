/**
 * secrets/index.ts
 *
 * SecretsClient: Unified secrets engine for the orchestrator.
 * - In AWS (SECRETS_ENGINE=aws-secrets-manager): fetches from AWS Secrets Manager
 * - In local dev (SECRETS_ENGINE=env or unset): reads from environment variables
 *
 * Architecture Decision ARCH-001 (APIP-5004):
 * Prefetch pattern — call secretsClient.prefetch([...secretNames]) at pipeline
 * startup so that providers can call getSync() synchronously during loadConfig().
 *
 * Cross-story dependency (APIP-5006):
 * The server infrastructure entrypoint MUST call secretsClient.prefetch([
 *   'ANTHROPIC_API_KEY', 'OPENROUTER_API_KEY', 'MINIMAX_API_KEY', 'MINIMAX_GROUP_ID'
 * ]) before the model router initializes.
 *
 * @module secrets
 */

import { z } from 'zod'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'
import { logger } from '@repo/logger'

// ============================================================================
// Configuration Schema
// ============================================================================

/**
 * SecretsClient configuration schema.
 * Validates SECRETS_ENGINE and AWS_REGION at construction time (fail-fast).
 */
export const SecretsClientConfigSchema = z
  .object({
    /** Secrets engine to use. Default: 'env' */
    engine: z.enum(['env', 'aws-secrets-manager']).default('env'),

    /** AWS region (required when engine=aws-secrets-manager) */
    awsRegion: z.string().optional(),

    /** Cache TTL in milliseconds (default: 5 minutes) */
    cacheTtlMs: z.number().positive().default(300_000),
  })
  .refine(
    data => {
      if (data.engine === 'aws-secrets-manager' && !data.awsRegion) {
        return false
      }
      return true
    },
    {
      message: 'AWS_REGION is required when SECRETS_ENGINE=aws-secrets-manager',
      path: ['awsRegion'],
    },
  )

export type SecretsClientConfig = z.infer<typeof SecretsClientConfigSchema>

// ============================================================================
// Cache Entry Type
// ============================================================================

interface CacheEntry {
  value: string
  fetchedAt: number
}

// ============================================================================
// SecretsClient
// ============================================================================

/**
 * SecretsClient provides a unified interface for reading secrets.
 *
 * Usage modes:
 * - `env` (local dev): reads directly from process.env — no AWS credentials needed
 * - `aws-secrets-manager` (server): fetches from AWS Secrets Manager with in-memory cache
 *
 * Prefetch pattern (ARCH-001):
 *   await secretsClient.prefetch(['ANTHROPIC_API_KEY', 'OPENROUTER_API_KEY'])
 *   // Later, synchronously:
 *   const key = secretsClient.getSync('ANTHROPIC_API_KEY')
 */
export class SecretsClient {
  private readonly config: SecretsClientConfig

  /** In-memory TTL cache: secretName -> { value, fetchedAt } */
  private cache = new Map<string, CacheEntry>()

  /** In-flight deduplication map: secretName -> fetch promise */
  private inflight = new Map<string, Promise<string>>()

  constructor(config?: Partial<SecretsClientConfig>) {
    const raw = {
      engine: (process.env.SECRETS_ENGINE as 'env' | 'aws-secrets-manager' | undefined) ?? 'env',
      awsRegion: process.env.AWS_REGION,
      cacheTtlMs: process.env.SECRETS_CACHE_TTL_MS
        ? parseInt(process.env.SECRETS_CACHE_TTL_MS, 10)
        : 300_000,
      ...config,
    }

    this.config = SecretsClientConfigSchema.parse(raw)
  }

  /**
   * Asynchronously retrieves a secret value by name.
   *
   * In `env` mode: reads process.env[secretName]
   * In `aws-secrets-manager` mode: fetches from AWS Secrets Manager with TTL cache.
   *
   * Cache-miss emits a structured audit log (no secret value logged).
   * Concurrent requests for the same secret are deduplicated to a single SDK call.
   *
   * @param secretName - The environment variable name or Secrets Manager secret ID
   * @returns The secret value
   * @throws Error if the secret is not found or AWS fetch fails
   */
  async get(secretName: string): Promise<string> {
    if (this.config.engine === 'env') {
      return this._getFromEnv(secretName)
    }

    return this._getFromAws(secretName)
  }

  /**
   * Synchronously retrieves a secret from the pre-populated cache.
   * MUST call prefetch() at startup before using getSync().
   *
   * @param secretName - The secret name to retrieve
   * @returns The cached secret value
   * @throws Error if the secret is not in cache (prefetch not called)
   */
  getSync(secretName: string): string {
    if (this.config.engine === 'env') {
      const value = process.env[secretName]
      if (!value) {
        throw new Error(
          `Secret not found in environment: ${secretName}. ` +
            `Ensure ${secretName} is set in your .env file or environment.`,
        )
      }
      return value
    }

    const entry = this.cache.get(secretName)
    if (!entry) {
      throw new Error(
        `Secret '${secretName}' not in cache. ` +
          `Call secretsClient.prefetch(['${secretName}']) at pipeline startup before providers initialize.`,
      )
    }

    // Check TTL
    if (Date.now() - entry.fetchedAt > this.config.cacheTtlMs) {
      throw new Error(
        `Secret '${secretName}' cache entry has expired. ` +
          `Call secretsClient.prefetch(['${secretName}']) to refresh.`,
      )
    }

    return entry.value
  }

  /**
   * Pre-populates the cache for a list of secrets.
   * Call this at pipeline startup before any provider calls getSync().
   *
   * @param secretNames - Array of secret names to prefetch
   */
  async prefetch(secretNames: string[]): Promise<void> {
    await Promise.all(secretNames.map(name => this.get(name)))
  }

  /**
   * Clears the in-memory cache.
   * After flush(), call prefetch() again before getSync() is used.
   *
   * SIGHUP signal pattern: attach process.on('SIGHUP', () => secretsClient.flush())
   * to pick up rotated secrets without restarting the process.
   * Note: Provider configCache fields are static and will NOT auto-refresh.
   * A SIGHUP handler must also clear provider config caches if needed.
   */
  flush(): void {
    this.cache.clear()
    this.inflight.clear()
    logger.info('SecretsClient cache flushed', { engine: this.config.engine })
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private _getFromEnv(secretName: string): Promise<string> {
    const value = process.env[secretName]
    if (!value) {
      return Promise.reject(
        new Error(
          `Secret not found in environment: ${secretName}. ` +
            `Ensure ${secretName} is set in your .env file or environment.`,
        ),
      )
    }
    return Promise.resolve(value)
  }

  private async _getFromAws(secretName: string): Promise<string> {
    // 1. Check TTL cache
    const cached = this.cache.get(secretName)
    if (cached && Date.now() - cached.fetchedAt <= this.config.cacheTtlMs) {
      return cached.value
    }

    // 2. Deduplicate concurrent requests
    const existingInflight = this.inflight.get(secretName)
    if (existingInflight) {
      return existingInflight
    }

    // 3. Fetch from AWS Secrets Manager
    const fetchPromise = this._fetchFromAws(secretName)
    this.inflight.set(secretName, fetchPromise)

    try {
      const value = await fetchPromise
      return value
    } finally {
      this.inflight.delete(secretName)
    }
  }

  private async _fetchFromAws(secretName: string): Promise<string> {
    const start = Date.now()
    const client = new SecretsManagerClient({ region: this.config.awsRegion })

    try {
      const command = new GetSecretValueCommand({ SecretId: secretName })
      const response = await client.send(command)

      const value = response.SecretString
      if (!value) {
        throw new Error(`Secret '${secretName}' exists but has no SecretString value`)
      }

      const latencyMs = Date.now() - start

      // Structured audit log on cache-miss (no secret value logged)
      logger.info('SecretsClient cache miss — fetched from AWS Secrets Manager', {
        secretName,
        engine: 'aws-secrets-manager',
        latencyMs,
      })

      // Populate cache
      this.cache.set(secretName, { value, fetchedAt: Date.now() })

      return value
    } catch (err) {
      const latencyMs = Date.now() - start
      logger.warn('SecretsClient failed to fetch secret from AWS Secrets Manager', {
        secretName,
        engine: 'aws-secrets-manager',
        latencyMs,
        error: err instanceof Error ? err.message : String(err),
      })
      throw err
    }
  }
}

// ============================================================================
// Module-level singleton export
// ============================================================================

/**
 * Module-level singleton SecretsClient.
 * Import and use this in all providers:
 *
 *   import { secretsClient } from '../secrets/index.js'
 *   const apiKey = secretsClient.getSync('ANTHROPIC_API_KEY')
 */
export const secretsClient = new SecretsClient()
