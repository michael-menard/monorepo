/**
 * Fixture: density/sample-b.test.ts
 * Known counts: 2 test cases, 2 assertions → density 1.0
 * Used by collect-assertion-density.test.ts
 */

import { describe, test, expect } from 'vitest'

describe('fixture-b', () => {
  test('case alpha', () => {
    expect(42).toBeGreaterThan(0)
  })

  test('case beta', () => {
    expect('fixture').toContain('fix')
  })
})
