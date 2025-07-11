import { describe, it, expect, vi, beforeEach } from 'vitest';
import { login } from '../../handlers/login';

// Mock all dependencies
vi.mock('../../utils/validation', () => ({
  createResponse: vi.fn((statusCode, body) => ({ statusCode, body: JSON.stringify(body) })),
  createErrorResponse: vi.fn((statusCode, message) => ({ statusCode, body: JSON.stringify({ error: message }) })),
  validateRequest: vi.fn(),
  getUserByEmail: vi.fn(),
  updateUser: vi.fn(),
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
  logSecurityEvent: vi.fn(),
  RATE_LIMITS: {
    LOGIN: { requests: 10, windowMs: 300000 }
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(() => Promise.resolve(true)),
  },
}));

describe('login handler', () => {
  const mockEvent = {
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'ValidPass123!',
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

  it('should successfully login a user', async () => {
    const { validateRequest, getUserByEmail, updateUser, generateTokens } = await import('../../utils/validation');
    const { checkRateLimit } = await import('../../utils/security');
    const bcrypt = await import('bcryptjs');

    // Mock successful validation
    vi.mocked(validateRequest).mockReturnValue({
      success: true,
      data: {
        email: 'test@example.com',
        password: 'ValidPass123!',
      },
    });

    // Mock rate limiting
    vi.mocked(checkRateLimit).mockReturnValue(true);

    // Mock user exists
    vi.mocked(getUserByEmail).mockResolvedValue({
      id: 'user-id',
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

    // Mock password verification
    vi.mocked(bcrypt.default.compare).mockResolvedValue(true);

    // Mock successful update
    vi.mocked(updateUser).mockResolvedValue(undefined);

    const result = await login(mockEvent);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Login successful');
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe('test@example.com');
    expect(body.user.password).toBeUndefined();
    expect(body.expiresIn).toBeDefined();
  });

  it('should return 429 when rate limited', async () => {
    const { checkRateLimit } = await import('../../utils/security');
    vi.mocked(checkRateLimit).mockReturnValue(false);

    const result = await login(mockEvent);

    expect(result.statusCode).toBe(429);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Too many login attempts. Please try again later.');
  });

  it('should return 401 for invalid credentials', async () => {
    const { validateRequest, getUserByEmail } = await import('../../utils/validation');
    const { checkRateLimit } = await import('../../utils/security');

    vi.mocked(validateRequest).mockReturnValue({
      success: true,
      data: {
        email: 'test@example.com',
        password: 'ValidPass123!',
      },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);
    vi.mocked(getUserByEmail).mockResolvedValue(null);

    const result = await login(mockEvent);

    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Invalid credentials');
  });

  it('should return 423 when account is locked', async () => {
    const { validateRequest, getUserByEmail } = await import('../../utils/validation');
    const { checkRateLimit } = await import('../../utils/security');

    vi.mocked(validateRequest).mockReturnValue({
      success: true,
      data: {
        email: 'test@example.com',
        password: 'ValidPass123!',
      },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);
    vi.mocked(getUserByEmail).mockResolvedValue({
      id: 'user-id',
      email: 'test@example.com',
      password: 'hashed-password',
      firstName: 'John',
      lastName: 'Doe',
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
      emailVerified: false,
      loginAttempts: 5,
      lockedUntil: new Date(Date.now() + 60000).toISOString(), // Locked for 1 minute
      lastLoginAt: null,
      resetToken: null,
      resetTokenExpiry: null,
    });

    const result = await login(mockEvent);

    expect(result.statusCode).toBe(423);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Account is temporarily locked. Please try again later.');
  });
}); 