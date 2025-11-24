/**
 * CloudWatch Embedded Metric Format (EMF) Instrumentation
 *
 * Provides structured metrics publishing using CloudWatch EMF for Lambda functions.
 * Metrics are published asynchronously without adding latency to Lambda responses.
 *
 * Features:
 * - Cold start detection and tracking
 * - Execution duration measurement
 * - Error count tracking by error type
 * - Invocation count tracking
 * - Memory utilization tracking
 * - Business metrics (database, S3, OpenSearch operations)
 *
 * Usage:
 * ```typescript
 * import { publishMetrics, recordColdStart, recordExecution } from '@/core/observability/metrics'
 *
 * // Record a cold start
 * recordColdStart('MyFunction')
 *
 * // Record execution metrics
 * await recordExecution('MyFunction', 150, false, { userId: '123' })
 * ```
 *
 * @see https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format.html
 */

import { MetricsLogger, Unit, Configuration } from 'aws-embedded-metrics'
import { createLogger } from '@/core/observability/logger'

const logger = createLogger('cloudwatch-emf')

/**
 * EMF Configuration
 */
const EMF_NAMESPACE = `UserMetrics/Lambda/${process.env.STAGE || 'dev'}`
// const EMF_FLUSH_TIMEOUT = 100 // milliseconds - unused

/**
 * Initialize EMF configuration
 */
Configuration.namespace = EMF_NAMESPACE
Configuration.serviceName = 'lego-api-serverless'
Configuration.serviceType = 'AWS::Lambda::Function'
Configuration.logGroupName = process.env.AWS_LAMBDA_LOG_GROUP_NAME || '/aws/lambda/unknown'

/**
 * Metric dimensions
 */
interface MetricDimensions {
  FunctionName: string
  Environment: string
  [key: string]: string
}

/**
 * Create base dimensions for all metrics
 */
function createBaseDimensions(functionName: string): MetricDimensions {
  return {
    FunctionName: functionName,
    Environment: process.env.STAGE || 'dev',
  }
}

/**
 * Record a cold start event
 *
 * @param functionName - Lambda function name
 * @param additionalDimensions - Optional additional dimensions
 */
export async function recordColdStart(
  functionName: string,
  additionalDimensions?: Record<string, string>,
): Promise<void> {
  try {
    const metrics = new MetricsLogger(() => Promise.resolve(process.env as any))
    const dimensions = { ...createBaseDimensions(functionName), ...additionalDimensions }

    metrics.setDimensions(dimensions)
    metrics.setNamespace(EMF_NAMESPACE)

    metrics.putMetric('ColdStart', 1, Unit.Count)
    metrics.putMetric('ColdStartIndicator', 1, Unit.None)

    await metrics.flush()

    logger.debug('Recorded cold start metric', { functionName, dimensions })
  } catch (error) {
    // Non-blocking: log error but don't fail the Lambda execution
    logger.error('Failed to record cold start metric', error as Error, { functionName })
  }
}

/**
 * Record execution metrics
 *
 * @param functionName - Lambda function name
 * @param durationMs - Execution duration in milliseconds
 * @param isError - Whether the execution resulted in an error
 * @param additionalDimensions - Optional additional dimensions
 */
export async function recordExecution(
  functionName: string,
  durationMs: number,
  isError: boolean,
  additionalDimensions?: Record<string, string>,
): Promise<void> {
  try {
    const metrics = new MetricsLogger(() => Promise.resolve(process.env as any))
    const dimensions = { ...createBaseDimensions(functionName), ...additionalDimensions }

    metrics.setDimensions(dimensions)
    metrics.setNamespace(EMF_NAMESPACE)

    // Record invocation
    metrics.putMetric('InvocationCount', 1, Unit.Count)

    // Record duration
    metrics.putMetric('ExecutionDuration', durationMs, Unit.Milliseconds)

    // Record error if applicable
    if (isError) {
      metrics.putMetric('ErrorCount', 1, Unit.Count)
    }

    // Record memory utilization if available
    const memoryUsed = process.memoryUsage().heapUsed / 1024 / 1024 // MB
    const memoryLimit = parseInt(process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE || '128', 10)
    const memoryUtilization = (memoryUsed / memoryLimit) * 100

    metrics.putMetric('MemoryUtilization', memoryUtilization, Unit.Percent)
    metrics.putMetric('MemoryUsed', memoryUsed, Unit.Megabytes)

    await metrics.flush()

    logger.debug('Recorded execution metrics', {
      functionName,
      durationMs,
      isError,
      memoryUtilization: memoryUtilization.toFixed(2),
      dimensions,
    })
  } catch (error) {
    // Non-blocking: log error but don't fail the Lambda execution
    logger.error('Failed to record execution metrics', error as Error, { functionName })
  }
}

/**
 * Record error metrics with error type
 *
 * @param functionName - Lambda function name
 * @param errorType - Type/name of the error
 * @param errorMessage - Error message (for logging only, not as dimension)
 * @param statusCode - HTTP status code if applicable
 * @param additionalDimensions - Optional additional dimensions
 */
export async function recordError(
  functionName: string,
  errorType: string,
  errorMessage: string,
  statusCode?: number,
  additionalDimensions?: Record<string, string>,
): Promise<void> {
  try {
    const metrics = new MetricsLogger(() => Promise.resolve(process.env as any))
    const dimensions = {
      ...createBaseDimensions(functionName),
      ErrorType: errorType,
      ...(statusCode && { StatusCode: statusCode.toString() }),
      ...additionalDimensions,
    }

    metrics.setDimensions(dimensions)
    metrics.setNamespace(EMF_NAMESPACE)

    metrics.putMetric('ErrorCount', 1, Unit.Count)
    metrics.putMetric('ErrorRate', 1, Unit.None)

    // Add error message as property (not dimension) for searchability
    metrics.setProperty('errorMessage', errorMessage)

    await metrics.flush()

    logger.debug('Recorded error metric', {
      functionName,
      errorType,
      statusCode,
      dimensions,
    })
  } catch (error) {
    // Non-blocking: log error but don't fail the Lambda execution
    logger.error('Failed to record error metric', error as Error, { functionName, errorType })
  }
}

/**
 * Record business metrics (database queries, S3 operations, etc.)
 *
 * @param functionName - Lambda function name
 * @param metricName - Name of the business metric
 * @param value - Metric value
 * @param unit - Metric unit
 * @param additionalDimensions - Optional additional dimensions
 */
export async function recordBusinessMetric(
  functionName: string,
  metricName: string,
  value: number,
  unit: Unit = Unit.Count,
  additionalDimensions?: Record<string, string>,
): Promise<void> {
  try {
    const metrics = new MetricsLogger(() => Promise.resolve(process.env as any))
    const dimensions = { ...createBaseDimensions(functionName), ...additionalDimensions }

    metrics.setDimensions(dimensions)
    metrics.setNamespace(EMF_NAMESPACE)

    metrics.putMetric(metricName, value, unit)

    await metrics.flush()

    logger.debug('Recorded business metric', {
      functionName,
      metricName,
      value,
      unit,
      dimensions,
    })
  } catch (error) {
    // Non-blocking: log error but don't fail the Lambda execution
    logger.error('Failed to record business metric', error as Error, {
      functionName,
      metricName,
    })
  }
}

/**
 * Record multiple metrics in a single EMF log entry
 * More efficient than calling individual metric functions
 *
 * @param functionName - Lambda function name
 * @param metrics - Object with metric names as keys and values as numbers
 * @param additionalDimensions - Optional additional dimensions
 */
export async function recordMetrics(
  functionName: string,
  metrics: Record<string, { value: number; unit?: Unit }>,
  additionalDimensions?: Record<string, string>,
): Promise<void> {
  try {
    const metricsLogger = new MetricsLogger(() => Promise.resolve(process.env as any))
    const dimensions = { ...createBaseDimensions(functionName), ...additionalDimensions }

    metricsLogger.setDimensions(dimensions)
    metricsLogger.setNamespace(EMF_NAMESPACE)

    // Add all metrics
    Object.entries(metrics).forEach(([metricName, metricData]) => {
      metricsLogger.putMetric(metricName, metricData.value, metricData.unit || Unit.Count)
    })

    await metricsLogger.flush()

    logger.debug('Recorded batch metrics', {
      functionName,
      metricCount: Object.keys(metrics).length,
      dimensions,
    })
  } catch (error) {
    // Non-blocking: log error but don't fail the Lambda execution
    logger.error('Failed to record batch metrics', error as Error, { functionName })
  }
}

/**
 * Helper: Record database query metrics
 */
export async function recordDatabaseQuery(
  functionName: string,
  queryType: 'read' | 'write' | 'transaction',
  _durationMs: number,
): Promise<void> {
  return recordBusinessMetric(functionName, 'DatabaseQueryCount', 1, Unit.Count, {
    QueryType: queryType,
  })
}

/**
 * Helper: Record S3 operation metrics
 */
export async function recordS3Operation(
  functionName: string,
  operation: 'get' | 'put' | 'delete' | 'list',
  _durationMs: number,
): Promise<void> {
  return recordBusinessMetric(functionName, 'S3OperationCount', 1, Unit.Count, {
    Operation: operation,
  })
}

/**
 * Helper: Record OpenSearch query metrics
 */
export async function recordOpenSearchQuery(
  functionName: string,
  queryType: 'search' | 'index' | 'update' | 'delete',
  _durationMs: number,
): Promise<void> {
  return recordBusinessMetric(functionName, 'OpenSearchQueryCount', 1, Unit.Count, {
    QueryType: queryType,
  })
}
