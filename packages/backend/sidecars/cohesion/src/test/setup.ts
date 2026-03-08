/**
 * Test Setup — Cohesion Sidecar
 * WINT-4010: Create Cohesion Sidecar
 *
 * Mocks @repo/db to prevent DB connection errors during unit tests.
 */

import { vi } from 'vitest'

// Mock @repo/db so unit tests don't need a real database connection
vi.mock('@repo/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  },
}))
