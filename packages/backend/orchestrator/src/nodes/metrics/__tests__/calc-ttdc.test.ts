import { describe, expect, it, vi } from 'vitest'
import type { WorkflowEvent, WorkflowPhase, EventType } from '../collect-events.js'
import {
  extractTTDCDataPoints,
  calculateMedian,
  calculateVariance,
  identifyOutliers,
  calculateTTDCMetrics,
  TTDCDataPointSchema,
  TTDCMetricsSchema,
  TTDCResultSchema,
  TTDCConfigSchema,
  type TTDCDataPoint,
} from '../calc-ttdc.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

// Test fixtures
let eventIdCounter = 0

function createTestEvent(
  overrides: Partial<WorkflowEvent> & { storyId: string },
): WorkflowEvent {
  eventIdCounter++
  return {
    id: `EVT-TEST-${eventIdCounter.toString().padStart(4, '0')}`,
    type: 'completion' as EventType,
    storyId: overrides.storyId,
    timestamp: new Date().toISOString(),
    phase: 'seed' as WorkflowPhase,
    details: {
      description: 'Test event',
      actor: 'system',
      relatedIds: [],
      metadata: {},
    },
    sequenceNumber: eventIdCounter,
    ...overrides,
  }
}

function createCommitmentEvent(storyId: string, timestamp: string): WorkflowEvent {
  return createTestEvent({
    storyId,
    type: 'commitment',
    phase: 'commitment',
    timestamp,
    details: {
      description: 'Story committed',
      actor: 'system',
      relatedIds: [],
      metadata: {},
    },
  })
}

function createCompletionEvent(storyId: string, timestamp: string): WorkflowEvent {
  return createTestEvent({
    storyId,
    type: 'completion',
    phase: 'complete',
    timestamp,
    details: {
      description: 'Story completed',
      actor: 'system',
      relatedIds: [],
      metadata: {},
    },
  })
}

describe('extractTTDCDataPoints', () => {
  it('extracts data points from commitment-completion pairs', () => {
    const events: WorkflowEvent[] = [
      createCommitmentEvent('STORY-001', '2024-01-01T10:00:00.000Z'),
      createCompletionEvent('STORY-001', '2024-01-01T18:00:00.000Z'),
    ]

    const result = extractTTDCDataPoints(events)

    expect(result).toHaveLength(1)
    expect(result[0].storyId).toBe('STORY-001')
    expect(result[0].durationMs).toBe(8 * 60 * 60 * 1000) // 8 hours
    expect(result[0].durationHours).toBe(8)
  })

  it('handles multiple stories', () => {
    const events: WorkflowEvent[] = [
      createCommitmentEvent('STORY-001', '2024-01-01T10:00:00.000Z'),
      createCompletionEvent('STORY-001', '2024-01-01T12:00:00.000Z'),
      createCommitmentEvent('STORY-002', '2024-01-02T09:00:00.000Z'),
      createCompletionEvent('STORY-002', '2024-01-02T15:00:00.000Z'),
    ]

    const result = extractTTDCDataPoints(events)

    expect(result).toHaveLength(2)
    expect(result.find(dp => dp.storyId === 'STORY-001')?.durationHours).toBe(2)
    expect(result.find(dp => dp.storyId === 'STORY-002')?.durationHours).toBe(6)
  })

  it('ignores stories without commitment event', () => {
    const events: WorkflowEvent[] = [
      createCompletionEvent('STORY-001', '2024-01-01T18:00:00.000Z'),
    ]

    const result = extractTTDCDataPoints(events)

    expect(result).toHaveLength(0)
  })

  it('ignores stories without completion event', () => {
    const events: WorkflowEvent[] = [
      createCommitmentEvent('STORY-001', '2024-01-01T10:00:00.000Z'),
    ]

    const result = extractTTDCDataPoints(events)

    expect(result).toHaveLength(0)
  })

  it('ignores completion events not in complete phase', () => {
    const events: WorkflowEvent[] = [
      createCommitmentEvent('STORY-001', '2024-01-01T10:00:00.000Z'),
      createTestEvent({
        storyId: 'STORY-001',
        type: 'completion',
        phase: 'implementation', // Not in complete phase
        timestamp: '2024-01-01T18:00:00.000Z',
      }),
    ]

    const result = extractTTDCDataPoints(events)

    expect(result).toHaveLength(0)
  })

  it('ignores invalid time sequences (completion before commitment)', () => {
    const events: WorkflowEvent[] = [
      createCommitmentEvent('STORY-001', '2024-01-01T18:00:00.000Z'),
      createCompletionEvent('STORY-001', '2024-01-01T10:00:00.000Z'), // Before commitment
    ]

    const result = extractTTDCDataPoints(events)

    expect(result).toHaveLength(0)
  })

  it('filters by maxEventAgeMs when configured', () => {
    const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
    const recentDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago

    const events: WorkflowEvent[] = [
      createCommitmentEvent('STORY-OLD', oldDate.toISOString()),
      createCompletionEvent(
        'STORY-OLD',
        new Date(oldDate.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      ),
      createCommitmentEvent('STORY-NEW', recentDate.toISOString()),
      createCompletionEvent(
        'STORY-NEW',
        new Date(recentDate.getTime() + 4 * 60 * 60 * 1000).toISOString(),
      ),
    ]

    const result = extractTTDCDataPoints(events, {
      maxEventAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    expect(result).toHaveLength(1)
    expect(result[0].storyId).toBe('STORY-NEW')
  })

  it('sets isOutlier to false by default', () => {
    const events: WorkflowEvent[] = [
      createCommitmentEvent('STORY-001', '2024-01-01T10:00:00.000Z'),
      createCompletionEvent('STORY-001', '2024-01-01T18:00:00.000Z'),
    ]

    const result = extractTTDCDataPoints(events)

    expect(result[0].isOutlier).toBe(false)
  })
})

describe('calculateMedian', () => {
  it('returns null for empty array', () => {
    expect(calculateMedian([])).toBeNull()
  })

  it('returns the single value for array of length 1', () => {
    expect(calculateMedian([5])).toBe(5)
  })

  it('calculates median for odd-length array', () => {
    expect(calculateMedian([1, 3, 5])).toBe(3)
    expect(calculateMedian([1, 2, 3, 4, 5])).toBe(3)
    expect(calculateMedian([10, 20, 30, 40, 50, 60, 70])).toBe(40)
  })

  it('calculates median for even-length array', () => {
    expect(calculateMedian([1, 3])).toBe(2)
    expect(calculateMedian([1, 2, 3, 4])).toBe(2.5)
    expect(calculateMedian([10, 20, 30, 40])).toBe(25)
  })

  it('requires sorted input for correct result', () => {
    // Note: function assumes sorted input
    expect(calculateMedian([1, 2, 3, 4, 5])).toBe(3)
    // Unsorted gives unpredictable results (picks middle element)
    // [5, 1, 3, 2, 4] - middle element is 3 by chance
    // [9, 1, 2, 3, 4] - middle element is 2, not the true median (3)
    expect(calculateMedian([9, 1, 2, 3, 4])).toBe(2) // Wrong median, should be 3
    expect(calculateMedian([9, 1, 2, 3, 4])).not.toBe(3)
  })
})

describe('calculateVariance', () => {
  it('returns null for arrays with fewer than 2 elements', () => {
    expect(calculateVariance([], 0)).toBeNull()
    expect(calculateVariance([5], 5)).toBeNull()
  })

  it('calculates variance correctly', () => {
    // Values: [2, 4, 4, 4, 5, 5, 7, 9], Mean: 5
    // Squared diffs: 9, 1, 1, 1, 0, 0, 4, 16 = 32
    // Sample variance: 32 / 7 = 4.57...
    const values = [2, 4, 4, 4, 5, 5, 7, 9]
    const mean = 5
    const result = calculateVariance(values, mean)

    expect(result).toBeCloseTo(32 / 7, 2)
  })

  it('returns 0 for identical values', () => {
    const values = [5, 5, 5, 5]
    const mean = 5
    const result = calculateVariance(values, mean)

    expect(result).toBe(0)
  })

  it('uses sample variance (N-1 divisor)', () => {
    // Two values: 0 and 10, mean = 5
    // Squared diffs: 25 + 25 = 50
    // Sample variance: 50 / 1 = 50
    const values = [0, 10]
    const mean = 5
    const result = calculateVariance(values, mean)

    expect(result).toBe(50)
  })
})

describe('identifyOutliers', () => {
  it('returns data points unchanged when mean is null', () => {
    const dataPoints: TTDCDataPoint[] = [
      {
        storyId: 'STORY-001',
        commitmentTime: '2024-01-01T10:00:00.000Z',
        completionTime: '2024-01-01T18:00:00.000Z',
        durationMs: 8 * 60 * 60 * 1000,
        durationHours: 8,
        isOutlier: false,
      },
    ]

    const result = identifyOutliers(dataPoints, null, 1000)

    expect(result).toEqual(dataPoints)
  })

  it('returns data points unchanged when stdDev is null', () => {
    const dataPoints: TTDCDataPoint[] = [
      {
        storyId: 'STORY-001',
        commitmentTime: '2024-01-01T10:00:00.000Z',
        completionTime: '2024-01-01T18:00:00.000Z',
        durationMs: 8 * 60 * 60 * 1000,
        durationHours: 8,
        isOutlier: false,
      },
    ]

    const result = identifyOutliers(dataPoints, 8 * 60 * 60 * 1000, null)

    expect(result).toEqual(dataPoints)
  })

  it('returns data points unchanged when stdDev is 0', () => {
    const dataPoints: TTDCDataPoint[] = [
      {
        storyId: 'STORY-001',
        commitmentTime: '2024-01-01T10:00:00.000Z',
        completionTime: '2024-01-01T18:00:00.000Z',
        durationMs: 8 * 60 * 60 * 1000,
        durationHours: 8,
        isOutlier: false,
      },
    ]

    const result = identifyOutliers(dataPoints, 8 * 60 * 60 * 1000, 0)

    expect(result).toEqual(dataPoints)
  })

  it('identifies outliers beyond sigma threshold', () => {
    const mean = 8 * 60 * 60 * 1000 // 8 hours
    const stdDev = 1 * 60 * 60 * 1000 // 1 hour

    const dataPoints: TTDCDataPoint[] = [
      {
        storyId: 'NORMAL-001',
        commitmentTime: '2024-01-01T10:00:00.000Z',
        completionTime: '2024-01-01T18:00:00.000Z',
        durationMs: 8 * 60 * 60 * 1000, // exactly mean
        durationHours: 8,
        isOutlier: false,
      },
      {
        storyId: 'NORMAL-002',
        commitmentTime: '2024-01-02T10:00:00.000Z',
        completionTime: '2024-01-02T19:00:00.000Z',
        durationMs: 9 * 60 * 60 * 1000, // 1 sigma above
        durationHours: 9,
        isOutlier: false,
      },
      {
        storyId: 'OUTLIER-001',
        commitmentTime: '2024-01-03T10:00:00.000Z',
        completionTime: '2024-01-03T23:00:00.000Z',
        durationMs: 13 * 60 * 60 * 1000, // 5 sigma above (outlier)
        durationHours: 13,
        isOutlier: false,
      },
    ]

    const result = identifyOutliers(dataPoints, mean, stdDev, 2)

    expect(result[0].isOutlier).toBe(false)
    expect(result[1].isOutlier).toBe(false)
    expect(result[2].isOutlier).toBe(true)
  })

  it('respects custom sigma threshold', () => {
    const mean = 8 * 60 * 60 * 1000
    const stdDev = 1 * 60 * 60 * 1000

    const dataPoints: TTDCDataPoint[] = [
      {
        storyId: 'STORY-001',
        commitmentTime: '2024-01-01T10:00:00.000Z',
        completionTime: '2024-01-01T19:30:00.000Z',
        durationMs: 9.5 * 60 * 60 * 1000, // 1.5 sigma above
        durationHours: 9.5,
        isOutlier: false,
      },
    ]

    // With 2 sigma threshold, not an outlier
    const result2Sigma = identifyOutliers(dataPoints, mean, stdDev, 2)
    expect(result2Sigma[0].isOutlier).toBe(false)

    // With 1 sigma threshold, is an outlier
    const result1Sigma = identifyOutliers(dataPoints, mean, stdDev, 1)
    expect(result1Sigma[0].isOutlier).toBe(true)
  })
})

describe('calculateTTDCMetrics', () => {
  it('calculates comprehensive metrics from events', async () => {
    const events: WorkflowEvent[] = [
      createCommitmentEvent('STORY-001', '2024-01-01T10:00:00.000Z'),
      createCompletionEvent('STORY-001', '2024-01-01T14:00:00.000Z'), // 4 hours
      createCommitmentEvent('STORY-002', '2024-01-02T10:00:00.000Z'),
      createCompletionEvent('STORY-002', '2024-01-02T16:00:00.000Z'), // 6 hours
      createCommitmentEvent('STORY-003', '2024-01-03T10:00:00.000Z'),
      createCompletionEvent('STORY-003', '2024-01-03T18:00:00.000Z'), // 8 hours
    ]

    const result = await calculateTTDCMetrics('TEST', events)

    expect(result.success).toBe(true)
    expect(result.metrics.count).toBe(3)
    expect(result.metrics.medianHours).toBe(6)
    expect(result.metrics.meanHours).toBe(6)
    expect(result.metrics.minHours).toBe(4)
    expect(result.metrics.maxHours).toBe(8)
    expect(result.dataPoints).toHaveLength(3)
  })

  it('returns success with insights when insufficient data points', async () => {
    const events: WorkflowEvent[] = [
      createCommitmentEvent('STORY-001', '2024-01-01T10:00:00.000Z'),
      createCompletionEvent('STORY-001', '2024-01-01T14:00:00.000Z'),
    ]

    const result = await calculateTTDCMetrics('TEST', events, { minDataPoints: 3 })

    expect(result.success).toBe(true)
    expect(result.metrics.count).toBe(1)
    expect(result.metrics.medianMs).toBeNull()
    expect(result.insights).toContainEqual(expect.stringContaining('Insufficient data points'))
  })

  it('handles empty events array', async () => {
    const result = await calculateTTDCMetrics('TEST', [])

    expect(result.success).toBe(true)
    expect(result.metrics.count).toBe(0)
    expect(result.dataPoints).toHaveLength(0)
  })

  it('identifies and reports outliers', async () => {
    // Create data with a very clear outlier
    // All normal data points are 4 hours, the outlier is 100 hours
    const events: WorkflowEvent[] = [
      createCommitmentEvent('STORY-001', '2024-01-01T10:00:00.000Z'),
      createCompletionEvent('STORY-001', '2024-01-01T14:00:00.000Z'), // 4 hours
      createCommitmentEvent('STORY-002', '2024-01-02T10:00:00.000Z'),
      createCompletionEvent('STORY-002', '2024-01-02T14:00:00.000Z'), // 4 hours
      createCommitmentEvent('STORY-003', '2024-01-03T10:00:00.000Z'),
      createCompletionEvent('STORY-003', '2024-01-03T14:00:00.000Z'), // 4 hours
      createCommitmentEvent('STORY-004', '2024-01-04T10:00:00.000Z'),
      createCompletionEvent('STORY-004', '2024-01-04T14:00:00.000Z'), // 4 hours
      createCommitmentEvent('STORY-005', '2024-01-05T10:00:00.000Z'),
      createCompletionEvent('STORY-005', '2024-01-05T14:00:00.000Z'), // 4 hours
      createCommitmentEvent('STORY-OUTLIER', '2024-01-06T10:00:00.000Z'),
      createCompletionEvent('STORY-OUTLIER', '2024-01-10T14:00:00.000Z'), // 100 hours (extreme outlier)
    ]

    const result = await calculateTTDCMetrics('TEST', events)

    expect(result.success).toBe(true)
    expect(result.outlierCount).toBeGreaterThan(0)
    expect(result.outliers.some(dp => dp.storyId === 'STORY-OUTLIER')).toBe(true)
    expect(result.insights).toContainEqual(expect.stringContaining('outlier'))
  })

  it('excludes outliers from metrics when configured', async () => {
    // Create data with a very extreme outlier to ensure it gets detected
    const events: WorkflowEvent[] = [
      createCommitmentEvent('STORY-001', '2024-01-01T10:00:00.000Z'),
      createCompletionEvent('STORY-001', '2024-01-01T14:00:00.000Z'), // 4 hours
      createCommitmentEvent('STORY-002', '2024-01-02T10:00:00.000Z'),
      createCompletionEvent('STORY-002', '2024-01-02T14:00:00.000Z'), // 4 hours
      createCommitmentEvent('STORY-003', '2024-01-03T10:00:00.000Z'),
      createCompletionEvent('STORY-003', '2024-01-03T14:00:00.000Z'), // 4 hours
      createCommitmentEvent('STORY-004', '2024-01-04T10:00:00.000Z'),
      createCompletionEvent('STORY-004', '2024-01-04T14:00:00.000Z'), // 4 hours
      createCommitmentEvent('STORY-005', '2024-01-05T10:00:00.000Z'),
      createCompletionEvent('STORY-005', '2024-01-05T14:00:00.000Z'), // 4 hours
      createCommitmentEvent('STORY-OUTLIER', '2024-01-06T10:00:00.000Z'),
      createCompletionEvent('STORY-OUTLIER', '2024-01-10T14:00:00.000Z'), // 100 hours (extreme outlier)
    ]

    const resultWithOutliers = await calculateTTDCMetrics('TEST', events, {
      excludeOutliers: false,
    })
    const resultWithoutOutliers = await calculateTTDCMetrics('TEST', events, {
      excludeOutliers: true,
    })

    // Mean should be lower when outliers are excluded
    expect(resultWithoutOutliers.metrics.meanHours!).toBeLessThan(
      resultWithOutliers.metrics.meanHours!,
    )
    // Count should be lower when outliers are excluded
    expect(resultWithoutOutliers.metrics.count).toBeLessThan(resultWithOutliers.metrics.count)
  })

  it('calculates coefficient of variation for predictability', async () => {
    const events: WorkflowEvent[] = [
      createCommitmentEvent('STORY-001', '2024-01-01T10:00:00.000Z'),
      createCompletionEvent('STORY-001', '2024-01-01T14:00:00.000Z'),
      createCommitmentEvent('STORY-002', '2024-01-02T10:00:00.000Z'),
      createCompletionEvent('STORY-002', '2024-01-02T14:30:00.000Z'),
      createCommitmentEvent('STORY-003', '2024-01-03T10:00:00.000Z'),
      createCompletionEvent('STORY-003', '2024-01-03T13:30:00.000Z'),
    ]

    const result = await calculateTTDCMetrics('TEST', events)

    expect(result.metrics.coefficientOfVariation).not.toBeNull()
    expect(result.metrics.coefficientOfVariation).toBeGreaterThan(0)
    expect(result.metrics.coefficientOfVariation).toBeLessThan(1)
  })

  it('generates predictability insight for low CV', async () => {
    // Create very consistent data (all 4 hours)
    const events: WorkflowEvent[] = [
      createCommitmentEvent('STORY-001', '2024-01-01T10:00:00.000Z'),
      createCompletionEvent('STORY-001', '2024-01-01T14:00:00.000Z'),
      createCommitmentEvent('STORY-002', '2024-01-02T10:00:00.000Z'),
      createCompletionEvent('STORY-002', '2024-01-02T14:00:00.000Z'),
      createCommitmentEvent('STORY-003', '2024-01-03T10:00:00.000Z'),
      createCompletionEvent('STORY-003', '2024-01-03T14:01:00.000Z'), // Slight variation
    ]

    const result = await calculateTTDCMetrics('TEST', events)

    expect(result.insights).toContainEqual(expect.stringContaining('predictability'))
  })
})

describe('TTDCDataPointSchema validation', () => {
  it('validates correct data point', () => {
    const dataPoint = {
      storyId: 'STORY-001',
      commitmentTime: '2024-01-01T10:00:00.000Z',
      completionTime: '2024-01-01T18:00:00.000Z',
      durationMs: 28800000,
      durationHours: 8,
      isOutlier: false,
    }

    expect(() => TTDCDataPointSchema.parse(dataPoint)).not.toThrow()
  })

  it('rejects negative duration', () => {
    const dataPoint = {
      storyId: 'STORY-001',
      commitmentTime: '2024-01-01T10:00:00.000Z',
      completionTime: '2024-01-01T18:00:00.000Z',
      durationMs: -1000,
      durationHours: -0.28,
      isOutlier: false,
    }

    expect(() => TTDCDataPointSchema.parse(dataPoint)).toThrow()
  })

  it('rejects empty story ID', () => {
    const dataPoint = {
      storyId: '',
      commitmentTime: '2024-01-01T10:00:00.000Z',
      completionTime: '2024-01-01T18:00:00.000Z',
      durationMs: 28800000,
      durationHours: 8,
      isOutlier: false,
    }

    expect(() => TTDCDataPointSchema.parse(dataPoint)).toThrow()
  })

  it('rejects invalid datetime format', () => {
    const dataPoint = {
      storyId: 'STORY-001',
      commitmentTime: 'invalid-date',
      completionTime: '2024-01-01T18:00:00.000Z',
      durationMs: 28800000,
      durationHours: 8,
      isOutlier: false,
    }

    expect(() => TTDCDataPointSchema.parse(dataPoint)).toThrow()
  })
})

describe('TTDCMetricsSchema validation', () => {
  it('validates metrics with null values', () => {
    const metrics = {
      medianMs: null,
      medianHours: null,
      meanMs: null,
      meanHours: null,
      varianceMs: null,
      stdDevMs: null,
      stdDevHours: null,
      coefficientOfVariation: null,
      minMs: null,
      minHours: null,
      maxMs: null,
      maxHours: null,
      count: 0,
      calculatedAt: new Date().toISOString(),
    }

    expect(() => TTDCMetricsSchema.parse(metrics)).not.toThrow()
  })

  it('validates metrics with values', () => {
    const metrics = {
      medianMs: 14400000,
      medianHours: 4,
      meanMs: 18000000,
      meanHours: 5,
      varianceMs: 3600000000,
      stdDevMs: 60000,
      stdDevHours: 0.02,
      coefficientOfVariation: 0.33,
      minMs: 7200000,
      minHours: 2,
      maxMs: 28800000,
      maxHours: 8,
      count: 10,
      calculatedAt: new Date().toISOString(),
    }

    expect(() => TTDCMetricsSchema.parse(metrics)).not.toThrow()
  })

  it('rejects negative count', () => {
    const metrics = {
      medianMs: null,
      medianHours: null,
      meanMs: null,
      meanHours: null,
      varianceMs: null,
      stdDevMs: null,
      stdDevHours: null,
      coefficientOfVariation: null,
      minMs: null,
      minHours: null,
      maxMs: null,
      maxHours: null,
      count: -1,
      calculatedAt: new Date().toISOString(),
    }

    expect(() => TTDCMetricsSchema.parse(metrics)).toThrow()
  })
})

describe('TTDCResultSchema validation', () => {
  it('validates successful result', () => {
    const result = {
      storyId: 'FLOW-036',
      analyzedAt: new Date().toISOString(),
      metrics: {
        medianMs: 14400000,
        medianHours: 4,
        meanMs: 18000000,
        meanHours: 5,
        varianceMs: 3600000000,
        stdDevMs: 60000,
        stdDevHours: 0.02,
        coefficientOfVariation: 0.33,
        minMs: 7200000,
        minHours: 2,
        maxMs: 28800000,
        maxHours: 8,
        count: 5,
        calculatedAt: new Date().toISOString(),
      },
      dataPoints: [
        {
          storyId: 'STORY-001',
          commitmentTime: '2024-01-01T10:00:00.000Z',
          completionTime: '2024-01-01T14:00:00.000Z',
          durationMs: 14400000,
          durationHours: 4,
          isOutlier: false,
        },
      ],
      outliers: [],
      outlierCount: 0,
      insights: ['High predictability'],
      success: true,
    }

    expect(() => TTDCResultSchema.parse(result)).not.toThrow()
  })

  it('validates failed result', () => {
    const result = {
      storyId: 'FLOW-036',
      analyzedAt: new Date().toISOString(),
      metrics: {
        medianMs: null,
        medianHours: null,
        meanMs: null,
        meanHours: null,
        varianceMs: null,
        stdDevMs: null,
        stdDevHours: null,
        coefficientOfVariation: null,
        minMs: null,
        minHours: null,
        maxMs: null,
        maxHours: null,
        count: 0,
        calculatedAt: new Date().toISOString(),
      },
      dataPoints: [],
      outliers: [],
      outlierCount: 0,
      insights: ['No data available'],
      success: false,
      error: 'No events provided',
    }

    expect(() => TTDCResultSchema.parse(result)).not.toThrow()
  })
})

describe('TTDCConfigSchema validation', () => {
  it('applies default values', () => {
    const config = TTDCConfigSchema.parse({})

    expect(config.minDataPoints).toBe(3)
    expect(config.outlierSigmaThreshold).toBe(2)
    expect(config.excludeOutliers).toBe(false)
    expect(config.maxEventAgeMs).toBe(0)
  })

  it('validates custom config', () => {
    const config = {
      minDataPoints: 5,
      outlierSigmaThreshold: 3,
      excludeOutliers: true,
      maxEventAgeMs: 7 * 24 * 60 * 60 * 1000,
    }

    const parsed = TTDCConfigSchema.parse(config)

    expect(parsed.minDataPoints).toBe(5)
    expect(parsed.outlierSigmaThreshold).toBe(3)
    expect(parsed.excludeOutliers).toBe(true)
    expect(parsed.maxEventAgeMs).toBe(7 * 24 * 60 * 60 * 1000)
  })

  it('rejects non-positive minDataPoints', () => {
    expect(() => TTDCConfigSchema.parse({ minDataPoints: 0 })).toThrow()
    expect(() => TTDCConfigSchema.parse({ minDataPoints: -1 })).toThrow()
  })

  it('rejects non-positive outlierSigmaThreshold', () => {
    expect(() => TTDCConfigSchema.parse({ outlierSigmaThreshold: 0 })).toThrow()
    expect(() => TTDCConfigSchema.parse({ outlierSigmaThreshold: -1 })).toThrow()
  })

  it('rejects negative maxEventAgeMs', () => {
    expect(() => TTDCConfigSchema.parse({ maxEventAgeMs: -1 })).toThrow()
  })
})
