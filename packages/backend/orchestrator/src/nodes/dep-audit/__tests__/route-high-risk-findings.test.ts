/**
 * Unit tests for routeHighRiskFindings()
 *
 * Story: APIP-4030 - Dependency Auditor
 * Covers: HP-6 (high severity → blocked queue), EC-6 (deduplication), ED-2, ED-5
 */

import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  routeHighRiskFindings,
  createStubBlockedQueueClient,
  type RoutingFinding,
} from '../route-high-risk-findings.js'
import { logger } from '@repo/logger'

vi.mock('@repo/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}))

const HIGH_SEVERITY_FINDING: RoutingFinding = {
  packageName: 'lodash',
  version: '4.17.20',
  findingType: 'vulnerability',
  severity: 'high',
  details: { cve: 'CVE-2021-12345', url: 'https://github.com/advisories/GHSA-...' },
}

const LOW_SEVERITY_FINDING: RoutingFinding = {
  packageName: 'moment',
  findingType: 'bundle_bloat',
  severity: 'info',
  details: { estimatedBytes: 50000 },
}

describe('routeHighRiskFindings', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('HP-6: creates blocked queue item for high-severity finding', async () => {
    const stubClient = createStubBlockedQueueClient()

    const result = await routeHighRiskFindings([HIGH_SEVERITY_FINDING], {
      storyId: 'APIP-4030',
      blockingThreshold: 'high',
      queueClient: stubClient,
    })

    expect(result.routed).toBe(1)
    expect(result.belowThreshold).toBe(0)
    const items = stubClient.getCreatedItems()
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      storyId: 'APIP-4030',
      packageName: 'lodash',
      findingType: 'vulnerability',
      severity: 'high',
    })
  })

  it('ED-2: no blocked queue items for below-threshold findings', async () => {
    const stubClient = createStubBlockedQueueClient()

    const result = await routeHighRiskFindings([LOW_SEVERITY_FINDING], {
      storyId: 'APIP-4030',
      blockingThreshold: 'high',
      queueClient: stubClient,
    })

    expect(result.routed).toBe(0)
    expect(result.belowThreshold).toBe(1)
    expect(stubClient.getCreatedItems()).toHaveLength(0)
  })

  it('EC-6: deduplication prevents duplicate item creation', async () => {
    const stubClient = createStubBlockedQueueClient()
    const seenKeys = new Set<string>()

    // First call routes the item
    const result1 = await routeHighRiskFindings([HIGH_SEVERITY_FINDING], {
      storyId: 'APIP-4030',
      blockingThreshold: 'high',
      queueClient: stubClient,
      seenKeys,
    })

    // Second call with same finding should be deduplicated
    const result2 = await routeHighRiskFindings([HIGH_SEVERITY_FINDING], {
      storyId: 'APIP-4030',
      blockingThreshold: 'high',
      queueClient: stubClient,
      seenKeys, // same Set
    })

    expect(result1.routed).toBe(1)
    expect(result2.routed).toBe(0)
    expect(result2.deduplicated).toBe(1)
    // blocked_queue_items_created = 1 total, not 2
    expect(stubClient.getCreatedItems()).toHaveLength(1)
  })

  it('EC-6: different dedup key creates new item', async () => {
    const stubClient = createStubBlockedQueueClient()
    const seenKeys = new Set<string>()

    await routeHighRiskFindings([HIGH_SEVERITY_FINDING], {
      storyId: 'APIP-4030',
      blockingThreshold: 'high',
      queueClient: stubClient,
      seenKeys,
    })

    // Different finding type = different key
    const differentFinding: RoutingFinding = {
      ...HIGH_SEVERITY_FINDING,
      findingType: 'overlap',
    }
    await routeHighRiskFindings([differentFinding], {
      storyId: 'APIP-4030',
      blockingThreshold: 'high',
      queueClient: stubClient,
      seenKeys,
    })

    expect(stubClient.getCreatedItems()).toHaveLength(2)
  })

  it('ED-5: blocked queue item includes human-readable context', async () => {
    const stubClient = createStubBlockedQueueClient()

    await routeHighRiskFindings([HIGH_SEVERITY_FINDING], {
      storyId: 'APIP-4030',
      queueClient: stubClient,
    })

    const item = stubClient.getCreatedItems()[0]
    expect(item).toMatchObject({
      storyId: 'APIP-4030',
      packageName: 'lodash',
      version: '4.17.20',
      findingType: 'vulnerability',
      severity: 'high',
    })
    // Has cve and npmLink
    expect(item?.cve).toBe('CVE-2021-12345')
    expect(item?.npmLink).toBeDefined()
  })

  it('routes critical findings when threshold is high', async () => {
    const stubClient = createStubBlockedQueueClient()
    const criticalFinding: RoutingFinding = {
      packageName: 'express',
      findingType: 'vulnerability',
      severity: 'critical',
      details: {},
    }

    const result = await routeHighRiskFindings([criticalFinding], {
      storyId: 'APIP-4030',
      blockingThreshold: 'high',
      queueClient: stubClient,
    })

    expect(result.routed).toBe(1)
  })

  it('handles empty findings array', async () => {
    const stubClient = createStubBlockedQueueClient()

    const result = await routeHighRiskFindings([], {
      storyId: 'APIP-4030',
      queueClient: stubClient,
    })

    expect(result.processed).toBe(0)
    expect(result.routed).toBe(0)
  })

  it('createStubBlockedQueueClient logs warning via @repo/logger', async () => {
    const stubClient = createStubBlockedQueueClient()
    const item = {
      storyId: 'APIP-4030',
      packageName: 'lodash',
      findingType: 'vulnerability' as const,
      severity: 'high',
      deduplicationKey: 'APIP-4030:lodash:vulnerability',
    }

    await stubClient.create(item)

    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      expect.stringContaining('APIP-2010 not yet available'),
      expect.any(Object),
    )
  })
})
