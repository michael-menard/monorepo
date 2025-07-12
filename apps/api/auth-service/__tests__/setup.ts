import { vi, beforeAll, afterAll } from 'vitest';

// Load test environment variables if present
try {
  // Dynamically import dotenv only if available, to avoid errors if not installed
  // This prevents test failures if dotenv is not a dependency
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config({ path: '.env.test' });
} catch (e) {
  // dotenv is optional for CI or environments where env vars are set differently
}

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress console output during tests unless explicitly needed
  // console.log = () => {};
  // console.error = () => {};
  // console.warn = () => {};
});

afterAll(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Mock MongoDB
vi.mock('mongoose', () => ({
  default: {
    connect: vi.fn().mockResolvedValue({}),
    disconnect: vi.fn().mockResolvedValue({}),
    connection: {
      readyState: 1,
      on: vi.fn(),
      once: vi.fn(),
    },
    Schema: vi.fn().mockReturnValue({
      pre: vi.fn().mockReturnThis(),
      post: vi.fn().mockReturnThis(),
    }),
    model: vi.fn().mockReturnValue({
      findOne: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
      deleteMany: vi.fn(),
    }),
  }
}));

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  hash: vi.fn().mockResolvedValue('hashedPassword'),
  compare: vi.fn().mockResolvedValue(true),
}));

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  sign: vi.fn().mockReturnValue('mock-jwt-token'),
  verify: vi.fn().mockReturnValue({ userId: 'test-user-id' }),
}));

// Mock mailtrap
vi.mock('../mailtrap/emails', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue({}),
  sendWelcomeEmail: vi.fn().mockResolvedValue({}),
  sendPasswordResetEmail: vi.fn().mockResolvedValue({}),
  sendResetSuccessEmail: vi.fn().mockResolvedValue({}),
}));

// Mock crypto
vi.mock('crypto', () => ({
  __esModule: true,
  default: {
    randomBytes: vi.fn().mockReturnValue({
      toString: vi.fn().mockReturnValue('mock-reset-token'),
    }),
  },
}));

// Mock express
vi.mock('express', () => {
  const mockRouter = {
    get: vi.fn().mockReturnThis(),
    post: vi.fn().mockReturnThis(),
    put: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    use: vi.fn().mockReturnThis(),
  };
  
  const mockApp = {
    use: vi.fn().mockReturnThis(),
    listen: vi.fn().mockReturnThis(),
    get: vi.fn().mockReturnThis(),
    post: vi.fn().mockReturnThis(),
    put: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };

  const mockRouterConstructor = vi.fn(() => mockRouter);

  return {
    __esModule: true,
    default: vi.fn(() => mockApp),
    Router: mockRouterConstructor,
    json: vi.fn(() => (req: any, res: any, next: any) => next()),
    urlencoded: vi.fn(() => (req: any, res: any, next: any) => next()),
  };
});

// Mock helmet
vi.mock('helmet', () => vi.fn(() => (req: any, res: any, next: any) => next()));

// Mock cors
vi.mock('cors', () => vi.fn(() => (req: any, res: any, next: any) => next()));

// Mock cookie-parser
vi.mock('cookie-parser', () => vi.fn(() => (req: any, res: any, next: any) => next()));

// Mock dotenv
vi.mock('dotenv', () => ({
  default: { config: vi.fn() },
}));

// Mock process.env
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.NODE_ENV = 'test';
process.env.CLIENT_URL = 'http://localhost:3000'; 