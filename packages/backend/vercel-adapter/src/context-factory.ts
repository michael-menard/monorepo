/**
 * Lambda Context Factory
 *
 * Creates minimal Lambda context stub for Vercel runtime.
 * Only includes essential fields - does NOT mock business logic or AWS services.
 */

import type { LambdaContext } from './types.js'
import { randomUUID } from 'crypto'

/**
 * Create minimal Lambda context stub
 *
 * NOTE: This is a stub for runtime compatibility, NOT a mock of AWS services.
 * Real handlers should not depend heavily on context fields beyond requestId.
 *
 * Supported fields:
 * - requestId: Random UUID for request tracking
 * - functionName: Static identifier
 * - awsRequestId: Same as requestId (for compatibility)
 *
 * NOT supported (will throw if accessed):
 * - getRemainingTimeInMillis()
 * - callbackWaitsForEmptyEventLoop
 * - AWS-specific metadata
 */
export function createLambdaContext(): LambdaContext {
  const requestId = randomUUID()

  return {
    callbackWaitsForEmptyEventLoop: true,
    functionName: 'vercel-adapter-handler',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:aws:lambda:local:000000000000:function:vercel-adapter-handler',
    memoryLimitInMB: '1024',
    awsRequestId: requestId,
    logGroupName: '/aws/lambda/vercel-adapter-handler',
    logStreamName: `2024/01/01/[$LATEST]${requestId}`,
    getRemainingTimeInMillis: () => {
      throw new Error(
        'getRemainingTimeInMillis() is not supported in Vercel runtime. ' +
          'Refactor handler to avoid Lambda-specific context methods.',
      )
    },
    done: () => {},
    fail: () => {},
    succeed: () => {},
  }
}
