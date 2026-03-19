import { describe, it, expect } from 'vitest'
import { computeWaves } from '../planService'

describe('computeWaves', () => {
  it('assigns wave 0 to stories with no dependencies', () => {
    const storyIds = new Set(['A', 'B', 'C'])
    const depsMap = new Map<string, string[]>()

    const waves = computeWaves(storyIds, depsMap)

    expect(waves.get('A')).toBe(0)
    expect(waves.get('B')).toBe(0)
    expect(waves.get('C')).toBe(0)
  })

  it('computes correct waves for a linear chain', () => {
    // A -> B -> C (C depends on B, B depends on A)
    const storyIds = new Set(['A', 'B', 'C'])
    const depsMap = new Map<string, string[]>([
      ['B', ['A']],
      ['C', ['B']],
    ])

    const waves = computeWaves(storyIds, depsMap)

    expect(waves.get('A')).toBe(0)
    expect(waves.get('B')).toBe(1)
    expect(waves.get('C')).toBe(2)
  })

  it('computes correct waves for parallel independent stories', () => {
    // A and B are independent; C depends on both
    const storyIds = new Set(['A', 'B', 'C'])
    const depsMap = new Map<string, string[]>([
      ['C', ['A', 'B']],
    ])

    const waves = computeWaves(storyIds, depsMap)

    expect(waves.get('A')).toBe(0)
    expect(waves.get('B')).toBe(0)
    expect(waves.get('C')).toBe(1)
  })

  it('computes max depth for diamond dependency', () => {
    // A -> B, A -> C, B -> D, C -> D (D depends on B and C, both depend on A)
    const storyIds = new Set(['A', 'B', 'C', 'D'])
    const depsMap = new Map<string, string[]>([
      ['B', ['A']],
      ['C', ['A']],
      ['D', ['B', 'C']],
    ])

    const waves = computeWaves(storyIds, depsMap)

    expect(waves.get('A')).toBe(0)
    expect(waves.get('B')).toBe(1)
    expect(waves.get('C')).toBe(1)
    expect(waves.get('D')).toBe(2)
  })

  it('handles cycle with guard (does not infinite loop)', () => {
    // A -> B -> A (cycle)
    const storyIds = new Set(['A', 'B'])
    const depsMap = new Map<string, string[]>([
      ['A', ['B']],
      ['B', ['A']],
    ])

    const waves = computeWaves(storyIds, depsMap)

    // Cycle guard returns 0 for the back-edge, breaking the cycle.
    // With Set insertion order (A first): A is computed first, recurses into B,
    // B recurses into A which hits cycle guard (returns 0), so B=1, then A=2.
    expect(waves.get('A')).toBeDefined()
    expect(waves.get('B')).toBeDefined()
    // Key assertion: no infinite recursion, values are finite
    expect(Number.isFinite(waves.get('A')!)).toBe(true)
    expect(Number.isFinite(waves.get('B')!)).toBe(true)
  })

  it('ignores dependencies on stories outside the storyIds set', () => {
    // B depends on X (not in set) and A (in set)
    const storyIds = new Set(['A', 'B'])
    const depsMap = new Map<string, string[]>([
      ['B', ['A', 'X']],
    ])

    const waves = computeWaves(storyIds, depsMap)

    expect(waves.get('A')).toBe(0)
    expect(waves.get('B')).toBe(1) // Only counts A, ignores X
  })

  it('handles empty input', () => {
    const storyIds = new Set<string>()
    const depsMap = new Map<string, string[]>()

    const waves = computeWaves(storyIds, depsMap)

    expect(waves.size).toBe(0)
  })

  it('handles single story with no deps', () => {
    const storyIds = new Set(['A'])
    const depsMap = new Map<string, string[]>()

    const waves = computeWaves(storyIds, depsMap)

    expect(waves.get('A')).toBe(0)
  })
})
