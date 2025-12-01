/**
 * CloudWatch Metrics Utility
 *
 * Provides functions to publish custom metrics to CloudWatch for monitoring:
 * - Image upload success/failure rates
 * - Image processing performance
 * - File size distributions
 * - Error tracking
 */

import { CloudWatchClient, PutMetricDataCommand, StandardUnit } from '@aws-sdk/client-cloudwatch'

/**
 * Logger interface for optional logging
 */
export interface Logger {
  error: (message: string, ...args: unknown[]) => void
}

/**
 * Configuration options for CloudWatch metrics
 */
export interface CloudWatchMetricsConfig {
  region: string
  namespace: string
  environment?: string
  logger?: Logger
}

/**
 * Dimension for different image upload types
 */
export type ImageUploadType = 'gallery' | 'wishlist' | 'moc'

/**
 * Metric names
 */
export enum MetricName {
  UploadSuccess = 'UploadSuccess',
  UploadFailure = 'UploadFailure',
  ProcessingTime = 'ProcessingTime',
  FileSize = 'FileSize',
  ImageWidth = 'ImageWidth',
  ImageHeight = 'ImageHeight',
  ValidationError = 'ValidationError',
  S3Error = 'S3Error',
  DatabaseError = 'DatabaseError',
}

/**
 * CloudWatch Metrics Client
 */
export class CloudWatchMetrics {
  private client: CloudWatchClient
  private namespace: string
  private environment: string
  private logger?: Logger

  constructor(config: CloudWatchMetricsConfig) {
    this.client = new CloudWatchClient({
      region: config.region,
    })
    this.namespace = config.namespace
    this.environment = config.environment || 'development'
    this.logger = config.logger
  }

  /**
   * Publish a metric to CloudWatch
   *
   * @param metricName - Name of the metric
   * @param value - Metric value
   * @param unit - CloudWatch standard unit
   * @param uploadType - Type of upload (gallery, wishlist, moc)
   */
  async publishMetric(
    metricName: MetricName,
    value: number,
    unit: StandardUnit = StandardUnit.Count,
    uploadType?: ImageUploadType,
  ): Promise<void> {
    try {
      const dimensions = [
        {
          Name: 'Environment',
          Value: this.environment,
        },
      ]

      if (uploadType) {
        dimensions.push({
          Name: 'UploadType',
          Value: uploadType,
        })
      }

      await this.client.send(
        new PutMetricDataCommand({
          Namespace: this.namespace,
          MetricData: [
            {
              MetricName: metricName,
              Value: value,
              Unit: unit,
              Timestamp: new Date(),
              Dimensions: dimensions,
            },
          ],
        }),
      )
    } catch (error) {
      // Don't throw - metrics failures should not break uploads
      this.logger?.error('Failed to publish CloudWatch metric:', error)
    }
  }

  /**
   * Record successful image upload
   */
  async recordUploadSuccess(uploadType: ImageUploadType): Promise<void> {
    await this.publishMetric(MetricName.UploadSuccess, 1, StandardUnit.Count, uploadType)
  }

  /**
   * Record failed image upload
   */
  async recordUploadFailure(uploadType: ImageUploadType, errorType: string): Promise<void> {
    await this.publishMetric(MetricName.UploadFailure, 1, StandardUnit.Count, uploadType)

    // Also record specific error type
    const errorMetricMap: Record<string, MetricName> = {
      validation: MetricName.ValidationError,
      s3: MetricName.S3Error,
      database: MetricName.DatabaseError,
    }

    const errorMetric = errorMetricMap[errorType.toLowerCase()]
    if (errorMetric) {
      await this.publishMetric(errorMetric, 1, StandardUnit.Count, uploadType)
    }
  }

  /**
   * Record image processing time
   */
  async recordProcessingTime(durationMs: number, uploadType: ImageUploadType): Promise<void> {
    await this.publishMetric(MetricName.ProcessingTime, durationMs, StandardUnit.Milliseconds, uploadType)
  }

  /**
   * Record image file size
   */
  async recordFileSize(sizeBytes: number, uploadType: ImageUploadType): Promise<void> {
    await this.publishMetric(MetricName.FileSize, sizeBytes, StandardUnit.Bytes, uploadType)
  }

  /**
   * Record image dimensions
   */
  async recordImageDimensions(width: number, height: number, uploadType: ImageUploadType): Promise<void> {
    await this.publishMetric(MetricName.ImageWidth, width, StandardUnit.None, uploadType)
    await this.publishMetric(MetricName.ImageHeight, height, StandardUnit.None, uploadType)
  }

  /**
   * Helper to measure and record processing time
   */
  async measureProcessingTime<T>(operation: () => Promise<T>, uploadType: ImageUploadType): Promise<T> {
    const startTime = Date.now()
    try {
      const result = await operation()
      const duration = Date.now() - startTime
      await this.recordProcessingTime(duration, uploadType)
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      await this.recordProcessingTime(duration, uploadType)
      throw error
    }
  }
}
