/**
 * CloudWatch EMF (Embedded Metric Format) for Web Vitals
 * Story 3.3: Frontend Web Vitals Tracking
 *
 * This module provides functions to publish Web Vitals metrics to CloudWatch
 * using the Embedded Metric Format for efficient querying and alerting.
 */

import { createLambdaLogger } from '@repo/logger'

const logger = createLambdaLogger('cloudwatch-web-vitals')

/**
 * Get CloudWatch namespace for Web Vitals based on stage
 */
function getWebVitalsNamespace(): string {
  const stage = process.env.STAGE || process.env.NODE_ENV || 'development'
  return `UserMetrics/Frontend/${stage}`
}

/**
 * Record Web Vitals metric to CloudWatch using EMF
 *
 * @param metricName - Name of the Web Vitals metric (LCP, FID, CLS, TTFB, INP, FCP)
 * @param value - Metric value
 * @param rating - Performance rating (good, needs-improvement, poor)
 * @param dimensions - CloudWatch metric dimensions
 * @param metadata - Additional metadata (not used for metrics but logged)
 */
export async function recordWebVitalsMetric(
  metricName: string,
  value: number,
  rating: 'good' | 'needs-improvement' | 'poor',
  dimensions: {
    SessionId?: string
    URL?: string
    Rating?: string
    NavigationType?: string
    MetricId?: string
  } = {},
  metadata?: {
    userAgent?: string
    fullUrl?: string
    delta?: number
  },
): Promise<void> {
  try {
    const namespace = getWebVitalsNamespace()

    // Create EMF log entry
    const emfEntry = {
      _aws: {
        Timestamp: Date.now(),
        CloudWatchMetrics: [
          {
            Namespace: namespace,
            Dimensions: [
              ['MetricName'],
              ['MetricName', 'Rating'],
              ['MetricName', 'URL'],
              ['MetricName', 'NavigationType'],
            ],
            Metrics: [
              {
                Name: metricName,
                Unit: getMetricUnit(metricName),
                StorageResolution: 60, // 60 seconds for high-resolution metrics
              },
              {
                Name: `${metricName}_Count`,
                Unit: 'Count',
              },
            ],
          },
        ],
      },
      // Dimensions
      MetricName: metricName,
      Rating: rating,
      URL: dimensions.URL || 'unknown',
      NavigationType: dimensions.NavigationType || 'unknown',
      // Metric values
      [metricName]: value,
      [`${metricName}_Count`]: 1,
      // Additional properties for filtering/analysis
      SessionId: dimensions.SessionId,
      MetricId: dimensions.MetricId,
      // Metadata (not indexed but available in logs)
      UserAgent: metadata?.userAgent,
      FullURL: metadata?.fullUrl,
      Delta: metadata?.delta,
    }

    // Output EMF to stdout (CloudWatch Logs will parse this)
    console.log(JSON.stringify(emfEntry))

    logger.debug('Published Web Vitals metric', {
      namespace,
      metricName,
      value,
      rating,
    })
  } catch (error) {
    logger.error('Failed to record Web Vitals metric', error instanceof Error ? error : undefined, {
      metricName,
      value,
    })
    // Don't throw - we don't want metric recording failures to break the Lambda
  }
}

/**
 * Get CloudWatch metric unit based on metric name
 */
function getMetricUnit(metricName: string): string {
  switch (metricName.toUpperCase()) {
    case 'CLS':
      return 'None' // CLS is unitless (cumulative score)
    case 'FID':
    case 'FCP':
    case 'LCP':
    case 'TTFB':
    case 'INP':
      return 'Milliseconds'
    default:
      return 'None'
  }
}

/**
 * Record batch of Web Vitals metrics
 *
 * @param metrics - Array of Web Vitals metrics to record
 */
export async function recordWebVitalsBatch(
  metrics: Array<{
    name: string
    value: number
    rating: 'good' | 'needs-improvement' | 'poor'
    dimensions?: Record<string, string>
    metadata?: Record<string, any>
  }>,
): Promise<void> {
  logger.info('Recording Web Vitals batch', { count: metrics.length })

  // Record metrics in parallel
  await Promise.allSettled(
    metrics.map(metric =>
      recordWebVitalsMetric(
        metric.name,
        metric.value,
        metric.rating,
        metric.dimensions || {},
        metric.metadata,
      ),
    ),
  )

  logger.info('Web Vitals batch recording completed', { count: metrics.length })
}
