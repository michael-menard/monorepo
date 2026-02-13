import { vi } from 'vitest'

// Mock @repo/logger for all tests
vi.mock('@repo/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))
