import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

describe('extract-metrics', () => {
  const testResultsDir = path.join(__dirname, '../../../tests/performance/results-test')
  const testReportPath = path.join(testResultsDir, 'test-artillery-report.json')
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

  it('should extract metrics from valid Artillery report', () => {
    // Arrange: Create mock Artillery report
    const mockReport = {
      aggregate: {
        counters: {
          'http.requests': 1000,
          'http.responses': 995,
          'http.codes.200': 990,
          'http.codes.201': 5,
          'http.codes.500': 5,
        },
        rates: {
          'http.request_rate': 166.67,
        },
        summaries: {
          'http.response_time': {
            min: 50,
            max: 2000,
            mean: 300,
            median: 250,
            p95: 450,
            p99: 800,
          },
        },
      },
    }

    fs.writeFileSync(testReportPath, JSON.stringify(mockReport, null, 2))

    // Act: Run extract-metrics script
    execSync(
      `tsx ${path.join(__dirname, '../extract-metrics.ts')} ${testReportPath} ${testMetricsPath}`,
      { encoding: 'utf-8' }
    )

    // Assert: Check extracted metrics
    expect(fs.existsSync(testMetricsPath)).toBe(true)

    const metrics = JSON.parse(fs.readFileSync(testMetricsPath, 'utf-8'))

    expect(metrics.totalRequests).toBe(1000)
    expect(metrics.successfulRequests).toBe(995)
    expect(metrics.failedRequests).toBe(5)
    expect(metrics.requestRate).toBe(166.67)
    expect(metrics.responseTime.p95).toBe(450)
    expect(metrics.responseTime.p99).toBe(800)
    expect(metrics.errorRate).toBe(0.5)
    expect(metrics.successRate).toBe(99.5)
  })

  it('should handle Artillery report with cache metrics', () => {
    // Arrange: Create mock report with cache data
    const mockReport = {
      aggregate: {
        counters: {
          'http.requests': 1000,
          'http.responses': 1000,
          'http.codes.200': 995,
          'cache.hit': 850,
          'cache.miss': 150,
        },
        rates: {
          'http.request_rate': 100,
        },
        summaries: {
          'http.response_time': {
            min: 50,
            max: 1000,
            mean: 200,
            median: 180,
            p95: 400,
            p99: 700,
          },
        },
      },
    }

    fs.writeFileSync(testReportPath, JSON.stringify(mockReport, null, 2))

    // Act
    execSync(
      `tsx ${path.join(__dirname, '../extract-metrics.ts')} ${testReportPath} ${testMetricsPath}`,
      { encoding: 'utf-8' }
    )

    // Assert
    const metrics = JSON.parse(fs.readFileSync(testMetricsPath, 'utf-8'))
    expect(metrics.cacheHitRate).toBe(85)
  })

  it('should calculate correct error rate with multiple error codes', () => {
    // Arrange
    const mockReport = {
      aggregate: {
        counters: {
          'http.requests': 1000,
          'http.responses': 1000,
          'http.codes.200': 985,
          'http.codes.500': 5,
          'http.codes.502': 5,
          'http.codes.503': 5,
        },
        rates: {
          'http.request_rate': 100,
        },
        summaries: {
          'http.response_time': {
            min: 50,
            max: 1000,
            mean: 200,
            median: 180,
            p95: 400,
            p99: 700,
          },
        },
      },
    }

    fs.writeFileSync(testReportPath, JSON.stringify(mockReport, null, 2))

    // Act
    execSync(
      `tsx ${path.join(__dirname, '../extract-metrics.ts')} ${testReportPath} ${testMetricsPath}`,
      { encoding: 'utf-8' }
    )

    // Assert
    const metrics = JSON.parse(fs.readFileSync(testMetricsPath, 'utf-8'))
    expect(metrics.failedRequests).toBe(15) // 5 + 5 + 5
    expect(metrics.errorRate).toBe(1.5) // 15/1000 * 100
  })
})
