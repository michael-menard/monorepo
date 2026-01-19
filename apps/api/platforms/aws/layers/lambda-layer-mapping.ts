/**
 * Lambda Layer Mapping
 *
 * Defines which Lambda functions use which layer combinations.
 * This mapping is used by:
 * 1. sst.config.ts - to assign correct layers to each function
 * 2. get-affected-lambdas.js - to determine which functions to deploy when layers change
 */

export type LayerType = 'minimal' | 'standard' | 'processing'

export interface LambdaFunctionConfig {
  /** Function name (matches SST resource name) */
  name: string
  /** Handler path relative to apps/api */
  handler: string
  /** Domain for grouping */
  domain: 'health' | 'gallery' | 'wishlist' | 'moc-instructions' | 'moc-parts-lists' | 'websocket'
  /** Layer combination */
  layers: LayerType[]
  /** Memory allocation (optional, defaults to 512MB) */
  memory?: number
  /** Timeout in seconds (optional, defaults to 30s) */
  timeout?: number
}

/**
 * Complete mapping of all Lambda functions and their layer requirements
 */
export const LAMBDA_FUNCTIONS: LambdaFunctionConfig[] = [
  // ========================================
  // Health Check (Minimal only)
  // ========================================
  {
    name: 'Health',
    handler: 'endpoints/health/handler.handler',
    domain: 'health',
    layers: ['minimal'],
    memory: 256,
    timeout: 10,
  },

  // ========================================
  // Gallery - CRUD Operations (Minimal + Standard)
  // ========================================
  {
    name: 'GalleryListAlbums',
    handler: 'endpoints/gallery/list-albums/handler.handler',
    domain: 'gallery',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'GalleryGetAlbum',
    handler: 'endpoints/gallery/get-album/handler.handler',
    domain: 'gallery',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'GalleryCreateAlbum',
    handler: 'endpoints/gallery/create-album/handler.handler',
    domain: 'gallery',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'GalleryUpdateAlbum',
    handler: 'endpoints/gallery/update-album/handler.handler',
    domain: 'gallery',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'GalleryDeleteAlbum',
    handler: 'endpoints/gallery/delete-album/handler.handler',
    domain: 'gallery',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'GalleryListImages',
    handler: 'endpoints/gallery/list-images/handler.handler',
    domain: 'gallery',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'GalleryGetImage',
    handler: 'endpoints/gallery/get-image/handler.handler',
    domain: 'gallery',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'GalleryDeleteImage',
    handler: 'endpoints/gallery/delete-image/handler.handler',
    domain: 'gallery',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'GalleryUpdateImage',
    handler: 'endpoints/gallery/update-image/handler.handler',
    domain: 'gallery',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'GallerySearchImages',
    handler: 'endpoints/gallery/search-images/handler.handler',
    domain: 'gallery',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'GalleryFlagImage',
    handler: 'endpoints/gallery/flag-image/handler.handler',
    domain: 'gallery',
    layers: ['minimal', 'standard'],
  },

  // ========================================
  // Gallery - Image Processing (Minimal + Standard + Processing)
  // ========================================
  {
    name: 'GalleryUploadImage',
    handler: 'endpoints/gallery/upload-image/handler.handler',
    domain: 'gallery',
    layers: ['minimal', 'standard', 'processing'],
    memory: 1024, // Sharp needs more memory
    timeout: 60, // Image processing can take time
  },

  // ========================================
  // Wishlist - CRUD Operations (Minimal + Standard)
  // ========================================
  {
    name: 'WishlistList',
    handler: 'endpoints/wishlist/list/handler.handler',
    domain: 'wishlist',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'WishlistGetItem',
    handler: 'endpoints/wishlist/get-item/handler.handler',
    domain: 'wishlist',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'WishlistCreateItem',
    handler: 'endpoints/wishlist/create-item/handler.handler',
    domain: 'wishlist',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'WishlistUpdateItem',
    handler: 'endpoints/wishlist/update-item/handler.handler',
    domain: 'wishlist',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'WishlistDeleteItem',
    handler: 'endpoints/wishlist/delete-item/handler.handler',
    domain: 'wishlist',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'WishlistReorder',
    handler: 'endpoints/wishlist/reorder/handler.handler',
    domain: 'wishlist',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'WishlistSearch',
    handler: 'endpoints/wishlist/search/handler.handler',
    domain: 'wishlist',
    layers: ['minimal', 'standard'],
  },

  // ========================================
  // Sets - Read-Only Gallery (Minimal + Standard)
  // ========================================
  {
    name: 'SetsList',
    handler: 'endpoints/sets/list/handler.handler',
    domain: 'sets',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'SetsGet',
    handler: 'endpoints/sets/get/handler.handler',
    domain: 'sets',
    layers: ['minimal', 'standard'],
  },

  // ========================================
  // Wishlist - Image Processing (Minimal + Standard + Processing)
  // ========================================
  {
    name: 'WishlistUploadImage',
    handler: 'endpoints/wishlist/upload-image/handler.handler',
    domain: 'wishlist',
    layers: ['minimal', 'standard', 'processing'],
    memory: 1024,
    timeout: 60,
  },

  // ========================================
  // MOC Instructions - CRUD Operations (Minimal + Standard)
  // ========================================
  {
    name: 'MocInstructionsList',
    handler: 'endpoints/moc-instructions/list/handler.handler',
    domain: 'moc-instructions',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'MocInstructionsDownloadFile',
    handler: 'endpoints/moc-instructions/download-file/handler.handler',
    domain: 'moc-instructions',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'MocInstructionsDeleteFile',
    handler: 'endpoints/moc-instructions/delete-file/handler.handler',
    domain: 'moc-instructions',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'MocInstructionsLinkGalleryImage',
    handler: 'endpoints/moc-instructions/link-gallery-image/handler.handler',
    domain: 'moc-instructions',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'MocInstructionsUnlinkGalleryImage',
    handler: 'endpoints/moc-instructions/unlink-gallery-image/handler.handler',
    domain: 'moc-instructions',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'MocInstructionsGetGalleryImages',
    handler: 'endpoints/moc-instructions/get-gallery-images/handler.handler',
    domain: 'moc-instructions',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'MocInstructionsGetStats',
    handler: 'endpoints/moc-instructions/get-stats/handler.handler',
    domain: 'moc-instructions',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'MocInstructionsGetUploadsOverTime',
    handler: 'endpoints/moc-instructions/get-uploads-over-time/handler.handler',
    domain: 'moc-instructions',
    layers: ['minimal', 'standard'],
  },

  // ========================================
  // MOC Instructions - File Processing (Minimal + Standard + Processing)
  // ========================================
  {
    name: 'MocInstructionsUploadFile',
    handler: 'endpoints/moc-instructions/upload-file/handler.handler',
    domain: 'moc-instructions',
    layers: ['minimal', 'standard', 'processing'],
    memory: 1024,
    timeout: 60,
  },
  {
    name: 'MocInstructionsInitializeWithFiles',
    handler: 'endpoints/moc-instructions/initialize-with-files/handler.handler',
    domain: 'moc-instructions',
    layers: ['minimal', 'standard', 'processing'],
    memory: 1024,
    timeout: 60,
  },
  {
    name: 'MocInstructionsFinalizeWithFiles',
    handler: 'endpoints/moc-instructions/finalize-with-files/handler.handler',
    domain: 'moc-instructions',
    layers: ['minimal', 'standard', 'processing'],
    memory: 1024,
    timeout: 60,
  },

  // ========================================
  // MOC Parts Lists - CRUD Operations (Minimal + Standard)
  // ========================================
  {
    name: 'MocPartsListsGet',
    handler: 'endpoints/moc-parts-lists/get/handler.handler',
    domain: 'moc-parts-lists',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'MocPartsListsCreate',
    handler: 'endpoints/moc-parts-lists/create/handler.handler',
    domain: 'moc-parts-lists',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'MocPartsListsUpdate',
    handler: 'endpoints/moc-parts-lists/update/handler.handler',
    domain: 'moc-parts-lists',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'MocPartsListsUpdateStatus',
    handler: 'endpoints/moc-parts-lists/update-status/handler.handler',
    domain: 'moc-parts-lists',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'MocPartsListsDelete',
    handler: 'endpoints/moc-parts-lists/delete/handler.handler',
    domain: 'moc-parts-lists',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'MocPartsListsGetUserSummary',
    handler: 'endpoints/moc-parts-lists/get-user-summary/handler.handler',
    domain: 'moc-parts-lists',
    layers: ['minimal', 'standard'],
  },

  // ========================================
  // MOC Parts Lists - File Processing (Minimal + Standard + Processing)
  // ========================================
  {
    name: 'MocPartsListsParse',
    handler: 'endpoints/moc-parts-lists/parse/handler.handler',
    domain: 'moc-parts-lists',
    layers: ['minimal', 'standard', 'processing'],
    memory: 512,
    timeout: 30,
  },

  // ========================================
  // WebSocket (Minimal + Standard)
  // ========================================
  {
    name: 'WebsocketConnect',
    handler: 'endpoints/websocket/connect/handler.handler',
    domain: 'websocket',
    layers: ['minimal', 'standard'],
    memory: 256,
    timeout: 10,
  },
  {
    name: 'WebsocketDisconnect',
    handler: 'endpoints/websocket/disconnect/handler.handler',
    domain: 'websocket',
    layers: ['minimal', 'standard'],
    memory: 256,
    timeout: 10,
  },
  {
    name: 'WebsocketDefault',
    handler: 'endpoints/websocket/default/handler.handler',
    domain: 'websocket',
    layers: ['minimal', 'standard'],
    memory: 256,
    timeout: 10,
  },
]

/**
 * Get functions that use a specific layer
 */
export function getFunctionsUsingLayer(layer: LayerType): LambdaFunctionConfig[] {
  return LAMBDA_FUNCTIONS.filter(fn => fn.layers.includes(layer))
}

/**
 * Get functions in a specific domain
 */
export function getFunctionsByDomain(
  domain: LambdaFunctionConfig['domain'],
): LambdaFunctionConfig[] {
  return LAMBDA_FUNCTIONS.filter(fn => fn.domain === domain)
}

/**
 * Get function configuration by name
 */
export function getFunctionConfig(name: string): LambdaFunctionConfig | undefined {
  return LAMBDA_FUNCTIONS.find(fn => fn.name === name)
}

/**
 * Get layer combination for a function
 */
export function getLayersForFunction(functionName: string): LayerType[] {
  const config = getFunctionConfig(functionName)
  return config?.layers || []
}
