import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

describe('compare-baselines', () => {
  const testResultsDir = path.join(__dirname, '../../../tests/performance/results-test')
  const testCurrentPath = path.join(testResultsDir, 'current-metrics.json')
  const testBaselinePath = path.join(testResultsDir, 'baseline-metrics.json')
  const testComparisonPath = path.join(testResultsDir, 'comparison-report.json')

  beforeEach(() => {
    // Create test directory
    fs.mkdirSync(testResultsDir, { recursive: true })
  })

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testResultsDir)) {
      fs.rmSync(testResultsDir, { recursive: true })
    }
  })

  it('should compare current metrics with baseline successfully', () => {
    // Arrange: Create baseline and current metrics
    const baseline = {
      testDate: '2025-01-01T00:00:00.000Z',
      environment: 'ECS Production',
      totalRequests: 100000,
      successfulRequests: 99500,
      failedRequests: 500,
      requestRate: 166.67,
      responseTime: {
        median: 250,
        p95: 450,
        p99: 800,
      },
      errorRate: 0.5,
      successRate: 99.5,
      cacheHitRate: 85,
    }

    const current = {
      testDate: '2025-01-15T00:00:00.000Z',
      environment: 'SST Production',
      totalRequests: 90000,
      successfulRequests: 89550,
      failedRequests: 100,
      requestRate: 150,
      responseTime: {
        median: 200,
        p95: 380,
        p99: 650,
      },
      errorRate: 0.11,
      successRate: 99.44,
      cacheHitRate: 88,
    }

    fs.writeFileSync(testBaselinePath, JSON.stringify(baseline, null, 2))
    fs.writeFileSync(testCurrentPath, JSON.stringify(current, null, 2))

    // Act
    execSync(
      `tsx ${path.join(__dirname, '../compare-baselines.ts')} ${testCurrentPath} ${testBaselinePath}`,
      { encoding: 'utf-8' }
    )

    // Assert: Check comparison report was generated
    expect(fs.existsSync(testComparisonPath)).toBe(true)

    const report = JSON.parse(fs.readFileSync(testComparisonPath, 'utf-8'))

    // Verify structure
    expect(report.baseline).toBeDefined()
    expect(report.current).toBeDefined()
    expect(report.comparisons).toBeDefined()
    expect(report.summary).toBeDefined()

    // Verify baseline info
    expect(report.baseline.environment).toBe('ECS Production')
    expect(report.current.environment).toBe('SST Production')

    // Verify comparisons
    expect(Array.isArray(report.comparisons)).toBe(true)
    expect(report.comparisons.length).toBeGreaterThan(0)

    // Check specific comparison
    const p95Comparison = report.comparisons.find((c: any) => c.metric === 'Response Time (p95)')
    expect(p95Comparison).toBeDefined()
    expect(p95Comparison.baseline).toBe(450)
    expect(p95Comparison.current).toBe(380)
    expect(p95Comparison.improved).toBe(true)

    // Verify summary
    expect(report.summary.improvements).toBeGreaterThan(0)
  })

  it('should detect performance improvements correctly', () => {
    // Arrange: Current metrics better than baseline
    const baseline = {
      testDate: '2025-01-01T00:00:00.000Z',
      environment: 'ECS Production',
      totalRequests: 100000,
      successfulRequests: 99000,
      failedRequests: 1000,
      requestRate: 100,
      responseTime: {
        median: 300,
        p95: 500,
        p99: 900,
      },
      errorRate: 1.0,
      successRate: 99.0,
      cacheHitRate: 75,
    }

    const current = {
      testDate: '2025-01-15T00:00:00.000Z',
      environment: 'SST Production',
      totalRequests: 100000,
      successfulRequests: 99800,
      failedRequests: 200,
      requestRate: 150,
      responseTime: {
        median: 180,
        p95: 350,
        p99: 600,
      },
      errorRate: 0.2,
      successRate: 99.8,
      cacheHitRate: 90,
    }

    fs.writeFileSync(testBaselinePath, JSON.stringify(baseline, null, 2))
    fs.writeFileSync(testCurrentPath, JSON.stringify(current, null, 2))

    // Act
    execSync(
      `tsx ${path.join(__dirname, '../compare-baselines.ts')} ${testCurrentPath} ${testBaselinePath}`,
      { encoding: 'utf-8' }
    )

    // Assert
    const report = JSON.parse(fs.readFileSync(testComparisonPath, 'utf-8'))

    // All metrics should show improvement
    const allImproved = report.comparisons.every((c: any) => c.improved === true)
    expect(allImproved).toBe(true)
    expect(report.summary.improvements).toBe(report.comparisons.length)
    expect(report.summary.regressions).toBe(0)
  })

  it('should detect performance regressions correctly', () => {
    // Arrange: Current metrics worse than baseline
    const baseline = {
      testDate: '2025-01-01T00:00:00.000Z',
      environment: 'ECS Production',
      totalRequests: 100000,
      successfulRequests: 99800,
      failedRequests: 200,
      requestRate: 200,
      responseTime: {
        median: 150,
        p95: 300,
        p99: 500,
      },
      errorRate: 0.2,
      successRate: 99.8,
      cacheHitRate: 90,
    }

    const current = {
      testDate: '2025-01-15T00:00:00.000Z',
      environment: 'SST Production',
      totalRequests: 100000,
      successfulRequests: 99000,
      failedRequests: 1000,
      requestRate: 120,
      responseTime: {
        median: 250,
        p95: 480,
        p99: 850,
      },
      errorRate: 1.0,
      successRate: 99.0,
      cacheHitRate: 75,
    }

    fs.writeFileSync(testBaselinePath, JSON.stringify(baseline, null, 2))
    fs.writeFileSync(testCurrentPath, JSON.stringify(current, null, 2))

    // Act
    execSync(
      `tsx ${path.join(__dirname, '../compare-baselines.ts')} ${testCurrentPath} ${testBaselinePath}`,
      { encoding: 'utf-8' }
    )

    // Assert
    const report = JSON.parse(fs.readFileSync(testComparisonPath, 'utf-8'))

    // Most metrics should show regression
    expect(report.summary.regressions).toBeGreaterThan(0)
    expect(report.summary.improvements).toBe(0)
  })
})
