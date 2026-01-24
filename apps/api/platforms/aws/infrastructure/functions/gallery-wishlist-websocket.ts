/**
 * Gallery, Wishlist, and WebSocket Lambda Functions
 *
 * Creates the remaining Lambda functions:
 * - Gallery (12 functions)
 * - Wishlist (8 functions)
 * - WebSocket (3 functions)
 */

export function createGalleryWishlistWebSocketFunctions(
  vpc: any,
  postgres: any,
  bucket: any,
  openSearch: any,
  websocketConnectionsTable: any,
  lambdaEmfPolicy: any,
  openSearchLambdaPolicy: any,
  stage: string,
) {
  // Base configuration
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

  // Gallery config with high memory for image processing
  const galleryConfig = {
    ...baseConfig,
    memory: '2048 MB',
    timeout: '60 seconds',
  }

  // WebSocket config
  const websocketConfig = {
    ...baseConfig,
    environment: {
      ...baseConfig.environment,
      WEBSOCKET_CONNECTIONS_TABLE: websocketConnectionsTable.name,
    },
    link: [...baseConfig.link, websocketConnectionsTable],
  }

  // ========================================
  // Gallery Functions
  // ========================================
  const uploadImageFunction = new sst.aws.Function('UploadImageFunction', {
    ...galleryConfig,
    handler: 'endpoints/gallery/upload-image/handler.handler',
  })

  // Attach EMF and OpenSearch policies
  new aws.iam.RolePolicyAttachment('UploadImageEmfPolicyAttachment', {
    role: uploadImageFunction.nodes.role.name,
    policyArn: lambdaEmfPolicy.arn,
  })
  new aws.iam.RolePolicyAttachment('UploadImageOpenSearchPolicyAttachment', {
    role: uploadImageFunction.nodes.role.name,
    policyArn: openSearchLambdaPolicy.arn,
  })

  const listImagesFunction = new sst.aws.Function('ListImagesFunction', {
    ...baseConfig,
    handler: 'endpoints/gallery/list-images/handler.handler',
    timeout: '30 seconds',
    memory: '512 MB',
  })

  const searchImagesFunction = new sst.aws.Function('SearchImagesFunction', {
    ...galleryConfig,
    handler: 'endpoints/gallery/search-images/handler.handler',
    timeout: '30 seconds',
    memory: '512 MB',
  })

  // Attach EMF and OpenSearch policies
  new aws.iam.RolePolicyAttachment('SearchImagesEmfPolicyAttachment', {
    role: searchImagesFunction.nodes.role.name,
    policyArn: lambdaEmfPolicy.arn,
  })
  new aws.iam.RolePolicyAttachment('SearchImagesOpenSearchPolicyAttachment', {
    role: searchImagesFunction.nodes.role.name,
    policyArn: openSearchLambdaPolicy.arn,
  })

  const getImageFunction = new sst.aws.Function('GetImageFunction', {
    ...baseConfig,
    handler: 'endpoints/gallery/get-image/handler.handler',
    timeout: '10 seconds',
    memory: '256 MB',
  })

  const updateImageFunction = new sst.aws.Function('UpdateImageFunction', {
    ...baseConfig,
    handler: 'endpoints/gallery/update-image/handler.handler',
    timeout: '30 seconds',
    memory: '512 MB',
  })

  const deleteImageFunction = new sst.aws.Function('DeleteImageFunction', {
    ...baseConfig,
    handler: 'endpoints/gallery/delete-image/handler.handler',
    timeout: '30 seconds',
    memory: '512 MB',
  })

  const flagImageFunction = new sst.aws.Function('FlagImageFunction', {
    ...baseConfig,
    handler: 'endpoints/gallery/flag-image/handler.handler',
    timeout: '10 seconds',
    memory: '256 MB',
  })

  const createAlbumFunction = new sst.aws.Function('CreateAlbumFunction', {
    ...baseConfig,
    handler: 'endpoints/gallery/create-album/handler.handler',
    timeout: '30 seconds',
    memory: '512 MB',
  })

  const listAlbumsFunction = new sst.aws.Function('ListAlbumsFunction', {
    ...baseConfig,
    handler: 'endpoints/gallery/list-albums/handler.handler',
    timeout: '30 seconds',
    memory: '512 MB',
  })

  const getAlbumFunction = new sst.aws.Function('GetAlbumFunction', {
    ...baseConfig,
    handler: 'endpoints/gallery/get-album/handler.handler',
    timeout: '30 seconds',
    memory: '512 MB',
  })

  const updateAlbumFunction = new sst.aws.Function('UpdateAlbumFunction', {
    ...baseConfig,
    handler: 'endpoints/gallery/update-album/handler.handler',
    timeout: '30 seconds',
    memory: '512 MB',
  })

  const deleteAlbumFunction = new sst.aws.Function('DeleteAlbumFunction', {
    ...baseConfig,
    handler: 'endpoints/gallery/delete-album/handler.handler',
    timeout: '30 seconds',
    memory: '512 MB',
  })

  // ========================================
  // Wishlist Functions
  // ========================================
  const listWishlistFunction = new sst.aws.Function('ListWishlistFunction', {
    ...baseConfig,
    handler: 'endpoints/wishlist/list-wishlist/handler.handler',
    timeout: '10 seconds',
    memory: '256 MB',
  })

  const getWishlistItemFunction = new sst.aws.Function('GetWishlistItemFunction', {
    ...baseConfig,
    handler: 'endpoints/wishlist/get-wishlist-item/handler.handler',
    timeout: '10 seconds',
    memory: '256 MB',
  })

  const createWishlistItemFunction = new sst.aws.Function('CreateWishlistItemFunction', {
    ...baseConfig,
    handler: 'endpoints/wishlist/create-wishlist-item/handler.handler',
    timeout: '15 seconds',
    memory: '512 MB',
  })

  const updateWishlistItemFunction = new sst.aws.Function('UpdateWishlistItemFunction', {
    ...baseConfig,
    handler: 'endpoints/wishlist/update-wishlist-item/handler.handler',
    timeout: '15 seconds',
    memory: '512 MB',
  })

  const deleteWishlistItemFunction = new sst.aws.Function('DeleteWishlistItemFunction', {
    ...baseConfig,
    handler: 'endpoints/wishlist/delete-wishlist-item/handler.handler',
    timeout: '15 seconds',
    memory: '512 MB',
  })

  const reorderWishlistFunction = new sst.aws.Function('ReorderWishlistFunction', {
    ...baseConfig,
    handler: 'endpoints/wishlist/reorder-wishlist/handler.handler',
    timeout: '20 seconds',
    memory: '512 MB',
  })

  const uploadWishlistImageFunction = new sst.aws.Function('UploadWishlistImageFunction', {
    ...baseConfig,
    handler: 'endpoints/wishlist/upload-wishlist-image/handler.handler',
    timeout: '60 seconds',
    memory: '1024 MB',
  })

  const searchWishlistFunction = new sst.aws.Function('SearchWishlistFunction', {
    ...baseConfig,
    handler: 'endpoints/wishlist/search-wishlist/handler.handler',
    timeout: '15 seconds',
    memory: '512 MB',
  })

  // ========================================
  // WebSocket Functions
  // ========================================
  const websocketConnectFunction = new sst.aws.Function('WebSocketConnectFunction', {
    ...websocketConfig,
    handler: 'endpoints/websocket/connect/handler.handler',
    timeout: '30 seconds',
    memory: '256 MB',
  })

  const websocketDisconnectFunction = new sst.aws.Function('WebSocketDisconnectFunction', {
    ...websocketConfig,
    handler: 'endpoints/websocket/disconnect/handler.handler',
    timeout: '30 seconds',
    memory: '256 MB',
  })

  const websocketDefaultFunction = new sst.aws.Function('WebSocketDefaultFunction', {
    ...websocketConfig,
    handler: 'endpoints/websocket/default/handler.handler',
    timeout: '30 seconds',
    memory: '256 MB',
  })

  return {
    // Gallery
    uploadImageFunction,
    listImagesFunction,
    searchImagesFunction,
    getImageFunction,
    updateImageFunction,
    deleteImageFunction,
    flagImageFunction,
    createAlbumFunction,
    listAlbumsFunction,
    getAlbumFunction,
    updateAlbumFunction,
    deleteAlbumFunction,

    // Wishlist
    listWishlistFunction,
    getWishlistItemFunction,
    createWishlistItemFunction,
    updateWishlistItemFunction,
    deleteWishlistItemFunction,
    reorderWishlistFunction,
    uploadWishlistImageFunction,
    searchWishlistFunction,

    // WebSocket
    websocketConnectFunction,
    websocketDisconnectFunction,
    websocketDefaultFunction,
  }
}
