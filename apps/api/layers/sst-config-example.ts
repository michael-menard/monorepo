/**
 * Example SST Config Integration for Lambda Layers
 *
 * This file shows how to integrate Lambda layers into your sst.config.ts
 * Copy the relevant sections into your sst.config.ts file.
 *
 * IMPORTANT: SST v3 (Ion) does not have built-in support for creating Lambda layers.
 * Layers must be built and deployed separately using the build-and-deploy-layers.sh script.
 * This example shows how to reference the deployed layer ARNs in your SST configuration.
 */

import { getLayerArns } from './get-layer-arns'
import { LAMBDA_FUNCTIONS } from './lambda-layer-mapping'

// ========================================
// In your sst.config.ts run() function:
// ========================================

export default $config({
  app(input) {
    return {
      name: 'lego-api-serverless',
      // ...
    }
  },
  async run() {
    const stage = $app.stage

    // ========================================
    // 1. Get Layer ARNs
    // ========================================
    const layers = getLayerArns(stage)

    // Optional: Validate that layers exist
    // This will throw an error if layers haven't been deployed
    // Comment out if you want to allow deployment without layers
    // validateLayerArns(layers)

    // ========================================
    // 2. Define Lambda Functions with Layers
    // ========================================

    // Example: Single function
    const health = new sst.aws.Function('Health', {
      handler: 'endpoints/health/handler.handler',
      layers: layers.minimal, // Minimal layer only
      memory: '256 MB',
      timeout: '10 seconds',
      url: true,
    })

    // Example: Function with multiple layers
    const galleryUploadImage = new sst.aws.Function('GalleryUploadImage', {
      handler: 'endpoints/gallery/upload-image/handler.handler',
      layers: layers.all, // Minimal + Standard + Processing
      memory: '1024 MB', // Sharp needs more memory
      timeout: '60 seconds',
      url: true,
    })

    // ========================================
    // 3. Create All Functions Using Mapping
    // ========================================

    // This approach uses the lambda-layer-mapping.ts to automatically
    // configure all functions with the correct layers

    const functions: Record<string, any> = {}

    for (const config of LAMBDA_FUNCTIONS) {
      // Determine which layer combination to use
      let functionLayers: string[] = []

      if (config.layers.includes('processing')) {
        functionLayers = layers.all // All three layers
      } else if (config.layers.includes('standard')) {
        functionLayers = layers.minimalStandard // Minimal + Standard
      } else {
        functionLayers = layers.minimal // Minimal only
      }

      // Create the function
      functions[config.name] = new sst.aws.Function(config.name, {
        handler: config.handler,
        layers: functionLayers,
        memory: `${config.memory || 512} MB`,
        timeout: `${config.timeout || 30} seconds`,
        url: true,
        environment: {
          STAGE: stage,
          // Add other environment variables here
        },
      })
    }

    // ========================================
    // 4. Create API Gateway with Routes
    // ========================================

    const api = new sst.aws.ApiGatewayV2('Api', {
      cors: {
        allowOrigins: ['*'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowHeaders: ['*'],
      },
    })

    // Health check
    api.route('GET /health', functions.Health)

    // Gallery routes
    api.route('GET /api/albums', functions.GalleryListAlbums)
    api.route('GET /api/albums/{id}', functions.GalleryGetAlbum)
    api.route('POST /api/albums', functions.GalleryCreateAlbum)
    api.route('PUT /api/albums/{id}', functions.GalleryUpdateAlbum)
    api.route('DELETE /api/albums/{id}', functions.GalleryDeleteAlbum)
    api.route('GET /api/images', functions.GalleryListImages)
    api.route('GET /api/images/{id}', functions.GalleryGetImage)
    api.route('POST /api/images', functions.GalleryUploadImage)
    api.route('PUT /api/images/{id}', functions.GalleryUpdateImage)
    api.route('DELETE /api/images/{id}', functions.GalleryDeleteImage)
    api.route('GET /api/images/search', functions.GallerySearchImages)
    api.route('PATCH /api/images/{id}/flag', functions.GalleryFlagImage)

    // Wishlist routes
    api.route('GET /api/wishlist', functions.WishlistList)
    api.route('GET /api/wishlist/{id}', functions.WishlistGetItem)
    api.route('POST /api/wishlist', functions.WishlistCreateItem)
    api.route('PUT /api/wishlist/{id}', functions.WishlistUpdateItem)
    api.route('DELETE /api/wishlist/{id}', functions.WishlistDeleteItem)
    api.route('POST /api/wishlist/reorder', functions.WishlistReorder)
    api.route('GET /api/wishlist/search', functions.WishlistSearch)
    api.route('POST /api/wishlist/{id}/image', functions.WishlistUploadImage)

    // MOC Instructions routes
    api.route('GET /api/moc-instructions', functions.MocInstructionsList)
    api.route('POST /api/moc-instructions/upload', functions.MocInstructionsUploadFile)
    api.route('POST /api/moc-instructions/initialize', functions.MocInstructionsInitializeWithFiles)
    api.route('POST /api/moc-instructions/finalize', functions.MocInstructionsFinalizeWithFiles)
    api.route('GET /api/moc-instructions/{id}/download', functions.MocInstructionsDownloadFile)
    api.route('DELETE /api/moc-instructions/{id}/file', functions.MocInstructionsDeleteFile)
    api.route(
      'POST /api/moc-instructions/{id}/gallery-image',
      functions.MocInstructionsLinkGalleryImage,
    )
    api.route(
      'DELETE /api/moc-instructions/{id}/gallery-image/{imageId}',
      functions.MocInstructionsUnlinkGalleryImage,
    )
    api.route(
      'GET /api/moc-instructions/{id}/gallery-images',
      functions.MocInstructionsGetGalleryImages,
    )
    api.route('GET /api/moc-instructions/stats', functions.MocInstructionsGetStats)
    api.route(
      'GET /api/moc-instructions/uploads-over-time',
      functions.MocInstructionsGetUploadsOverTime,
    )

    // MOC Parts Lists routes
    api.route('GET /api/moc-parts-lists', functions.MocPartsListsGet)
    api.route('POST /api/moc-parts-lists', functions.MocPartsListsCreate)
    api.route('PUT /api/moc-parts-lists/{id}', functions.MocPartsListsUpdate)
    api.route('PATCH /api/moc-parts-lists/{id}/status', functions.MocPartsListsUpdateStatus)
    api.route('DELETE /api/moc-parts-lists/{id}', functions.MocPartsListsDelete)
    api.route('GET /api/moc-parts-lists/summary', functions.MocPartsListsGetUserSummary)
    api.route('POST /api/moc-parts-lists/parse', functions.MocPartsListsParse)

    // WebSocket API (separate from HTTP API)
    const wsApi = new sst.aws.ApiGatewayWebSocket('WebSocketApi')
    wsApi.route('$connect', functions.WebsocketConnect)
    wsApi.route('$disconnect', functions.WebsocketDisconnect)
    wsApi.route('$default', functions.WebsocketDefault)

    // ========================================
    // 5. Return Outputs
    // ========================================

    return {
      api: api.url,
      wsApi: wsApi.url,
      layers: {
        minimal: layers.minimal[0],
        standard: layers.standard[0],
        processing: layers.processing[0],
      },
    }
  },
})

// ========================================
// Alternative Approach: Individual Function Definitions
// ========================================

// If you prefer explicit control over each function, you can define them individually:

/*
async run() {
  const stage = $app.stage
  const layers = getLayerArns(stage)

  // Health Check (minimal only)
  const health = new sst.aws.Function('Health', {
    handler: 'endpoints/health/handler.handler',
    layers: layers.minimal,
    memory: '256 MB',
    timeout: '10 seconds',
  })

  // Gallery - List Albums (minimal + standard)
  const galleryListAlbums = new sst.aws.Function('GalleryListAlbums', {
    handler: 'endpoints/gallery/list-albums/handler.handler',
    layers: layers.minimalStandard,
    memory: '512 MB',
    timeout: '30 seconds',
  })

  // Gallery - Upload Image (all layers)
  const galleryUploadImage = new sst.aws.Function('GalleryUploadImage', {
    handler: 'endpoints/gallery/upload-image/handler.handler',
    layers: layers.all,
    memory: '1024 MB',
    timeout: '60 seconds',
  })

  // ... Define remaining ~40 functions
}
*/

// ========================================
// Environment Variables Approach
// ========================================

// Instead of reading from files, you can use environment variables:

/*
# In your CI/CD or local environment
export MINIMAL_LAYER_ARN=arn:aws:lambda:us-east-1:123456789012:layer:lego-api-minimal-layer-dev:1
export STANDARD_LAYER_ARN=arn:aws:lambda:us-east-1:123456789012:layer:lego-api-standard-layer-dev:2
export PROCESSING_LAYER_ARN=arn:aws:lambda:us-east-1:123456789012:layer:lego-api-processing-layer-dev:3

# The getLayerArns() function will automatically use these if available
*/
