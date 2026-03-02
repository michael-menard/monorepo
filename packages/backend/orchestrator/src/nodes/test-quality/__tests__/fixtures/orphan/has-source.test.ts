/**
 * Fixture: orphan/has-source.test.ts
 * This file HAS a corresponding has-source.ts source file.
 * Used to verify the OrphanedTestDetector does NOT flag it as orphaned.
 */

import { describe, it, expect } from 'vitest'
import { add } from './has-source.js'

describe('has-source fixture', () => {
  it('adds two numbers', () => {
    expect(add(1, 2)).toBe(3)
  })
})
