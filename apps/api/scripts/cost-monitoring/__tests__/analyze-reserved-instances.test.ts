import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { mockClient } from 'aws-sdk-client-mock'
import {
  CostExplorerClient,
  GetReservationPurchaseRecommendationCommand,
} from '@aws-sdk/client-cost-explorer'

const costExplorerMock = mockClient(CostExplorerClient)

describe('analyze-reserved-instances', () => {
  const testOutputDir = path.join(__dirname, '../../../reports/ri-test')

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

  it('should generate RI analysis with cost-effective recommendations', async () => {
    // Mock AWS Cost Explorer RI recommendations
    costExplorerMock.on(GetReservationPurchaseRecommendationCommand).resolves({
      Recommendations: {
        RecommendationDetails: [
          {
            EstimatedMonthlySavingsAmount: '30.00',
            UpfrontCost: '0.00',
            RecurringStandardMonthlyCost: '170.00',
            RecommendedNumberOfInstancesToPurchase: '1',
            InstanceDetails: {
              RDSInstanceDetails: {
                InstanceType: 'db.t3.medium',
              },
            },
          },
        ],
      },
    })

    // Act: Run analyze-reserved-instances script
    const result = execSync(
      `tsx ${path.join(__dirname, '../analyze-reserved-instances.ts')} ${testOutputDir}`,
      { encoding: 'utf-8', env: { ...process.env, AWS_REGION: 'us-east-1' } },
    )

    // Assert: Check that reports were generated
    expect(fs.existsSync(path.join(testOutputDir, 'ri-analysis.json'))).toBe(true)
    expect(fs.existsSync(path.join(testOutputDir, 'ri-summary.txt'))).toBe(true)

    // Verify JSON report structure
    const jsonReport = JSON.parse(
      fs.readFileSync(path.join(testOutputDir, 'ri-analysis.json'), 'utf-8'),
    )

    expect(jsonReport.totalEstimatedMonthlySavings).toBeGreaterThan(0)
    expect(Array.isArray(jsonReport.recommendations)).toBe(true)
    expect(jsonReport.recommendations.length).toBeGreaterThan(0)
    expect(jsonReport.costEffective).toBe(true)
    expect(jsonReport.recommendation).toContain('Purchase Reserved Instances')

    // Verify text report
    const textReport = fs.readFileSync(path.join(testOutputDir, 'ri-summary.txt'), 'utf-8')
    expect(textReport).toContain('RESERVED INSTANCE ANALYSIS')
    expect(textReport).toContain('Estimated Monthly Savings')
  })

  it('should recommend against RI purchase when savings are minimal', async () => {
    // Mock AWS Cost Explorer with low savings recommendation
    costExplorerMock.on(GetReservationPurchaseRecommendationCommand).resolves({
      Recommendations: {
        RecommendationDetails: [
          {
            EstimatedMonthlySavingsAmount: '5.00', // Below $20 threshold
            UpfrontCost: '0.00',
            RecurringStandardMonthlyCost: '95.00',
            RecommendedNumberOfInstancesToPurchase: '1',
            InstanceDetails: {
              RDSInstanceDetails: {
                InstanceType: 'db.t3.micro',
              },
            },
          },
        ],
      },
    })

    // Act
    execSync(
      `tsx ${path.join(__dirname, '../analyze-reserved-instances.ts')} ${testOutputDir}`,
      { encoding: 'utf-8', env: { ...process.env, AWS_REGION: 'us-east-1' } },
    )

    // Assert: Recommendation should be to NOT purchase RI
    const jsonReport = JSON.parse(
      fs.readFileSync(path.join(testOutputDir, 'ri-analysis.json'), 'utf-8'),
    )

    expect(jsonReport.costEffective).toBe(false)
    expect(jsonReport.recommendation).toContain('Continue with On-Demand')
  })

  it('should handle no RI recommendations gracefully', async () => {
    // Mock AWS Cost Explorer with no recommendations
    costExplorerMock.on(GetReservationPurchaseRecommendationCommand).resolves({
      Recommendations: {
        RecommendationDetails: [],
      },
    })

    // Act
    execSync(
      `tsx ${path.join(__dirname, '../analyze-reserved-instances.ts')} ${testOutputDir}`,
      { encoding: 'utf-8', env: { ...process.env, AWS_REGION: 'us-east-1' } },
    )

    // Assert
    const jsonReport = JSON.parse(
      fs.readFileSync(path.join(testOutputDir, 'ri-analysis.json'), 'utf-8'),
    )

    expect(jsonReport.recommendations).toEqual([])
    expect(jsonReport.totalEstimatedMonthlySavings).toBe(0)
    expect(jsonReport.costEffective).toBe(false)
  })

  it('should calculate correct annual savings', async () => {
    // Mock recommendation with $50/month savings
    costExplorerMock.on(GetReservationPurchaseRecommendationCommand).resolves({
      Recommendations: {
        RecommendationDetails: [
          {
            EstimatedMonthlySavingsAmount: '50.00',
            UpfrontCost: '0.00',
            RecurringStandardMonthlyCost: '150.00',
            RecommendedNumberOfInstancesToPurchase: '1',
            InstanceDetails: {
              RDSInstanceDetails: {
                InstanceType: 'db.t3.large',
              },
            },
          },
        ],
      },
    })

    // Act
    execSync(
      `tsx ${path.join(__dirname, '../analyze-reserved-instances.ts')} ${testOutputDir}`,
      { encoding: 'utf-8', env: { ...process.env, AWS_REGION: 'us-east-1' } },
    )

    // Assert: Annual savings should be 12x monthly
    const jsonReport = JSON.parse(
      fs.readFileSync(path.join(testOutputDir, 'ri-analysis.json'), 'utf-8'),
    )

    expect(jsonReport.totalEstimatedMonthlySavings).toBe(50)
    expect(jsonReport.totalEstimatedAnnualSavings).toBe(600) // 50 * 12
  })
})
