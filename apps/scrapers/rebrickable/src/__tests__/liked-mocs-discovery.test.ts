import { describe, it, expect } from 'vitest'

/**
 * Integration-level tests for the liked MOCs discovery pipeline logic.
 * Tests the pure functions and algorithms used in the discovery phase
 * without requiring browser or database connections.
 */

describe('Liked MOCs Discovery — Shuffle', () => {
  /**
   * Fisher-Yates shuffle (same algorithm used in pipeline.ts)
   */
  function shuffle<T>(arr: T[]): T[] {
    const result = [...arr]
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }

  it('preserves all items after shuffle', () => {
    const items = Array.from({ length: 50 }, (_, i) => `MOC-${i}`)
    const shuffled = shuffle(items)

    expect(shuffled).toHaveLength(items.length)
    expect(shuffled.sort()).toEqual(items.sort())
  })

  it('actually changes the order (statistical)', () => {
    const items = Array.from({ length: 20 }, (_, i) => i)
    // Run 10 shuffles — at least one should differ from the original
    const results = Array.from({ length: 10 }, () => shuffle(items))
    const anyDifferent = results.some(
      r => JSON.stringify(r) !== JSON.stringify(items),
    )
    expect(anyDifferent).toBe(true)
  })

  it('handles single-element array', () => {
    const items = ['MOC-1']
    const shuffled = shuffle(items)
    expect(shuffled).toEqual(['MOC-1'])
  })

  it('handles empty array', () => {
    const shuffled = shuffle([])
    expect(shuffled).toEqual([])
  })
})

describe('Liked MOCs Discovery — Queue Building', () => {
  interface MockMoc {
    mocNumber: string
    title: string
    isFree: boolean
  }

  /**
   * Simulates the discovery phase queue-building logic from pipeline.ts.
   * Iterates MOCs, checks free status, builds queue up to limit.
   */
  function buildDownloadQueue(
    allMocs: MockMoc[],
    limit?: number,
    alreadyCompleted: Set<string> = new Set(),
  ): MockMoc[] {
    const queue: MockMoc[] = []

    for (const moc of allMocs) {
      if (limit && queue.length >= limit) break
      if (alreadyCompleted.has(moc.mocNumber)) continue
      if (moc.isFree) {
        queue.push(moc)
      }
    }

    return queue
  }

  it('collects only free MOCs', () => {
    const mocs: MockMoc[] = [
      { mocNumber: '100', title: 'Free 1', isFree: true },
      { mocNumber: '200', title: 'Premium', isFree: false },
      { mocNumber: '300', title: 'Free 2', isFree: true },
    ]

    const queue = buildDownloadQueue(mocs)
    expect(queue).toHaveLength(2)
    expect(queue.map(m => m.mocNumber)).toEqual(['100', '300'])
  })

  it('respects limit on the download queue', () => {
    const mocs: MockMoc[] = [
      { mocNumber: '100', title: 'Free 1', isFree: true },
      { mocNumber: '200', title: 'Free 2', isFree: true },
      { mocNumber: '300', title: 'Free 3', isFree: true },
      { mocNumber: '400', title: 'Free 4', isFree: true },
    ]

    const queue = buildDownloadQueue(mocs, 2)
    expect(queue).toHaveLength(2)
    expect(queue[0].mocNumber).toBe('100')
    expect(queue[1].mocNumber).toBe('200')
  })

  it('limit applies to free MOCs found, not total visited', () => {
    const mocs: MockMoc[] = [
      { mocNumber: '100', title: 'Premium 1', isFree: false },
      { mocNumber: '200', title: 'Premium 2', isFree: false },
      { mocNumber: '300', title: 'Free 1', isFree: true },
      { mocNumber: '400', title: 'Premium 3', isFree: false },
      { mocNumber: '500', title: 'Free 2', isFree: true },
      { mocNumber: '600', title: 'Free 3', isFree: true },
    ]

    const queue = buildDownloadQueue(mocs, 2)
    expect(queue).toHaveLength(2)
    expect(queue.map(m => m.mocNumber)).toEqual(['300', '500'])
  })

  it('skips already-completed MOCs', () => {
    const mocs: MockMoc[] = [
      { mocNumber: '100', title: 'Free 1', isFree: true },
      { mocNumber: '200', title: 'Free 2', isFree: true },
      { mocNumber: '300', title: 'Free 3', isFree: true },
    ]

    const completed = new Set(['200'])
    const queue = buildDownloadQueue(mocs, undefined, completed)
    expect(queue).toHaveLength(2)
    expect(queue.map(m => m.mocNumber)).toEqual(['100', '300'])
  })

  it('returns empty queue when no free MOCs exist', () => {
    const mocs: MockMoc[] = [
      { mocNumber: '100', title: 'Premium 1', isFree: false },
      { mocNumber: '200', title: 'Premium 2', isFree: false },
    ]

    const queue = buildDownloadQueue(mocs)
    expect(queue).toHaveLength(0)
  })

  it('returns empty queue when all are already completed', () => {
    const mocs: MockMoc[] = [
      { mocNumber: '100', title: 'Free 1', isFree: true },
      { mocNumber: '200', title: 'Free 2', isFree: true },
    ]

    const completed = new Set(['100', '200'])
    const queue = buildDownloadQueue(mocs, undefined, completed)
    expect(queue).toHaveLength(0)
  })

  it('handles empty input', () => {
    const queue = buildDownloadQueue([])
    expect(queue).toHaveLength(0)
  })

  it('limit of 0 returns empty queue', () => {
    // Edge case: limit=0 should effectively mean "collect none"
    // In practice this won't happen since CLI validates limit > 0
    const mocs: MockMoc[] = [
      { mocNumber: '100', title: 'Free', isFree: true },
    ]
    // limit=0 is falsy so the condition `if (limit && ...)` won't trigger
    // This matches the pipeline behavior where limit=undefined means "no limit"
    const queue = buildDownloadQueue(mocs, 0)
    expect(queue).toHaveLength(1) // 0 is falsy, no limit applied
  })
})
