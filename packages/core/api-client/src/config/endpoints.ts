/**
 * Serverless API Endpoint Definitions
 * Centralized endpoint configuration for all serverless APIs
 */

export const SERVERLESS_ENDPOINTS = {
  // Gallery API endpoints
  // Paths are relative to baseUrl ('/api'), proxy strips '/api' prefix
  GALLERY: {
    SEARCH: '/gallery/search',
    GET_IMAGE: '/gallery/images/{id}',
    GET_METADATA: '/gallery/images/{id}/metadata',
    UPLOAD: '/gallery/upload',
    DELETE: '/gallery/images/{id}',
  },

  // Unified Sets API endpoints (replaces wishlist + old sets)
  SETS: {
    LIST: '/sets',
    GET: '/sets/{id}',
    CREATE: '/sets',
    UPDATE: '/sets/{id}',
    DELETE: '/sets/{id}',
    PURCHASE: '/sets/{id}/purchase',
    BUILD_STATUS: '/sets/{id}/build-status',
    REORDER: '/sets/reorder',
    STORES: '/sets/stores',
    IMAGES_PRESIGN: '/sets/{id}/images/presign',
    IMAGES_REGISTER: '/sets/{id}/images',
    IMAGES_DELETE: '/sets/{id}/images/{imageId}',
  },

  /** @deprecated Use SETS instead */
  WISHLIST: {
    GET_ITEMS: '/wishlist',
    ADD_ITEM: '/wishlist',
    UPDATE_ITEM: '/wishlist/{id}',
    DELETE_ITEM: '/wishlist/{id}',
    SHARE: '/wishlist/share',
    GET_SHARED: '/wishlist/shared/{shareId}',
  },

  // MOC Instructions API endpoints
  // Story INST-1008: Wire RTK Query Mutations for MOC Instructions API
  // Backend routes are mounted at /instructions/mocs
  // Paths are relative to baseUrl ('/api'), proxy strips '/api' prefix
  MOC: {
    // Query endpoints
    SEARCH: '/instructions/mocs',
    GET_INSTRUCTION: '/instructions/mocs/{id}',
    GET_STEPS: '/instructions/mocs/{id}/steps',
    GET_PARTS_LIST: '/instructions/mocs/{id}/parts',

    // Mutation endpoints (INST-1008)
    CREATE: '/instructions/mocs',
    UPDATE: '/instructions/mocs/{id}',
    DELETE: '/instructions/mocs/{id}',

    // Tag operations
    SPLIT_TAG: '/instructions/mocs/tags/split',
    MERGE_TAGS: '/instructions/mocs/tags/merge',
    RENAME_TAG: '/instructions/mocs/tags/rename',
    SET_COVER: '/instructions/mocs/{id}/cover',
    CAPTURE_PDF_PAGES: '/instructions/mocs/{id}/pdf-captures',

    // File upload endpoints (INST-1008)
    UPLOAD_INSTRUCTION: '/instructions/mocs/{id}/files/instruction',
    UPLOAD_PARTS_LIST: '/instructions/mocs/{id}/files/{fileId}',
    UPLOAD_THUMBNAIL: '/instructions/mocs/{id}/thumbnail',
    DELETE_FILE: '/instructions/mocs/{id}/files/{fileId}',

    // File download endpoint (INST-1107)
    DOWNLOAD_FILE: '/instructions/mocs/{id}/files/{fileId}/download',

    // Presigned upload endpoints (INST-1105)
    CREATE_UPLOAD_SESSION: '/instructions/mocs/{id}/upload-sessions',
    COMPLETE_UPLOAD_SESSION: '/instructions/mocs/{id}/upload-sessions/{sessionId}/complete',

    // Legacy upload endpoint
    UPLOAD: '/instructions/mocs/upload',
  },

  // Upload API endpoints
  // Story BUGF-032: Frontend Integration for Presigned URL Upload
  // Paths are relative to baseUrl ('/api'), proxy strips '/api' prefix
  UPLOADS: {
    GENERATE_PRESIGNED_URL: '/uploads/presigned-url',
  },

  // User/Profile endpoints
  // Paths are relative to baseUrl ('/api'), proxy strips '/api' prefix
  USER: {
    GET_PROFILE: '/user/profile',
    UPDATE_PROFILE: '/user/profile',
    GET_PREFERENCES: '/user/preferences',
    UPDATE_PREFERENCES: '/user/preferences',
  },

  // Dashboard endpoints
  DASHBOARD: {
    STATS: '/dashboard/stats',
    TAGS: '/dashboard/tags',
    TAG: '/dashboard/tags/{tag}',
    THEMES: '/dashboard/themes',
    THEME: '/dashboard/themes/{name}',
    TAG_THEMES: '/dashboard/tag-themes',
    TAG_THEME: '/dashboard/tag-themes/{tag}/{theme}',
  },

  // Scraper endpoints
  SCRAPER: {
    TRIGGER: '/scraper/trigger',
    STATUS: '/scraper/status',
  },

  // Health and monitoring
  // Paths are relative to baseUrl ('/api'), proxy strips '/api' prefix
  HEALTH: {
    CHECK: '/health',
    METRICS: '/health/metrics',
  },
} as const

/**
 * Helper function to build endpoint URLs with path parameters
 * @param endpoint - The endpoint template (e.g., '/instructions/mocs/{id}')
 * @param params - Object with parameter values (e.g., { id: '123' })
 * @returns The endpoint with parameters replaced
 */
export function buildEndpoint(
  endpoint: string,
  params: Record<string, string | number> = {},
): string {
  let url = endpoint

  Object.entries(params).forEach(([key, value]) => {
    url = url.replace(`{${key}}`, String(value))
  })

  return url
}

/**
 * Endpoint categories for organizing API calls
 */
export const ENDPOINT_CATEGORIES = {
  GALLERY: 'gallery',
  WISHLIST: 'wishlist',
  MOC: 'moc',
  UPLOADS: 'uploads',
  USER: 'user',
  HEALTH: 'health',
} as const

export type EndpointCategory = (typeof ENDPOINT_CATEGORIES)[keyof typeof ENDPOINT_CATEGORIES]

/**
 * Get all endpoints for a specific category
 */
export function getEndpointsForCategory(category: EndpointCategory): Record<string, string> {
  switch (category) {
    case ENDPOINT_CATEGORIES.GALLERY:
      return SERVERLESS_ENDPOINTS.GALLERY
    case ENDPOINT_CATEGORIES.WISHLIST:
      return SERVERLESS_ENDPOINTS.WISHLIST
    case ENDPOINT_CATEGORIES.MOC:
      return SERVERLESS_ENDPOINTS.MOC
    case ENDPOINT_CATEGORIES.UPLOADS:
      return SERVERLESS_ENDPOINTS.UPLOADS
    case ENDPOINT_CATEGORIES.USER:
      return SERVERLESS_ENDPOINTS.USER
    case ENDPOINT_CATEGORIES.HEALTH:
      return SERVERLESS_ENDPOINTS.HEALTH
    default:
      return {}
  }
}
