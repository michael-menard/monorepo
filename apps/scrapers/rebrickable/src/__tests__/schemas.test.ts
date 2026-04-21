import { describe, it, expect } from 'vitest'
import {
  CliOptionsSchema,
  ScrapeRunStatusSchema,
  InstructionSchema,
  PartSchema,
  CheckpointPhaseSchema,
  ScrapedInstructionListItemSchema,
  ScrapedPartSchema,
  ScrapedMocDetailSchema,
  RateLimiterConfigSchema,
  BrowserConfigSchema,
  EnrichmentSummarySchema,
  RetryConfigSchema,
} from '../__types__/index.js'

describe('CliOptionsSchema', () => {
  it('provides defaults for all options', () => {
    const result = CliOptionsSchema.parse({})
    expect(result.headed).toBe(false)
    expect(result.dryRun).toBe(false)
    expect(result.resume).toBe(false)
    expect(result.force).toBe(false)
    expect(result.listOnly).toBe(false)
    expect(result.single).toBeUndefined()
    expect(result.limit).toBeUndefined()
    expect(result.ignoreRobots).toBe(false)
  })

  it('parses explicit options', () => {
    const result = CliOptionsSchema.parse({
      headed: true,
      dryRun: true,
      limit: 5,
    })
    expect(result.headed).toBe(true)
    expect(result.dryRun).toBe(true)
    expect(result.limit).toBe(5)
  })

  it('rejects negative limit', () => {
    expect(() => CliOptionsSchema.parse({ limit: -1 })).toThrow()
  })

  it('parses --list-only flag', () => {
    const result = CliOptionsSchema.parse({ listOnly: true })
    expect(result.listOnly).toBe(true)
  })

  it('parses --single with MOC number', () => {
    const result = CliOptionsSchema.parse({ single: '12345' })
    expect(result.single).toBe('12345')
  })

  it('accepts --single as undefined by default', () => {
    const result = CliOptionsSchema.parse({})
    expect(result.single).toBeUndefined()
  })
})

describe('ScrapeRunStatusSchema', () => {
  it('accepts valid statuses', () => {
    expect(ScrapeRunStatusSchema.parse('running')).toBe('running')
    expect(ScrapeRunStatusSchema.parse('completed')).toBe('completed')
    expect(ScrapeRunStatusSchema.parse('failed')).toBe('failed')
    expect(ScrapeRunStatusSchema.parse('interrupted')).toBe('interrupted')
  })

  it('rejects invalid status', () => {
    expect(() => ScrapeRunStatusSchema.parse('unknown')).toThrow()
  })
})

describe('CheckpointPhaseSchema', () => {
  it('accepts all valid phases', () => {
    const phases = ['listed', 'detail_scraped', 'downloaded', 'uploaded', 'completed']
    for (const phase of phases) {
      expect(CheckpointPhaseSchema.parse(phase)).toBe(phase)
    }
  })
})

describe('ScrapedInstructionListItemSchema', () => {
  it('parses a valid instruction list item', () => {
    const result = ScrapedInstructionListItemSchema.parse({
      mocNumber: '32823',
      title: 'Star Destroyer',
      url: 'https://rebrickable.com/mocs/MOC-32823/designer/star-destroyer/',
    })
    expect(result.mocNumber).toBe('32823')
    expect(result.title).toBe('Star Destroyer')
    expect(result.author).toBe('')
  })

  it('includes optional fields', () => {
    const result = ScrapedInstructionListItemSchema.parse({
      mocNumber: '12345',
      title: 'Test MOC',
      author: 'TestDesigner',
      url: 'https://rebrickable.com/mocs/MOC-12345/',
      purchaseDate: '2025-01-15',
    })
    expect(result.author).toBe('TestDesigner')
    expect(result.purchaseDate).toBe('2025-01-15')
  })
})

describe('ScrapedPartSchema', () => {
  it('parses with defaults', () => {
    const result = ScrapedPartSchema.parse({ partNumber: '3001' })
    expect(result.partNumber).toBe('3001')
    expect(result.quantity).toBe(1)
    expect(result.color).toBe('')
  })

  it('coerces quantity from string', () => {
    const result = ScrapedPartSchema.parse({
      partNumber: '3001',
      quantity: '5',
    })
    expect(result.quantity).toBe(5)
  })
})

describe('ScrapedMocDetailSchema', () => {
  it('parses a complete MOC detail', () => {
    const result = ScrapedMocDetailSchema.parse({
      mocNumber: '32823',
      title: 'Star Destroyer',
      author: 'Designer',
      partsCount: 245,
      parts: [
        { partNumber: '3001', name: 'Brick 2x4', color: 'Light Bluish Gray', quantity: 10 },
        { partNumber: '3022', name: 'Plate 2x2', color: 'Dark Bluish Gray', quantity: 20 },
      ],
      downloadUrl: 'https://rebrickable.com/download/12345',
      fileType: 'PDF',
    })
    expect(result.parts).toHaveLength(2)
    expect(result.partsCount).toBe(245)
  })
})

describe('RateLimiterConfigSchema', () => {
  it('provides sensible defaults', () => {
    const result = RateLimiterConfigSchema.parse({})
    expect(result.requestsPerMinute).toBe(10)
    expect(result.minDelayMs).toBe(2000)
    expect(result.burstSize).toBe(3)
    expect(result.jitter).toBe(0.3)
  })
})

describe('BrowserConfigSchema', () => {
  it('provides default viewport pool', () => {
    const result = BrowserConfigSchema.parse({})
    expect(result.viewportPool).toHaveLength(4)
    expect(result.headed).toBe(false)
  })
})

describe('RetryConfigSchema', () => {
  it('provides defaults', () => {
    const result = RetryConfigSchema.parse({})
    expect(result.maxRetries).toBe(3)
    expect(result.baseDelayMs).toBe(1000)
    expect(result.backoffFactor).toBe(2)
  })
})
