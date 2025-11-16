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
import { getEnv } from './env'

let _cloudWatchClient: CloudWatchClient | null = null

/**
 * Get or create CloudWatch client instance
 */
function getCloudWatchClient(): CloudWatchClient {
  if (!_cloudWatchClient) {
    const env = getEnv()
    _cloudWatchClient = new CloudWatchClient({
      region: env.AWS_REGION || 'us-east-1',
    })
  }
  return _cloudWatchClient
}

/**
 * Namespace for all application metrics
 */
const NAMESPACE = 'LegoAPI/ImageUploads'

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
 * Publish a metric to CloudWatch
 *
 * @param metricName - Name of the metric
 * @param value - Metric value
 * @param unit - CloudWatch standard unit
 * @param uploadType - Type of upload (gallery, wishlist, moc)
 */
export async function publishMetric(
  metricName: MetricName,
  value: number,
  unit: StandardUnit = StandardUnit.Count,
  uploadType?: ImageUploadType,
): Promise<void> {
  try {
    const client = getCloudWatchClient()
    const env = getEnv()

    const dimensions = [
      {
        Name: 'Environment',
        Value: env.NODE_ENV ? String(env.NODE_ENV) : 'development',
      },
    ]

    if (uploadType) {
      dimensions.push({
        Name: 'UploadType',
        Value: uploadType,
      })
    }

    await client.send(
      new PutMetricDataCommand({
        Namespace: NAMESPACE,
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
    console.error('Failed to publish CloudWatch metric:', error)
  }
}

/**
 * Record successful image upload
 */
export async function recordUploadSuccess(uploadType: ImageUploadType): Promise<void> {
  await publishMetric(MetricName.UploadSuccess, 1, StandardUnit.Count, uploadType)
}

/**
 * Record failed image upload
 */
export async function recordUploadFailure(uploadType: ImageUploadType, errorType: string): Promise<void> {
  await publishMetric(MetricName.UploadFailure, 1, StandardUnit.Count, uploadType)

  // Also record specific error type
  const errorMetricMap: Record<string, MetricName> = {
    validation: MetricName.ValidationError,
    s3: MetricName.S3Error,
    database: MetricName.DatabaseError,
  }

  const errorMetric = errorMetricMap[errorType.toLowerCase()]
  if (errorMetric) {
    await publishMetric(errorMetric, 1, StandardUnit.Count, uploadType)
  }
}

/**
 * Record image processing time
 */
export async function recordProcessingTime(
  durationMs: number,
  uploadType: ImageUploadType,
): Promise<void> {
  await publishMetric(MetricName.ProcessingTime, durationMs, StandardUnit.Milliseconds, uploadType)
}

/**
 * Record image file size
 */
export async function recordFileSize(sizeBytes: number, uploadType: ImageUploadType): Promise<void> {
  await publishMetric(MetricName.FileSize, sizeBytes, StandardUnit.Bytes, uploadType)
}

/**
 * Record image dimensions
 */
export async function recordImageDimensions(
  width: number,
  height: number,
  uploadType: ImageUploadType,
): Promise<void> {
  await publishMetric(MetricName.ImageWidth, width, StandardUnit.None, uploadType)
  await publishMetric(MetricName.ImageHeight, height, StandardUnit.None, uploadType)
}

/**
 * Helper to measure and record processing time
 */
export async function measureProcessingTime<T>(
  operation: () => Promise<T>,
  uploadType: ImageUploadType,
): Promise<T> {
  const startTime = Date.now()
  try {
    const result = await operation()
    const duration = Date.now() - startTime
    await recordProcessingTime(duration, uploadType)
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    await recordProcessingTime(duration, uploadType)
    throw error
  }
}
