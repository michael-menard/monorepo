/**
 * MOC Instructions CRUD Lambda Function
 *
 * Creates Lambda function for MOC Instructions CRUD operations:
 * - Multi-method handler for CRUD operations
 * - JWT authentication via Cognito
 * - Connected to PostgreSQL, OpenSearch, S3
 */

import { createMocInstructionsConfig } from './_shared-config'

export function createMocInstructionsFunction(
  vpc: any,
  postgres: any,
  bucket: any,
  openSearch: any,
  lambdaEmfPolicy: any,
  openSearchLambdaPolicy: any,
  stage: string,
) {
  const sharedConfig = createMocInstructionsConfig(
    vpc,
    postgres,
    bucket,
    openSearch,
    lambdaEmfPolicy,
    openSearchLambdaPolicy,
    stage,
  )

  const mocInstructionsFunction = new sst.aws.Function('MocInstructionsFunction', {
    ...sharedConfig,
    handler: 'endpoints/moc-instructions/list/handler.handler',
    timeout: '30 seconds',
    memory: '512 MB',
    transform: {
      role: args => sharedConfig.transform.role(args, 'MocInstructions'),
    },
  })

  return { mocInstructionsFunction }
}
