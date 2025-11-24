import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

describe('validate-thresholds', () => {
  const testResultsDir = path.join(__dirname, '../../../tests/performance/results-test')
  const testMetricsPath = path.join(testResultsDir, 'test-metrics.json')

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

  it('should pass validation when all thresholds are met', () => {
    // Arrange: Create metrics that pass all thresholds
    const passingMetrics = {
      totalRequests: 90000,
      successfulRequests: 89500,
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

    fs.writeFileSync(testMetricsPath, JSON.stringify(passingMetrics, null, 2))

    // Act & Assert: Should exit with code 0 (success)
    expect(() => {
      execSync(`tsx ${path.join(__dirname, '../validate-thresholds.ts')} ${testMetricsPath}`, {
        encoding: 'utf-8',
      })
    }).not.toThrow()
  })

  it('should fail validation when p95 response time exceeds threshold', () => {
    // Arrange: Create metrics with p95 above 500ms
    const failingMetrics = {
      totalRequests: 90000,
      successfulRequests: 89500,
      failedRequests: 100,
      requestRate: 150,
      responseTime: {
        median: 200,
        p95: 550, // Exceeds 500ms threshold
        p99: 800,
      },
      errorRate: 0.11,
      successRate: 99.44,
      cacheHitRate: 88,
    }

    fs.writeFileSync(testMetricsPath, JSON.stringify(failingMetrics, null, 2))

    // Act & Assert: Should exit with code 1 (failure)
    expect(() => {
      execSync(`tsx ${path.join(__dirname, '../validate-thresholds.ts')} ${testMetricsPath}`, {
        encoding: 'utf-8',
      })
    }).toThrow()
  })

  it('should fail validation when throughput is too low', () => {
    // Arrange: Create metrics with low throughput
    const failingMetrics = {
      totalRequests: 50000,
      successfulRequests: 49500,
      failedRequests: 100,
      requestRate: 85, // Below 100 req/sec threshold
      responseTime: {
        median: 200,
        p95: 380,
        p99: 650,
      },
      errorRate: 0.2,
      successRate: 99.0,
      cacheHitRate: 88,
    }

    fs.writeFileSync(testMetricsPath, JSON.stringify(failingMetrics, null, 2))

    // Act & Assert: Should exit with code 1 (failure)
    expect(() => {
      execSync(`tsx ${path.join(__dirname, '../validate-thresholds.ts')} ${testMetricsPath}`, {
        encoding: 'utf-8',
      })
    }).toThrow()
  })

  it('should fail validation when error rate is too high', () => {
    // Arrange: Create metrics with high error rate
    const failingMetrics = {
      totalRequests: 90000,
      successfulRequests: 88000,
      failedRequests: 1500,
      requestRate: 150,
      responseTime: {
        median: 200,
        p95: 380,
        p99: 650,
      },
      errorRate: 1.67, // Above 1% threshold
      successRate: 97.78,
      cacheHitRate: 88,
    }

    fs.writeFileSync(testMetricsPath, JSON.stringify(failingMetrics, null, 2))

    // Act & Assert: Should exit with code 1 (failure)
    expect(() => {
      execSync(`tsx ${path.join(__dirname, '../validate-thresholds.ts')} ${testMetricsPath}`, {
        encoding: 'utf-8',
      })
    }).toThrow()
  })

  it('should handle missing cache hit rate gracefully', () => {
    // Arrange: Create metrics without cache data
    const metricsWithoutCache = {
      totalRequests: 90000,
      successfulRequests: 89500,
      failedRequests: 100,
      requestRate: 150,
      responseTime: {
        median: 200,
        p95: 380,
        p99: 650,
      },
      errorRate: 0.11,
      successRate: 99.44,
      cacheHitRate: null,
    }

    fs.writeFileSync(testMetricsPath, JSON.stringify(metricsWithoutCache, null, 2))

    // Act & Assert: Should still pass (cache hit rate is not critical)
    expect(() => {
      execSync(`tsx ${path.join(__dirname, '../validate-thresholds.ts')} ${testMetricsPath}`, {
        encoding: 'utf-8',
      })
    }).not.toThrow()
  })

  it('should validate cold start p99 threshold', () => {
    // Arrange: Create metrics with acceptable cold start time
    const metricsWithColdStart = {
      totalRequests: 90000,
      successfulRequests: 89500,
      failedRequests: 100,
      requestRate: 150,
      responseTime: {
        median: 200,
        p95: 380,
        p99: 1800, // Under 2000ms threshold
      },
      errorRate: 0.11,
      successRate: 99.44,
      cacheHitRate: 88,
    }

    fs.writeFileSync(testMetricsPath, JSON.stringify(metricsWithColdStart, null, 2))

    // Act & Assert: Should pass
    expect(() => {
      execSync(`tsx ${path.join(__dirname, '../validate-thresholds.ts')} ${testMetricsPath}`, {
        encoding: 'utf-8',
      })
    }).not.toThrow()
  })
})
