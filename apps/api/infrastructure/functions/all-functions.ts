/**
 * All Lambda Functions for LEGO API Serverless
 *
 * Creates all Lambda functions organized by domain:
 * - Health Check
 * - MOC Instructions (12 functions)
 * - MOC Parts Lists (7 functions)
 * - Gallery (12 functions)
 * - Wishlist (8 functions)
 * - WebSocket (3 functions)
 */

export function createAllFunctions(
  vpc: any,
  postgres: any,
  bucket: any,
  openSearch: any,
  websocketConnectionsTable: any,
  lambdaEmfPolicy: any,
  openSearchLambdaPolicy: any,
  stage: string
) {
  // Shared configuration for all functions
  const baseConfig = {
    runtime: 'nodejs20.x',
    vpc,
    environment: {
      DATABASE_URL: postgres.connectionString,
      S3_BUCKET_NAME: bucket.name,
      OPENSEARCH_ENDPOINT: openSearch.endpoint,
      STAGE: stage,
    },
    link: [postgres, bucket, openSearch],
  }

  // Enhanced config for functions that need OpenSearch
  const searchConfig = {
    ...baseConfig,
  }

  // WebSocket config with DynamoDB access
  const websocketConfig = {
    ...baseConfig,
    environment: {
      ...baseConfig.environment,
      WEBSOCKET_CONNECTIONS_TABLE: websocketConnectionsTable.name,
    },
    link: [...baseConfig.link, websocketConnectionsTable],
  }

  // Gallery config with high memory for image processing
  const galleryConfig = {
    ...searchConfig,
    memory: '2048 MB', // Required for Sharp image processing
    timeout: '60 seconds',
  }

  // ========================================
  // MOC Instructions Functions
  // ========================================
  const mocInstructionsFunction = new sst.aws.Function('MocInstructionsFunction', {
    ...searchConfig,
    handler: 'endpoints/moc-instructions/list/handler.handler',
    timeout: '30 seconds',
    memory: '512 MB',
  })

  // Attach EMF and OpenSearch policies
  new aws.iam.RolePolicyAttachment('MocInstructionsEmfPolicyAttachment', {
    role: mocInstructionsFunction.nodes.role.name,
    policyArn: lambdaEmfPolicy.arn,
  })
  new aws.iam.RolePolicyAttachment('MocInstructionsOpenSearchPolicyAttachment', {
    role: mocInstructionsFunction.nodes.role.name,
    policyArn: openSearchLambdaPolicy.arn,
  })

  const mocFileUploadFunction = new sst.aws.Function('MocFileUploadFunction', {
    ...searchConfig,
    handler: 'endpoints/moc-instructions/upload-file/handler.handler',
    timeout: '120 seconds',
    memory: '2048 MB',
  })

  // Attach EMF and OpenSearch policies
  new aws.iam.RolePolicyAttachment('MocFileUploadEmfPolicyAttachment', {
    role: mocFileUploadFunction.nodes.role.name,
    policyArn: lambdaEmfPolicy.arn,
  })
  new aws.iam.RolePolicyAttachment('MocFileUploadOpenSearchPolicyAttachment', {
    role: mocFileUploadFunction.nodes.role.name,
    policyArn: openSearchLambdaPolicy.arn,
  })

  const mocFileDownloadFunction = new sst.aws.Function('MocFileDownloadFunction', {
    ...baseConfig,
    handler: 'endpoints/moc-instructions/download-file/handler.handler',
    timeout: '10 seconds',
    memory: '256 MB',
  })

  const mocFileDeleteFunction = new sst.aws.Function('MocFileDeleteFunction', {
    ...baseConfig,
    handler: 'endpoints/moc-instructions/delete-file/handler.handler',
    timeout: '10 seconds',
    memory: '256 MB',
  })

  const uploadPartsListFunction = new sst.aws.Function('UploadPartsListFunction', {
    ...baseConfig,
    handler: 'endpoints/moc-instructions/upload-parts-list/handler.handler',
    timeout: '30 seconds',
    memory: '512 MB',
  })

  const initializeMocWithFilesFunction = new sst.aws.Function('InitializeMocWithFilesFunction', {
    ...baseConfig,
    handler: 'endpoints/moc-instructions/initialize-with-files/handler.handler',
    timeout: '30 seconds',
    memory: '512 MB',
  })

  const finalizeMocWithFilesFunction = new sst.aws.Function('FinalizeMocWithFilesFunction', {
    ...searchConfig,
    handler: 'endpoints/moc-instructions/finalize-with-files/handler.handler',
    timeout: '30 seconds',
    memory: '512 MB',
  })

  // Attach EMF and OpenSearch policies
  new aws.iam.RolePolicyAttachment('FinalizeMocWithFilesEmfPolicyAttachment', {
    role: finalizeMocWithFilesFunction.nodes.role.name,
    policyArn: lambdaEmfPolicy.arn,
  })
  new aws.iam.RolePolicyAttachment('FinalizeMocWithFilesOpenSearchPolicyAttachment', {
    role: finalizeMocWithFilesFunction.nodes.role.name,
    policyArn: openSearchLambdaPolicy.arn,
  })

  // More MOC Instructions Functions
  const linkGalleryImageFunction = new sst.aws.Function('LinkGalleryImageFunction', {
    ...baseConfig,
    handler: 'endpoints/moc-instructions/link-gallery-image/handler.handler',
    timeout: '10 seconds',
    memory: '256 MB',
  })

  const unlinkGalleryImageFunction = new sst.aws.Function('UnlinkGalleryImageFunction', {
    ...baseConfig,
    handler: 'endpoints/moc-instructions/unlink-gallery-image/handler.handler',
    timeout: '10 seconds',
    memory: '256 MB',
  })

  const getMocGalleryImagesFunction = new sst.aws.Function('GetMocGalleryImagesFunction', {
    ...baseConfig,
    handler: 'endpoints/moc-instructions/get-gallery-images/handler.handler',
    timeout: '10 seconds',
    memory: '256 MB',
  })

  const getMocStatsByCategoryFunction = new sst.aws.Function('GetMocStatsByCategoryFunction', {
    ...baseConfig,
    handler: 'endpoints/moc-instructions/get-stats/handler.handler',
    timeout: '15 seconds',
    memory: '512 MB',
  })

  const getMocUploadsOverTimeFunction = new sst.aws.Function('GetMocUploadsOverTimeFunction', {
    ...baseConfig,
    handler: 'endpoints/moc-instructions/get-uploads-over-time/handler.handler',
    timeout: '15 seconds',
    memory: '512 MB',
  })

  // ========================================
  // MOC Parts Lists Functions
  // ========================================
  const getPartsListsFunction = new sst.aws.Function('GetPartsListsFunction', {
    ...baseConfig,
    handler: 'endpoints/moc-parts-lists/get/handler.handler',
    timeout: '10 seconds',
    memory: '256 MB',
  })

  const createPartsListFunction = new sst.aws.Function('CreatePartsListFunction', {
    ...baseConfig,
    handler: 'endpoints/moc-parts-lists/create/handler.handler',
    timeout: '30 seconds',
    memory: '512 MB',
  })

  const updatePartsListFunction = new sst.aws.Function('UpdatePartsListFunction', {
    ...baseConfig,
    handler: 'endpoints/moc-parts-lists/update/handler.handler',
    timeout: '30 seconds',
    memory: '512 MB',
  })

  const updatePartsListStatusFunction = new sst.aws.Function('UpdatePartsListStatusFunction', {
    ...baseConfig,
    handler: 'endpoints/moc-parts-lists/update-status/handler.handler',
    timeout: '10 seconds',
    memory: '256 MB',
  })

  const deletePartsListFunction = new sst.aws.Function('DeletePartsListFunction', {
    ...baseConfig,
    handler: 'endpoints/moc-parts-lists/delete/handler.handler',
    timeout: '10 seconds',
    memory: '256 MB',
  })

  const parsePartsListFunction = new sst.aws.Function('ParsePartsListFunction', {
    ...baseConfig,
    handler: 'endpoints/moc-parts-lists/parse/handler.handler',
    timeout: '5 minutes',
    memory: '512 MB',
  })

  const getUserPartsListsSummaryFunction = new sst.aws.Function('GetUserPartsListsSummaryFunction', {
    ...baseConfig,
    handler: 'endpoints/moc-parts-lists/get-user-summary/handler.handler',
    timeout: '20 seconds',
    memory: '512 MB',
  })

  return {
    // MOC Instructions
    mocInstructionsFunction,
    mocFileUploadFunction,
    mocFileDownloadFunction,
    mocFileDeleteFunction,
    uploadPartsListFunction,
    initializeMocWithFilesFunction,
    finalizeMocWithFilesFunction,
    linkGalleryImageFunction,
    unlinkGalleryImageFunction,
    getMocGalleryImagesFunction,
    getMocStatsByCategoryFunction,
    getMocUploadsOverTimeFunction,

    // MOC Parts Lists
    getPartsListsFunction,
    createPartsListFunction,
    updatePartsListFunction,
    updatePartsListStatusFunction,
    deletePartsListFunction,
    parsePartsListFunction,
    getUserPartsListsSummaryFunction,
  }
}
