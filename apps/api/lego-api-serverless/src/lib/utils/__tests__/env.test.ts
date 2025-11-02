/**
 * Unit Tests for Environment Validation
 *
 * Tests the env.ts module which validates environment variables using Zod.
 * Focus: Pure functions, no side effects, critical for application startup.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Store original process.env
const originalEnv = { ...process.env };

describe('Environment Validation', () => {
  beforeEach(() => {
    // Clear and reset environment before each test with minimal valid env
    process.env = {
      NODE_ENV: 'development',
      STAGE: 'dev',
      AWS_REGION: 'us-east-1',
      LOG_LEVEL: 'info',
    };

    // Reset module cache to clear memoization
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('validateEnv() - Happy Path Tests', () => {
    it('should return typed Env object with all required fields', async () => {
      // Given: process.env contains all required environment variables
      process.env.NODE_ENV = 'production';
      process.env.STAGE = 'production';
      process.env.AWS_REGION = 'us-west-2';
      process.env.LOG_LEVEL = 'error';

      // When: validateEnv() is called
      const { validateEnv } = await import('../env');
      const env = validateEnv();

      // Then: Returns typed Env object with all values
      expect(env.NODE_ENV).toBe('production');
      expect(env.STAGE).toBe('production');
      expect(env.AWS_REGION).toBe('us-west-2');
      expect(env.LOG_LEVEL).toBe('error');
    });

    it('should apply default values for missing optional fields', async () => {
      // Given: process.env missing optional fields (NODE_ENV, AWS_REGION, LOG_LEVEL)
      process.env = {};

      // When: validateEnv() is called
      const { validateEnv } = await import('../env');
      const env = validateEnv();

      // Then: Returns Env object with default values applied
      expect(env.NODE_ENV).toBe('development');
      expect(env.STAGE).toBe('dev');
      expect(env.AWS_REGION).toBe('us-east-1');
      expect(env.LOG_LEVEL).toBe('info');
    });

    it('should include optional AWS fields when provided', async () => {
      // Given: All AWS optional fields provided
      process.env.NODE_ENV = 'development';
      process.env.STAGE = 'dev';
      process.env.AWS_ACCOUNT_ID = '123456789012';
      process.env.POSTGRES_HOST = 'db.example.com';
      process.env.POSTGRES_PORT = '5432';
      process.env.POSTGRES_DATABASE = 'lego_db';
      process.env.POSTGRES_USERNAME = 'dbuser';
      process.env.POSTGRES_PASSWORD = 'dbpass';
      process.env.REDIS_HOST = 'redis.example.com';
      process.env.REDIS_PORT = '6379';
      process.env.OPENSEARCH_ENDPOINT = 'https://opensearch.example.com';
      process.env.S3_BUCKET = 'lego-moc-files';
      process.env.COGNITO_USER_POOL_ID = 'us-east-1_ABC123';
      process.env.COGNITO_CLIENT_ID = 'abc123def456';

      // When: validateEnv() is called
      const { validateEnv } = await import('../env');
      const env = validateEnv();

      // Then: Returns Env object with all AWS fields populated
      expect(env.AWS_ACCOUNT_ID).toBe('123456789012');
      expect(env.POSTGRES_HOST).toBe('db.example.com');
      expect(env.POSTGRES_PORT).toBe('5432');
      expect(env.POSTGRES_DATABASE).toBe('lego_db');
      expect(env.POSTGRES_USERNAME).toBe('dbuser');
      expect(env.POSTGRES_PASSWORD).toBe('dbpass');
      expect(env.REDIS_HOST).toBe('redis.example.com');
      expect(env.REDIS_PORT).toBe('6379');
      expect(env.OPENSEARCH_ENDPOINT).toBe('https://opensearch.example.com');
      expect(env.S3_BUCKET).toBe('lego-moc-files');
      expect(env.COGNITO_USER_POOL_ID).toBe('us-east-1_ABC123');
      expect(env.COGNITO_CLIENT_ID).toBe('abc123def456');
    });
  });

  describe('validateEnv() - Error Path Tests', () => {
    it('should throw Error with invalid NODE_ENV', async () => {
      // Given: NODE_ENV='invalid-value'
      process.env.NODE_ENV = 'invalid-value';

      // Spy on console.error to verify error logging
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // When/Then: validateEnv() throws Error with message containing 'Environment validation failed'
      const { validateEnv } = await import('../env');
      expect(() => validateEnv()).toThrow('Environment validation failed');

      // And: Logs ZodError issues to console.error
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Invalid environment variables:');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('NODE_ENV')
      );
    });

    it('should throw Error with invalid STAGE', async () => {
      // Given: STAGE='invalid-stage' (not dev/staging/production)
      process.env.NODE_ENV = 'development';
      process.env.STAGE = 'invalid-stage';

      // Spy on console.error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // When/Then: Throws Error with 'Environment validation failed'
      const { validateEnv } = await import('../env');
      expect(() => validateEnv()).toThrow('Environment validation failed');

      // And: Error includes validation issues
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Invalid environment variables:');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('STAGE')
      );
    });

    it('should throw Error with invalid LOG_LEVEL', async () => {
      // Given: LOG_LEVEL='trace' (not debug/info/warn/error)
      process.env.NODE_ENV = 'development';
      process.env.STAGE = 'dev';
      process.env.LOG_LEVEL = 'trace';

      // Spy on console.error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // When/Then: Throws Error with 'Environment validation failed'
      const { validateEnv } = await import('../env');
      expect(() => validateEnv()).toThrow('Environment validation failed');

      // And: Error includes validation issues
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Invalid environment variables:');
    });
  });

  describe('getEnv() - Memoization Tests', () => {
    it('should memoize validateEnv() result', async () => {
      // Given: Valid environment
      process.env.NODE_ENV = 'development';
      process.env.STAGE = 'dev';

      // When: getEnv() is called multiple times
      const { getEnv } = await import('../env');
      const env1 = getEnv();
      const env2 = getEnv();
      const env3 = getEnv();

      // Then: validateEnv() is only called once (memoized result returned)
      // Same object reference means no re-validation
      expect(env1).toBe(env2);
      expect(env2).toBe(env3);
    });

    it('should reset cache when module is reimported', async () => {
      // Given: Valid environment with initial LOG_LEVEL
      process.env.NODE_ENV = 'development';
      process.env.STAGE = 'dev';
      process.env.LOG_LEVEL = 'info';

      // When: getEnv() is called
      let envModule = await import('../env');
      const env1 = envModule.getEnv();

      // Then: First call returns info level
      expect(env1.LOG_LEVEL).toBe('info');

      // When: Environment changes and module is reset
      process.env.LOG_LEVEL = 'debug';
      vi.resetModules();

      // And: Module is reimported
      envModule = await import('../env');
      const env2 = envModule.getEnv();

      // Then: New environment values are picked up
      expect(env2.LOG_LEVEL).toBe('debug');
    });
  });
});
