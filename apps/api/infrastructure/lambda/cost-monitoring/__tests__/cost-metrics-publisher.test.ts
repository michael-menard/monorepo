/**
 * Tests for Cost Metrics Publisher Lambda Function
 * Story 1.4: Cost Monitoring and Budget Alerts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch'
import { ScheduledEvent, Context } from 'aws-lambda'
import { handler } from '../cost-metrics-publisher'

// Mock the Cost Explorer utilities
vi.mock('../../../lib/cost-monitoring/cost-explorer', () => ({
  getCostByProject: vi.fn(),
  getCostByComponent: vi.fn(),
  getCostByFunction: vi.fn(),
}))

import { getCostByProject, getCostByComponent, getCostByFunction } from '@/infrastructure/monitoring/cost/cost-explorer'

// Mock CloudWatch client
const cloudWatchMock = mockClient(CloudWatchClient)

describe('Cost Metrics Publisher Lambda', () => {
  beforeEach(() => {
    cloudWatchMock.reset()
    vi.clearAllMocks()
    
    // Mock environment variables
    process.env.AWS_REGION = 'us-east-1'
    process.env.STAGE = 'dev'
  })

  const mockScheduledEvent: ScheduledEvent = {
    id: 'test-event-id',
    'detail-type': 'Scheduled Event',
    source: 'aws.events',
    account: '123456789012',
    time: '2025-11-23T06:00:00Z',
    region: 'us-east-1',
    detail: {},
    version: '0',
    resources: ['arn:aws:events:us-east-1:123456789012:rule/test-rule'],
  }

  const mockContext: Context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'cost-metrics-publisher',
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:cost-metrics-publisher',
    memoryLimitInMB: '128',
    awsRequestId: 'test-request-id',
    logGroupName: '/aws/lambda/cost-metrics-publisher',
    logStreamName: 'test-stream',
    getRemainingTimeInMillis: () => 30000,
    done: vi.fn(),
    fail: vi.fn(),
    succeed: vi.fn(),
  }

  it('should publish cost metrics successfully', async () => {
    // Mock cost data responses
    const mockProjectCosts = [
      {
        timePeriod: { start: '2025-11-22', end: '2025-11-23' },
        total: { blendedCost: { amount: '25.50', unit: 'USD' } },
      },
    ]

    const mockComponentCosts = [
      {
        timePeriod: { start: '2025-11-22', end: '2025-11-23' },
        total: { blendedCost: { amount: '25.50', unit: 'USD' } },
        groups: [
          {
            keys: ['OpenReplay'],
            metrics: { BlendedCost: { amount: '15.00', unit: 'USD' } },
          },
          {
            keys: ['Umami'],
            metrics: { BlendedCost: { amount: '10.50', unit: 'USD' } },
          },
        ],
      },
    ]

    const mockFunctionCosts = [
      {
        timePeriod: { start: '2025-11-22', end: '2025-11-23' },
        total: { blendedCost: { amount: '25.50', unit: 'USD' } },
        groups: [
          {
            keys: ['SessionReplay'],
            metrics: { BlendedCost: { amount: '15.00', unit: 'USD' } },
          },
          {
            keys: ['Analytics'],
            metrics: { BlendedCost: { amount: '10.50', unit: 'USD' } },
          },
        ],
      },
    ]

    // Setup mocks
    vi.mocked(getCostByProject).mockResolvedValue(mockProjectCosts)
    vi.mocked(getCostByComponent).mockResolvedValue(mockComponentCosts)
    vi.mocked(getCostByFunction).mockResolvedValue(mockFunctionCosts)
    
    cloudWatchMock.on(PutMetricDataCommand).resolves({})

    // Execute handler
    const result = await handler(mockScheduledEvent, mockContext)

    // Verify response
    expect(result.statusCode).toBe(200)
    expect(JSON.parse(result.body)).toMatchObject({
      message: 'Cost metrics published successfully',
      metricsPublished: {
        totalCost: true,
        componentCosts: 1,
        functionCosts: 1,
      },
    })

    // Verify Cost Explorer calls
    expect(getCostByProject).toHaveBeenCalledWith(
      expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
      expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
      'DAILY'
    )
    expect(getCostByComponent).toHaveBeenCalledWith(
      expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
      expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
      'DAILY'
    )
    expect(getCostByFunction).toHaveBeenCalledWith(
      expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
      expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
      'DAILY'
    )

    // Verify CloudWatch metrics were published
    expect(cloudWatchMock.commandCalls(PutMetricDataCommand).length).toBeGreaterThan(0)
    
    // Check total cost metric
    const totalCostCall = cloudWatchMock.commandCalls(PutMetricDataCommand).find(call => 
      call.args[0].input.MetricData?.[0]?.MetricName === 'TotalDailyCost'
    )
    expect(totalCostCall).toBeDefined()
    expect(totalCostCall?.args[0].input.MetricData?.[0]?.Value).toBe(25.50)
  })

  it('should handle empty cost data gracefully', async () => {
    // Mock empty responses
    vi.mocked(getCostByProject).mockResolvedValue([])
    vi.mocked(getCostByComponent).mockResolvedValue([])
    vi.mocked(getCostByFunction).mockResolvedValue([])
    
    cloudWatchMock.on(PutMetricDataCommand).resolves({})

    // Execute handler
    const result = await handler(mockScheduledEvent, mockContext)

    // Verify response
    expect(result.statusCode).toBe(200)
    expect(JSON.parse(result.body)).toMatchObject({
      message: 'Cost metrics published successfully',
      metricsPublished: {
        totalCost: false,
        componentCosts: 0,
        functionCosts: 0,
      },
    })
  })

  it('should publish error metrics when Cost Explorer fails', async () => {
    // Mock Cost Explorer error
    const error = new Error('Cost Explorer API error')
    vi.mocked(getCostByProject).mockRejectedValue(error)
    vi.mocked(getCostByComponent).mockRejectedValue(error)
    vi.mocked(getCostByFunction).mockRejectedValue(error)
    
    cloudWatchMock.on(PutMetricDataCommand).resolves({})

    // Execute handler and expect it to throw
    await expect(handler(mockScheduledEvent, mockContext)).rejects.toThrow('Cost Explorer API error')

    // Verify error metric was published
    const errorMetricCall = cloudWatchMock.commandCalls(PutMetricDataCommand).find(call => 
      call.args[0].input.MetricData?.[0]?.MetricName === 'PublishingErrors'
    )
    expect(errorMetricCall).toBeDefined()
    expect(errorMetricCall?.args[0].input.MetricData?.[0]?.Value).toBe(1)
  })

  it('should calculate budget utilization correctly', async () => {
    // Mock cost data with specific amount
    const mockProjectCosts = [
      {
        timePeriod: { start: '2025-11-22', end: '2025-11-23' },
        total: { blendedCost: { amount: '5.00', unit: 'USD' } }, // $5 daily cost
      },
    ]

    vi.mocked(getCostByProject).mockResolvedValue(mockProjectCosts)
    vi.mocked(getCostByComponent).mockResolvedValue([])
    vi.mocked(getCostByFunction).mockResolvedValue([])
    
    cloudWatchMock.on(PutMetricDataCommand).resolves({})

    // Execute handler
    await handler(mockScheduledEvent, mockContext)

    // Find budget utilization metric
    const budgetUtilizationCall = cloudWatchMock.commandCalls(PutMetricDataCommand).find(call => 
      call.args[0].input.MetricData?.[0]?.MetricName === 'DailyBudgetUtilization'
    )
    
    expect(budgetUtilizationCall).toBeDefined()
    
    // Budget utilization should be (5 / (150/30)) * 100 = 100%
    const expectedUtilization = (5 / (150 / 30)) * 100
    expect(budgetUtilizationCall?.args[0].input.MetricData?.[0]?.Value).toBe(expectedUtilization)
  })
})
