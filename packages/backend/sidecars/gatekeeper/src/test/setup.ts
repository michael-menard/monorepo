/**
 * Global Test Setup for Gatekeeper Sidecar
 * WINT-3010: Create Gatekeeper Sidecar
 *
 * Mocks @repo/logger to suppress log output in unit tests.
 * Gatekeeper has no DB dependencies — no DB mock needed.
 */

import { vi } from 'vitest'

// Mock @repo/logger to suppress log output in tests
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))
