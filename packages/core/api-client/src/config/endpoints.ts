/**
 * Serverless API Endpoint Definitions
 * Centralized endpoint configuration for all serverless APIs
 */

export const SERVERLESS_ENDPOINTS = {
  // Gallery API endpoints
  GALLERY: {
    SEARCH: '/api/v2/gallery/search',
    GET_IMAGE: '/api/v2/gallery/images/{id}',
    GET_METADATA: '/api/v2/gallery/images/{id}/metadata',
    UPLOAD: '/api/v2/gallery/upload',
    DELETE: '/api/v2/gallery/images/{id}',
  },

  // Wishlist API endpoints
  WISHLIST: {
    GET_ITEMS: '/api/v2/wishlist/items',
    ADD_ITEM: '/api/v2/wishlist/items',
    UPDATE_ITEM: '/api/v2/wishlist/items/{id}',
    DELETE_ITEM: '/api/v2/wishlist/items/{id}',
    SHARE: '/api/v2/wishlist/share',
    GET_SHARED: '/api/v2/wishlist/shared/{shareId}',
  },

  // MOC Instructions API endpoints
  MOC: {
    SEARCH: '/api/v2/mocs/search',
    GET_INSTRUCTION: '/api/v2/mocs/{id}',
    GET_STEPS: '/api/v2/mocs/{id}/steps',
    GET_PARTS_LIST: '/api/v2/mocs/{id}/parts',
    UPLOAD: '/api/v2/mocs/upload',
    UPDATE: '/api/v2/mocs/{id}',
    DELETE: '/api/v2/mocs/{id}',
  },

  // User/Profile endpoints
  USER: {
    GET_PROFILE: '/api/v2/user/profile',
    UPDATE_PROFILE: '/api/v2/user/profile',
    GET_PREFERENCES: '/api/v2/user/preferences',
    UPDATE_PREFERENCES: '/api/v2/user/preferences',
  },

  // Health and monitoring
  HEALTH: {
    CHECK: '/api/v2/health',
    METRICS: '/api/v2/health/metrics',
  },
} as const

/**
 * Helper function to build endpoint URLs with path parameters
 * @param endpoint - The endpoint template (e.g., '/api/v2/mocs/{id}')
 * @param params - Object with parameter values (e.g., { id: '123' })
 * @returns The endpoint with parameters replaced
 */
export function buildEndpoint(endpoint: string, params: Record<string, string | number> = {}): string {
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
  USER: 'user',
  HEALTH: 'health',
} as const

export type EndpointCategory = typeof ENDPOINT_CATEGORIES[keyof typeof ENDPOINT_CATEGORIES]

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
    case ENDPOINT_CATEGORIES.USER:
      return SERVERLESS_ENDPOINTS.USER
    case ENDPOINT_CATEGORIES.HEALTH:
      return SERVERLESS_ENDPOINTS.HEALTH
    default:
      return {}
  }
}
