/**
 * Tests for Cost Explorer API Client
 * Story 1.4: Cost Monitoring and Budget Alerts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer'
import { getCostByProject, getCostByComponent, getCostByFunction } from '../cost-explorer'

// Mock the Cost Explorer client
const costExplorerMock = mockClient(CostExplorerClient)

describe('Cost Explorer API Client', () => {
  beforeEach(() => {
    costExplorerMock.reset()
  })

  describe('getCostByProject', () => {
    it('should fetch cost data for UserMetrics project', async () => {
      const mockResponse = {
        ResultsByTime: [
          {
            TimePeriod: {
              Start: '2025-11-01',
              End: '2025-11-02',
            },
            Total: {
              BlendedCost: {
                Amount: '25.50',
                Unit: 'USD',
              },
            },
          },
        ],
      }

      costExplorerMock.on(GetCostAndUsageCommand).resolves(mockResponse)

      const result = await getCostByProject('2025-11-01', '2025-11-30', 'DAILY')

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        timePeriod: {
          start: '2025-11-01',
          end: '2025-11-02',
        },
        total: {
          blendedCost: {
            amount: '25.50',
            unit: 'USD',
          },
        },
      })

      // Verify the command was called with correct parameters
      expect(costExplorerMock.commandCalls(GetCostAndUsageCommand)).toHaveLength(1)
      const call = costExplorerMock.commandCalls(GetCostAndUsageCommand)[0]
      expect(call.args[0].input).toMatchObject({
        TimePeriod: {
          Start: '2025-11-01',
          End: '2025-11-30',
        },
        Granularity: 'DAILY',
        Metrics: ['BlendedCost'],
        Filter: {
          Tags: {
            Key: 'Project',
            Values: ['UserMetrics'],
            MatchOptions: ['EQUALS'],
          },
        },
      })
    })

    it('should handle empty response', async () => {
      costExplorerMock.on(GetCostAndUsageCommand).resolves({})

      const result = await getCostByProject('2025-11-01', '2025-11-30')

      expect(result).toEqual([])
    })

    it('should use MONTHLY granularity by default', async () => {
      costExplorerMock.on(GetCostAndUsageCommand).resolves({ ResultsByTime: [] })

      await getCostByProject('2025-11-01', '2025-11-30')

      const call = costExplorerMock.commandCalls(GetCostAndUsageCommand)[0]
      expect(call.args[0].input.Granularity).toBe('MONTHLY')
    })
  })

  describe('getCostByComponent', () => {
    it('should fetch cost data grouped by Component tag', async () => {
      const mockResponse = {
        ResultsByTime: [
          {
            TimePeriod: {
              Start: '2025-11-01',
              End: '2025-11-30',
            },
            Total: {
              BlendedCost: {
                Amount: '100.00',
                Unit: 'USD',
              },
            },
            Groups: [
              {
                Keys: ['OpenReplay'],
                Metrics: {
                  BlendedCost: {
                    Amount: '45.00',
                    Unit: 'USD',
                  },
                },
              },
              {
                Keys: ['Umami'],
                Metrics: {
                  BlendedCost: {
                    Amount: '35.00',
                    Unit: 'USD',
                  },
                },
              },
            ],
          },
        ],
      }

      costExplorerMock.on(GetCostAndUsageCommand).resolves(mockResponse)

      const result = await getCostByComponent('2025-11-01', '2025-11-30')

      expect(result).toHaveLength(1)
      expect(result[0].groups).toHaveLength(2)
      expect(result[0].groups![0]).toEqual({
        keys: ['OpenReplay'],
        metrics: {
          BlendedCost: {
            amount: '45.00',
            unit: 'USD',
          },
        },
      })

      // Verify GroupBy parameter
      const call = costExplorerMock.commandCalls(GetCostAndUsageCommand)[0]
      expect(call.args[0].input.GroupBy).toEqual([
        {
          Type: 'TAG',
          Key: 'Component',
        },
      ])
    })
  })

  describe('getCostByFunction', () => {
    it('should fetch cost data grouped by Function tag', async () => {
      const mockResponse = {
        ResultsByTime: [
          {
            TimePeriod: {
              Start: '2025-11-01',
              End: '2025-11-30',
            },
            Total: {
              BlendedCost: {
                Amount: '100.00',
                Unit: 'USD',
              },
            },
            Groups: [
              {
                Keys: ['SessionReplay'],
                Metrics: {
                  BlendedCost: {
                    Amount: '50.00',
                    Unit: 'USD',
                  },
                },
              },
            ],
          },
        ],
      }

      costExplorerMock.on(GetCostAndUsageCommand).resolves(mockResponse)

      const result = await getCostByFunction('2025-11-01', '2025-11-30')

      expect(result[0].groups![0]).toEqual({
        keys: ['SessionReplay'],
        metrics: {
          BlendedCost: {
            amount: '50.00',
            unit: 'USD',
          },
        },
      })

      // Verify GroupBy parameter
      const call = costExplorerMock.commandCalls(GetCostAndUsageCommand)[0]
      expect(call.args[0].input.GroupBy).toEqual([
        {
          Type: 'TAG',
          Key: 'Function',
        },
      ])
    })
  })
})
