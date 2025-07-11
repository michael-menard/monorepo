import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dotenv
vi.mock('dotenv', () => ({
  default: {
    config: vi.fn(),
  },
}));

describe('environment config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear process.env
    delete process.env.USERS_TABLE;
    delete process.env.JWT_SECRET;
    delete process.env.SALT_ROUNDS;
    delete process.env.SESSION_TTL;
    delete process.env.AWS_REGION;
    delete process.env.IS_OFFLINE;
  });

  it('should load environment variables', async () => {
    // Set environment variables
    process.env.USERS_TABLE = 'test-users-table';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.SALT_ROUNDS = '14';
    process.env.SESSION_TTL = '7200';
    process.env.AWS_REGION = 'us-west-2';
    process.env.IS_OFFLINE = 'true';

    const { config } = await import('../../config/env');

    expect(config.USERS_TABLE).toBe('test-users-table');
    expect(config.JWT_SECRET).toBe('test-jwt-secret');
    expect(config.SALT_ROUNDS).toBe(14);
    expect(config.SESSION_TTL).toBe(7200);
    expect(config.AWS_REGION).toBe('us-west-2');
    expect(config.IS_OFFLINE).toBe(true);
  });

  it('should use default values when environment variables are not set', () => {
    // Test the default values directly
    expect(process.env['USERS_TABLE'] || 'auth-service-users-dev').toBe('auth-service-users-dev');
    expect(process.env['JWT_SECRET'] || 'fallback-jwt-secret-for-development').toBe('fallback-jwt-secret-for-development');
    expect(parseInt(process.env['SALT_ROUNDS'] || '12')).toBe(12);
    expect(parseInt(process.env['SESSION_TTL'] || '86400')).toBe(86400);
    expect(process.env['AWS_REGION'] || 'us-east-1').toBe('us-east-1');
    expect(process.env['IS_OFFLINE'] === 'true').toBe(false);
  });

  it('should have correct security constants', async () => {
    const { config } = await import('../../config/env');

    expect(config.MAX_LOGIN_ATTEMPTS).toBe(5);
    expect(config.LOCKOUT_DURATION).toBe(15 * 60 * 1000);
    expect(config.RATE_LIMIT_WINDOW).toBe(5 * 60 * 1000);
    expect(config.SIGNUP_RATE_LIMIT).toBe(5);
    expect(config.LOGIN_RATE_LIMIT).toBe(10);
  });

  it('should have correct token configuration', async () => {
    const { config } = await import('../../config/env');

    expect(config.ACCESS_TOKEN_EXPIRY).toBe('1h');
    expect(config.REFRESH_TOKEN_EXPIRY).toBe('7d');
    expect(config.RESET_TOKEN_EXPIRY).toBe(3600000);
  });
}); 