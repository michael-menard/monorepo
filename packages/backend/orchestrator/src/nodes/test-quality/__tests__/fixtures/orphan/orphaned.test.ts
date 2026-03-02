/**
 * Fixture: orphan/orphaned.test.ts
 * This file intentionally has NO corresponding source file.
 * Used to verify the OrphanedTestDetector identifies it as orphaned.
 */

import { describe, it, expect } from 'vitest'

describe('orphaned fixture', () => {
  it('this test has no source', () => {
    // Intentionally orphaned — no orphaned.ts source file exists
    expect(true).toBe(true)
  })
})
