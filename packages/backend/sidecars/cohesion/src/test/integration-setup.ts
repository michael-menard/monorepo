/**
 * Integration Test Setup — Cohesion Sidecar
 * WINT-4010: Create Cohesion Sidecar
 *
 * Mocks @repo/db for integration tests that don't need real DB.
 */

import { vi } from 'vitest'

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
