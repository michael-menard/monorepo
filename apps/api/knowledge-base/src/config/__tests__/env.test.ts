/**
 * Tests for Environment Variable Validation
 *
 * @see env.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { validateEnv, safeValidateEnv, EnvSchema } from '../env.js'

describe('EnvSchema', () => {
  describe('DATABASE_URL validation', () => {
    it('accepts valid postgresql:// URL', () => {
      const result = EnvSchema.safeParse({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        OPENAI_API_KEY: 'sk-test-key',
      })

      expect(result.success).toBe(true)
    })

    it('accepts valid postgres:// URL (alternate prefix)', () => {
      const result = EnvSchema.safeParse({
        DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
        OPENAI_API_KEY: 'sk-test-key',
      })

      expect(result.success).toBe(true)
    })

    it('rejects empty DATABASE_URL', () => {
      const result = EnvSchema.safeParse({
        DATABASE_URL: '',
        OPENAI_API_KEY: 'sk-test-key',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('DATABASE_URL is required')
      }
    })

    it('rejects invalid DATABASE_URL format', () => {
      const result = EnvSchema.safeParse({
        DATABASE_URL: 'mysql://user:pass@localhost:3306/db',
        OPENAI_API_KEY: 'sk-test-key',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('PostgreSQL connection string')
      }
    })
  })

  describe('OPENAI_API_KEY validation', () => {
    it('accepts valid sk- prefixed key', () => {
      const result = EnvSchema.safeParse({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        OPENAI_API_KEY: 'sk-proj-abc123',
      })

      expect(result.success).toBe(true)
    })

    it('rejects empty OPENAI_API_KEY', () => {
      const result = EnvSchema.safeParse({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        OPENAI_API_KEY: '',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('OPENAI_API_KEY is required')
      }
    })

    it('rejects invalid OPENAI_API_KEY format', () => {
      const result = EnvSchema.safeParse({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        OPENAI_API_KEY: 'invalid-key',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('starts with sk-')
      }
    })
  })

  describe('optional variables with defaults', () => {
    it('applies default EMBEDDING_MODEL', () => {
      const result = EnvSchema.safeParse({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        OPENAI_API_KEY: 'sk-test-key',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.EMBEDDING_MODEL).toBe('text-embedding-3-small')
      }
    })

    it('applies default EMBEDDING_BATCH_SIZE', () => {
      const result = EnvSchema.safeParse({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        OPENAI_API_KEY: 'sk-test-key',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.EMBEDDING_BATCH_SIZE).toBe(100)
      }
    })

    it('applies default LOG_LEVEL', () => {
      const result = EnvSchema.safeParse({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        OPENAI_API_KEY: 'sk-test-key',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.LOG_LEVEL).toBe('info')
      }
    })

    it('allows overriding optional values', () => {
      const result = EnvSchema.safeParse({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        OPENAI_API_KEY: 'sk-test-key',
        EMBEDDING_MODEL: 'text-embedding-3-large',
        EMBEDDING_BATCH_SIZE: '50',
        LOG_LEVEL: 'debug',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.EMBEDDING_MODEL).toBe('text-embedding-3-large')
        expect(result.data.EMBEDDING_BATCH_SIZE).toBe(50)
        expect(result.data.LOG_LEVEL).toBe('debug')
      }
    })

    it('coerces EMBEDDING_BATCH_SIZE from string to number', () => {
      const result = EnvSchema.safeParse({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        OPENAI_API_KEY: 'sk-test-key',
        EMBEDDING_BATCH_SIZE: '200',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.EMBEDDING_BATCH_SIZE).toBe(200)
        expect(typeof result.data.EMBEDDING_BATCH_SIZE).toBe('number')
      }
    })

    it('rejects invalid LOG_LEVEL enum value', () => {
      const result = EnvSchema.safeParse({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        OPENAI_API_KEY: 'sk-test-key',
        LOG_LEVEL: 'verbose',
      })

      expect(result.success).toBe(false)
    })

    it('rejects non-positive EMBEDDING_BATCH_SIZE', () => {
      const result = EnvSchema.safeParse({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        OPENAI_API_KEY: 'sk-test-key',
        EMBEDDING_BATCH_SIZE: '0',
      })

      expect(result.success).toBe(false)
    })
  })
})

describe('validateEnv', () => {
  // Note: These tests pass explicit env objects to validateEnv()
  // so they don't depend on process.env or the test setup file

  it('returns validated config for valid environment', () => {
    const mockEnv = {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/testdb',
      OPENAI_API_KEY: 'sk-test-key-12345',
    } as NodeJS.ProcessEnv

    const result = validateEnv(mockEnv)

    expect(result.DATABASE_URL).toBe('postgresql://test:test@localhost:5432/testdb')
    expect(result.OPENAI_API_KEY).toBe('sk-test-key-12345')
    expect(result.EMBEDDING_MODEL).toBe('text-embedding-3-small')
    expect(result.EMBEDDING_BATCH_SIZE).toBe(100)
    expect(result.LOG_LEVEL).toBe('info')
  })

  it('throws with clear error for missing required vars', () => {
    // Pass completely empty env to test missing vars
    const mockEnv = {
      DATABASE_URL: undefined,
      OPENAI_API_KEY: undefined,
      // Also clear KB_DB_* to prevent fallback
      KB_DB_HOST: undefined,
      KB_DB_PORT: undefined,
      KB_DB_NAME: undefined,
      KB_DB_USER: undefined,
      KB_DB_PASSWORD: undefined,
    } as unknown as NodeJS.ProcessEnv

    expect(() => validateEnv(mockEnv)).toThrow('ERROR: Invalid environment configuration')
    expect(() => validateEnv(mockEnv)).toThrow('DATABASE_URL')
    expect(() => validateEnv(mockEnv)).toThrow('OPENAI_API_KEY')
  })

  it('error message includes link to documentation', () => {
    const mockEnv = {
      DATABASE_URL: undefined,
      OPENAI_API_KEY: undefined,
    } as unknown as NodeJS.ProcessEnv

    expect(() => validateEnv(mockEnv)).toThrow('apps/api/knowledge-base/README.md')
  })

  it('lists ALL missing variables, not just first', () => {
    const mockEnv = {
      DATABASE_URL: undefined,
      OPENAI_API_KEY: undefined,
    } as unknown as NodeJS.ProcessEnv

    try {
      validateEnv(mockEnv)
      expect.fail('Should have thrown')
    } catch (err) {
      const message = (err as Error).message
      expect(message).toContain('DATABASE_URL')
      expect(message).toContain('OPENAI_API_KEY')
    }
  })

  it('builds DATABASE_URL from KB_DB_* variables', () => {
    // Explicitly clear DATABASE_URL to test KB_DB_* fallback
    const mockEnv = {
      DATABASE_URL: undefined,
      KB_DB_HOST: 'localhost',
      KB_DB_PORT: '5433',
      KB_DB_NAME: 'knowledgebase',
      KB_DB_USER: 'kbuser',
      KB_DB_PASSWORD: 'testpassword',
      OPENAI_API_KEY: 'sk-test-key',
    } as unknown as NodeJS.ProcessEnv

    const result = validateEnv(mockEnv)

    expect(result.DATABASE_URL).toBe('postgresql://kbuser:testpassword@localhost:5433/knowledgebase')
  })

  it('DATABASE_URL takes precedence over KB_DB_* variables', () => {
    const mockEnv = {
      DATABASE_URL: 'postgresql://override:override@other:5432/otherdb',
      KB_DB_HOST: 'localhost',
      KB_DB_PORT: '5433',
      KB_DB_NAME: 'knowledgebase',
      KB_DB_USER: 'kbuser',
      KB_DB_PASSWORD: 'testpassword',
      OPENAI_API_KEY: 'sk-test-key',
    } as NodeJS.ProcessEnv

    const result = validateEnv(mockEnv)

    expect(result.DATABASE_URL).toBe('postgresql://override:override@other:5432/otherdb')
  })
})

describe('safeValidateEnv', () => {
  it('returns success with data for valid environment', () => {
    const mockEnv = {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/testdb',
      OPENAI_API_KEY: 'sk-test-key',
    } as NodeJS.ProcessEnv

    const result = safeValidateEnv(mockEnv)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.DATABASE_URL).toBe('postgresql://test:test@localhost:5432/testdb')
    }
  })

  it('returns failure with error message for invalid environment', () => {
    const mockEnv = {
      DATABASE_URL: undefined,
      OPENAI_API_KEY: undefined,
    } as unknown as NodeJS.ProcessEnv

    const result = safeValidateEnv(mockEnv)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('DATABASE_URL')
      expect(result.error).toContain('OPENAI_API_KEY')
    }
  })
})
