import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { mockClient } from 'aws-sdk-client-mock'
import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer'

const costExplorerMock = mockClient(CostExplorerClient)

describe('generate-cost-report', () => {
  const testOutputDir = path.join(__dirname, '../../../reports/cost-test')

  beforeEach(() => {
    // Reset mocks
    costExplorerMock.reset()

    // Create test output directory
    fs.mkdirSync(testOutputDir, { recursive: true })
  })

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true })
    }
  })

  it('should generate cost report with valid AWS Cost Explorer data', async () => {
    // Mock AWS Cost Explorer response
    costExplorerMock.on(GetCostAndUsageCommand).resolves({
      ResultsByTime: [
        {
          TimePeriod: {
            Start: '2025-01-01',
            End: '2025-01-31',
          },
          Groups: [
            {
              Keys: ['AWS Lambda'],
              Metrics: {
                UnblendedCost: {
                  Amount: '180.50',
                  Unit: 'USD',
                },
              },
            },
            {
              Keys: ['Amazon RDS'],
              Metrics: {
                UnblendedCost: {
                  Amount: '200.00',
                  Unit: 'USD',
                },
              },
            },
            {
              Keys: ['Amazon ElastiCache'],
              Metrics: {
                UnblendedCost: {
                  Amount: '100.00',
                  Unit: 'USD',
                },
              },
            },
          ],
          Total: {
            UnblendedCost: {
              Amount: '720.00',
              Unit: 'USD',
            },
          },
        },
      ],
    })

    // Act: Run generate-cost-report script
    const result = execSync(
      `tsx ${path.join(__dirname, '../generate-cost-report.ts')} 30 ${testOutputDir}`,
      { encoding: 'utf-8', env: { ...process.env, AWS_REGION: 'us-east-1' } },
    )

    // Assert: Check that reports were generated
    expect(fs.existsSync(path.join(testOutputDir, 'cost-report.json'))).toBe(true)
    expect(fs.existsSync(path.join(testOutputDir, 'cost-summary.txt'))).toBe(true)

    // Verify JSON report structure
    const jsonReport = JSON.parse(
      fs.readFileSync(path.join(testOutputDir, 'cost-report.json'), 'utf-8'),
    )

    expect(jsonReport.totalCost).toBeGreaterThan(0)
    expect(Array.isArray(jsonReport.costByService)).toBe(true)
    expect(jsonReport.costByService.length).toBeGreaterThan(0)
    expect(jsonReport.startDate).toBeDefined()
    expect(jsonReport.endDate).toBeDefined()

    // Verify text report was generated
    const textReport = fs.readFileSync(path.join(testOutputDir, 'cost-summary.txt'), 'utf-8')
    expect(textReport).toContain('AWS COST EXPLORER REPORT')
    expect(textReport).toContain('Total Cost')
    expect(textReport).toContain('COST BY SERVICE')
  })

  it('should handle empty cost data gracefully', async () => {
    // Mock empty AWS Cost Explorer response
    costExplorerMock.on(GetCostAndUsageCommand).resolves({
      ResultsByTime: [
        {
          TimePeriod: {
            Start: '2025-01-01',
            End: '2025-01-31',
          },
          Groups: [],
          Total: {
            UnblendedCost: {
              Amount: '0.00',
              Unit: 'USD',
            },
          },
        },
      ],
    })

    // Act: Run generate-cost-report script
    const result = execSync(
      `tsx ${path.join(__dirname, '../generate-cost-report.ts')} 30 ${testOutputDir}`,
      { encoding: 'utf-8', env: { ...process.env, AWS_REGION: 'us-east-1' } },
    )

    // Assert: Report generated with zero costs
    const jsonReport = JSON.parse(
      fs.readFileSync(path.join(testOutputDir, 'cost-report.json'), 'utf-8'),
    )

    expect(jsonReport.totalCost).toBe(0)
    expect(jsonReport.costByService).toEqual([])
  })

  it('should sort services by cost descending', async () => {
    // Mock AWS Cost Explorer response with unsorted services
    costExplorerMock.on(GetCostAndUsageCommand).resolves({
      ResultsByTime: [
        {
          TimePeriod: {
            Start: '2025-01-01',
            End: '2025-01-31',
          },
          Groups: [
            {
              Keys: ['Amazon S3'],
              Metrics: {
                UnblendedCost: {
                  Amount: '50.00',
                  Unit: 'USD',
                },
              },
            },
            {
              Keys: ['Amazon RDS'],
              Metrics: {
                UnblendedCost: {
                  Amount: '200.00',
                  Unit: 'USD',
                },
              },
            },
            {
              Keys: ['AWS Lambda'],
              Metrics: {
                UnblendedCost: {
                  Amount: '180.00',
                  Unit: 'USD',
                },
              },
            },
          ],
        },
      ],
    })

    // Act
    execSync(
      `tsx ${path.join(__dirname, '../generate-cost-report.ts')} 30 ${testOutputDir}`,
      { encoding: 'utf-8', env: { ...process.env, AWS_REGION: 'us-east-1' } },
    )

    // Assert: Services sorted by cost descending
    const jsonReport = JSON.parse(
      fs.readFileSync(path.join(testOutputDir, 'cost-report.json'), 'utf-8'),
    )

    expect(jsonReport.costByService[0].service).toBe('Amazon RDS')
    expect(jsonReport.costByService[0].amount).toBe(200)
    expect(jsonReport.costByService[1].service).toBe('AWS Lambda')
    expect(jsonReport.costByService[1].amount).toBe(180)
    expect(jsonReport.costByService[2].service).toBe('Amazon S3')
    expect(jsonReport.costByService[2].amount).toBe(50)
  })
})
