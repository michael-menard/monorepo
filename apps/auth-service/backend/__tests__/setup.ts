import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress console output during tests unless explicitly needed
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
});

afterAll(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Mock MongoDB
jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue({}),
  disconnect: jest.fn().mockResolvedValue({}),
  connection: {
    readyState: 1,
    on: jest.fn(),
    once: jest.fn(),
  },
  Schema: jest.fn().mockReturnValue({
    pre: jest.fn().mockReturnThis(),
    post: jest.fn().mockReturnThis(),
  }),
  model: jest.fn().mockReturnValue({
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    deleteMany: jest.fn(),
  }),
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ userId: 'test-user-id' }),
}));

// Mock mailtrap
jest.mock('../mailtrap/emails.ts', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue({}),
  sendWelcomeEmail: jest.fn().mockResolvedValue({}),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({}),
  sendResetSuccessEmail: jest.fn().mockResolvedValue({}),
}));

// Mock crypto
jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('mock-reset-token'),
  }),
}));

// Mock express
jest.mock('express', () => {
  const mockRouter = {
    get: jest.fn().mockReturnThis(),
    post: jest.fn().mockReturnThis(),
    put: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    use: jest.fn().mockReturnThis(),
  };
  
  const mockApp = {
    use: jest.fn().mockReturnThis(),
    listen: jest.fn().mockReturnThis(),
    get: jest.fn().mockReturnThis(),
    post: jest.fn().mockReturnThis(),
    put: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  };

  const mockRouterConstructor = jest.fn(() => mockRouter);

  return {
    __esModule: true,
    default: jest.fn(() => mockApp),
    Router: mockRouterConstructor,
    json: jest.fn(() => (req: any, res: any, next: any) => next()),
    urlencoded: jest.fn(() => (req: any, res: any, next: any) => next()),
  };
});

// Mock helmet
jest.mock('helmet', () => jest.fn(() => (req: any, res: any, next: any) => next()));

// Mock cors
jest.mock('cors', () => jest.fn(() => (req: any, res: any, next: any) => next()));

// Mock cookie-parser
jest.mock('cookie-parser', () => jest.fn(() => (req: any, res: any, next: any) => next()));

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

// Mock process.env
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.NODE_ENV = 'test'; 