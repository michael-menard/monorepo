/**
 * AWS X-Ray Tracing Utility (Story 5.3)
 *
 * Provides utilities for distributed tracing with AWS X-Ray:
 * - Trace async operations with subsegments
 * - Track error propagation across services
 * - Performance monitoring for operations
 * - AWS SDK v3 client instrumentation
 * - Annotations and metadata for filtering
 *
 * Note: X-Ray must be enabled in Lambda configuration via SST (tracing: 'active')
 *
 * Usage:
 * ```typescript
 * import { traceAsyncOperation, addAnnotation, addMetadata } from '@/core/observability/tracing'
 *
 * const result = await traceAsyncOperation('uploadImage', async (subsegment) => {
 *   subsegment?.addAnnotation('bucket', 'my-bucket')
 *   subsegment?.addMetadata('fileSize', 1024)
 *   return await uploadToS3(file)
 * })
 * ```
 */

import { createLogger } from '@/core/observability/logger'
// import type { S3Client } from '@aws-sdk/client-s3' - unused

const logger = createLogger('xray')

/**
 * AWS X-Ray SDK
 * Dynamically loaded to handle environments where it's not installed
 */
let AWSXRay: any = null
let captureAWSv3Client: any = null

try {
  // Import X-Ray SDK core
  AWSXRay = require('aws-xray-sdk-core')

  // Import AWS SDK v3 client capture utility
  const captureModule = require('aws-xray-sdk-core')
  captureAWSv3Client = captureModule.captureAWSv3Client

  logger.info('AWS X-Ray SDK loaded successfully')
} catch (error) {
  // X-Ray SDK not installed - tracing will be no-op
  logger.warn('AWS X-Ray SDK not available. Tracing disabled.', {
    note: 'Install aws-xray-sdk-core to enable tracing',
  })
}

/**
 * Trace an async operation with X-Ray subsegment
 *
 * Creates a subsegment for the operation, capturing:
 * - Operation duration
 * - Success/failure status
 * - Error details if operation fails
 * - Custom annotations and metadata via subsegment parameter
 *
 * If X-Ray is not enabled, operation runs normally without tracing.
 *
 * @param name - Name of the operation (will appear in X-Ray traces)
 * @param operation - The async operation to trace (receives subsegment for annotations)
 * @returns Result of the operation
 *
 * @example
 * ```typescript
 * // Trace a database query with annotations
 * const users = await traceAsyncOperation('getUsersFromDB', async (subsegment) => {
 *   subsegment?.addAnnotation('table', 'users')
 *   subsegment?.addMetadata('query', 'SELECT * FROM users')
 *   return await db.select().from(schema.users)
 * })
 *
 * // Trace S3 upload with metadata
 * const url = await traceAsyncOperation('uploadToS3', async (subsegment) => {
 *   subsegment?.addAnnotation('bucket', bucketName)
 *   subsegment?.addMetadata('fileSize', file.size)
 *   return await s3Client.upload(params)
 * })
 * ```
 */
export async function traceAsyncOperation<T>(
  name: string,
  operation: (subsegment?: any) => Promise<T>,
): Promise<T> {
  // If X-Ray SDK not available, run operation without tracing
  if (!AWSXRay) {
    return await operation(undefined)
  }

  const segment = AWSXRay.getSegment()

  // If no active segment (X-Ray not configured), run without tracing
  if (!segment) {
    return await operation(undefined)
  }

  const subsegment = segment.addNewSubsegment(name)

  try {
    const result = await operation(subsegment)
    subsegment.close()
    return result
  } catch (error) {
    // Add error to subsegment for X-Ray error tracking
    subsegment.addError(error)
    subsegment.close()
    throw error
  }
}

/**
 * Trace multiple nested operations
 *
 * @param name - Name of the parent operation
 * @param operations - Map of operation name to operation function
 * @returns Map of operation name to result
 *
 * @example
 * ```typescript
 * const results = await traceNestedOperations('processUpload', {
 *   validateFile: () => validateFileType(file),
 *   processImage: () => processImage(file),
 *   uploadToS3: () => uploadToS3(processed),
 *   indexInSearch: () => indexDocument(metadata)
 * })
 * ```
 */
export async function traceNestedOperations<
  T extends Record<string, (subsegment?: any) => Promise<any>>,
>(name: string, operations: T): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  return await traceAsyncOperation(name, async _parentSubsegment => {
    const results: any = {}

    for (const [opName, opFn] of Object.entries(operations)) {
      results[opName] = await traceAsyncOperation(opName, opFn)
    }

    return results
  })
}

/**
 * Add annotation to current X-Ray segment
 *
 * Annotations are indexed and searchable in X-Ray console
 *
 * @param key - Annotation key
 * @param value - Annotation value (string, number, or boolean)
 */
export function addAnnotation(key: string, value: string | number | boolean): void {
  if (!AWSXRay) return

  const segment = AWSXRay.getSegment()
  if (segment) {
    segment.addAnnotation(key, value)
  }
}

/**
 * Add metadata to current X-Ray segment
 *
 * Metadata is not indexed but can contain any JSON-serializable data
 *
 * @param namespace - Namespace for the metadata
 * @param key - Metadata key
 * @param value - Metadata value (any JSON-serializable type)
 */
export function addMetadata(namespace: string, key: string, value: any): void {
  if (!AWSXRay) return

  const segment = AWSXRay.getSegment()
  if (segment) {
    segment.addMetadata(key, value, namespace)
  }
}

/**
 * Helper to trace database operations
 */
export async function traceDatabase<T>(
  queryName: string,
  query: (subsegment?: any) => Promise<T>,
): Promise<T> {
  return await traceAsyncOperation(`db:${queryName}`, query)
}

/**
 * Helper to trace S3 operations
 */
export async function traceS3<T>(
  operationName: string,
  operation: (subsegment?: any) => Promise<T>,
): Promise<T> {
  return await traceAsyncOperation(`s3:${operationName}`, operation)
}

/**
 * Helper to trace OpenSearch operations
 */
export async function traceSearch<T>(
  operationName: string,
  operation: (subsegment?: any) => Promise<T>,
): Promise<T> {
  return await traceAsyncOperation(`search:${operationName}`, operation)
}

/**
 * Check if X-Ray tracing is enabled
 */
export function isXRayEnabled(): boolean {
  return AWSXRay !== null && AWSXRay.getSegment() !== undefined
}

/**
 * Instrument an AWS SDK v3 client for X-Ray tracing
 *
 * Wraps the client to automatically create subsegments for all operations
 *
 * @param client - AWS SDK v3 client to instrument
 * @returns Instrumented client
 *
 * @example
 * ```typescript
 * import { S3Client } from '@aws-sdk/client-s3'
 * import { instrumentAWSClient } from '@/core/observability/tracing'
 *
 * const s3Client = instrumentAWSClient(new S3Client({ region: 'us-east-1' }))
 * // All S3 operations will now be traced automatically
 * ```
 */
export function instrumentAWSClient<T>(client: T): T {
  if (!captureAWSv3Client) {
    // X-Ray not available, return client as-is
    return client
  }

  try {
    return captureAWSv3Client(client)
  } catch (error) {
    logger.warn('Failed to instrument AWS client', { error })
    return client
  }
}

/**
 * Helper to trace cache operations (Redis)
 */
export async function traceCache<T>(
  operationName: string,
  operation: (subsegment?: any) => Promise<T>,
): Promise<T> {
  return await traceAsyncOperation(`cache:${operationName}`, operation)
}

/**
 * Get current X-Ray segment
 * Useful for adding annotations/metadata outside of traceAsyncOperation
 */
export function getCurrentSegment(): any {
  if (!AWSXRay) return null
  return AWSXRay.getSegment()
}

/**
 * Add error to current segment
 * Useful for error handling in Lambda handlers
 */
export function addError(error: Error | unknown): void {
  if (!AWSXRay) return

  const segment = AWSXRay.getSegment()
  if (segment) {
    segment.addError(error)
  }
}
