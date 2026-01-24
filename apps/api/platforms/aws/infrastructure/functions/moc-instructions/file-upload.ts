/**
 * MOC File Upload Lambda Function
 *
 * Creates Lambda function for MOC file uploads:
 * - Handles multipart/form-data file uploads (single or multi-file)
 * - JWT authentication via Cognito
 * - Validates file type, size, and MIME type
 * - Uploads to S3 with metadata (parallel for multi-file)
 * - Creates database records
 */

import { createMocInstructionsConfig } from './_shared-config'

export function createMocFileUploadFunction(
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

  const mocFileUploadFunction = new sst.aws.Function('MocFileUploadFunction', {
    ...sharedConfig,
    handler: 'endpoints/moc-instructions/upload-file/handler.handler',
    timeout: '120 seconds', // 2 minutes for multi-file parallel uploads
    memory: '2048 MB', // Increased memory for parallel processing
    transform: {
      role: args => sharedConfig.transform.role(args, 'MocFileUpload'),
    },
  })

  return { mocFileUploadFunction }
}
