/**
 * Fixture: density/sample-a.test.ts
 * Known counts: 3 test cases, 6 assertions → density 2.0
 * Used by collect-assertion-density.test.ts
 */

import { describe, it, expect } from 'vitest'

describe('fixture-a', () => {
  it('case one', () => {
    expect(1 + 1).toBe(2)
    expect(2 + 2).toBe(4)
  })

  it('case two', () => {
    expect('hello').toHaveLength(5)
    expect('world').toHaveLength(5)
  })

  it('case three', () => {
    expect(true).toBe(true)
    expect(false).toBe(false)
  })
})
