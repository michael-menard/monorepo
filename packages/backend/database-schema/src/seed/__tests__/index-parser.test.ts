import { describe, it, expect, vi } from 'vitest'
import path from 'path'
import { parseStoriesIndex } from '../parsers/index-parser.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

const storiesIndexPath = path.resolve(
  import.meta.dirname,
  '../../../../../../plans/future/platform/wint/stories.index.md',
)

describe('parseStoriesIndex', () => {
  it('extracts phases from real stories.index.md', async () => {
    const phases = await parseStoriesIndex(storiesIndexPath)

    expect(phases).toBeDefined()
    expect(phases.length).toBeGreaterThanOrEqual(8) // At least 8 phases (0-7 minimum)

    // Verify phase structure
    const firstPhase = phases[0]
    expect(firstPhase).toHaveProperty('id')
    expect(firstPhase).toHaveProperty('phaseName')
    expect(firstPhase).toHaveProperty('phaseOrder')

    // Verify phases are in order
    for (let i = 0; i < phases.length - 1; i++) {
      expect(phases[i].phaseOrder).toBeLessThanOrEqual(phases[i + 1].phaseOrder)
    }
  })

  it('extracts Phase 0: Bootstrap correctly', async () => {
    const phases = await parseStoriesIndex(storiesIndexPath)

    const phase0 = phases.find(p => p.id === 0)
    expect(phase0).toBeDefined()
    expect(phase0!.phaseName).toBe('Bootstrap')
    expect(phase0!.phaseOrder).toBe(0)
    expect(phase0!.description).not.toBeNull()
  })

  it('extracts Phase 1: Foundation correctly', async () => {
    const phases = await parseStoriesIndex(storiesIndexPath)

    const phase1 = phases.find(p => p.id === 1)
    expect(phase1).toBeDefined()
    expect(phase1!.phaseName).toBe('Foundation')
    expect(phase1!.phaseOrder).toBe(1)
  })

  it('throws on non-existent file', async () => {
    await expect(parseStoriesIndex('/non/existent/path/stories.index.md')).rejects.toThrow()
  })
})
