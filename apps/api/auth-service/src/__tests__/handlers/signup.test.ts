import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signup } from '../../handlers/signup';
import { createUser, getUserByEmail, validateRequest } from '../../utils/validation';
import { checkRateLimit } from '../../utils/security';

// Mock dependencies
vi.mock('../../utils/validation', () => ({
  createUser: vi.fn(),
  getUserByEmail: vi.fn(),
  createResponse: vi.fn((statusCode, body) => ({ statusCode, body: JSON.stringify(body) })),
  createErrorResponse: vi.fn((statusCode, message) => ({ statusCode, body: JSON.stringify({ error: message }) })),
  validateRequest: vi.fn(),
  generateTokens: vi.fn(() => ({ accessToken: 'mock-access', refreshToken: 'mock-refresh' })),
}));

vi.mock('../../utils/security', () => ({
  checkRateLimit: vi.fn(),
  createSecureResponse: vi.fn((statusCode, body, options) => ({ 
    statusCode, 
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body) 
  })),
  createSecureErrorResponse: vi.fn((statusCode, message, options) => ({ 
    statusCode, 
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: message }) 
  })),
  getClientIP: vi.fn(() => '192.168.1.1'),
  validateRequestSize: vi.fn(() => true),
  validateRequestHeaders: vi.fn(() => ({ isValid: true, errors: [] })),
  sanitizeInput: vi.fn((input) => input),
  validatePasswordStrength: vi.fn(() => ({ isValid: true, errors: [] })),
  logSecurityEvent: vi.fn(),
  RATE_LIMITS: {
    SIGNUP: { requests: 5, windowMs: 300000 }
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(() => 'hashed-password'),
  },
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-user-id'),
}));

describe('signup handler', () => {
  const mockEvent = {
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'ValidPass123!',
      firstName: 'John',
      lastName: 'Doe',
    }),
    headers: {
      'content-type': 'application/json',
    },
    requestContext: {
      http: {
        sourceIp: '192.168.1.1',
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully create a new user', async () => {
    // Mock successful validation
    vi.mocked(validateRequest).mockReturnValue({
      success: true,
      data: {
        email: 'test@example.com',
        password: 'ValidPass123!',
        firstName: 'John',
        lastName: 'Doe',
      },
    });

    // Mock rate limiting
    vi.mocked(checkRateLimit).mockReturnValue(true);

    // Mock user doesn't exist
    vi.mocked(getUserByEmail).mockResolvedValue(null);

    // Mock successful user creation
    vi.mocked(createUser).mockResolvedValue(undefined);

    const result = await signup(mockEvent);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('User created successfully');
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe('test@example.com');
    expect(body.user.password).toBeUndefined();
    expect(body.tokens).toBeDefined();
  });

  it('should return 429 when rate limited', async () => {
    vi.mocked(checkRateLimit).mockReturnValue(false);

    const result = await signup(mockEvent);

    expect(result.statusCode).toBe(429);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Too many signup attempts. Please try again later.');
  });

  it('should return 400 for invalid email', async () => {
    vi.mocked(checkRateLimit).mockReturnValue(true);
    vi.mocked(validateRequest).mockReturnValue({
      success: false,
      error: 'Invalid email format',
    });

    const result = await signup(mockEvent);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Invalid email format');
  });

  it('should return 409 when user already exists', async () => {
    vi.mocked(checkRateLimit).mockReturnValue(true);
    vi.mocked(validateRequest).mockReturnValue({
      success: true,
      data: {
        email: 'test@example.com',
        password: 'ValidPass123!',
        firstName: 'John',
        lastName: 'Doe',
      },
    });

    // Mock user already exists
    vi.mocked(getUserByEmail).mockResolvedValue({
      id: 'existing-user-id',
      email: 'test@example.com',
      password: 'hashed-password',
      firstName: 'John',
      lastName: 'Doe',
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
      emailVerified: false,
      loginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      resetToken: null,
      resetTokenExpiry: null,
    });

    const result = await signup(mockEvent);

    expect(result.statusCode).toBe(409);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('User with this email already exists');
  });

  it('should return 500 on database error', async () => {
    vi.mocked(checkRateLimit).mockReturnValue(true);
    vi.mocked(validateRequest).mockReturnValue({
      success: true,
      data: {
        email: 'test@example.com',
        password: 'ValidPass123!',
        firstName: 'John',
        lastName: 'Doe',
      },
    });
    vi.mocked(getUserByEmail).mockResolvedValue(null);
    vi.mocked(createUser).mockRejectedValue(new Error('Database error'));

    const result = await signup(mockEvent);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Internal server error');
  });

  it('should handle missing request body', async () => {
    const eventWithoutBody = {
      body: null,
      headers: {},
      requestContext: {
        http: {
          sourceIp: '192.168.1.1',
        },
      },
    };

    vi.mocked(checkRateLimit).mockReturnValue(true);
    vi.mocked(validateRequest).mockReturnValue({
      success: false,
      error: 'Validation failed',
    });

    const result = await signup(eventWithoutBody);

    expect(result.statusCode).toBe(400);
  });
}); 