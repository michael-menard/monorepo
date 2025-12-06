/**
 * Instructions API Tests
 * Story 3.1.3: Instructions Gallery API Endpoints
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import {
  createInstructionsApi,
  instructionsApi,
} from '../rtk/instructions-api'

// Mock dependencies
vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

vi.mock('../lib/performance', () => ({
  performanceMonitor: {
    trackComponentRender: vi.fn(),
  },
}))

vi.mock('@repo/cache/utils/serverlessCacheManager', () => ({
  getServerlessCacheManager: vi.fn(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn(),
  })),
}))

vi.mock('../auth/rtk-auth-integration', () => ({
  createAuthenticatedBaseQuery: vi.fn(() => vi.fn()),
}))

// Mock performance API
Object.defineProperty(global, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
  },
  writable: true,
})

// Test store setup
function createTestStore() {
  return configureStore({
    reducer: {
      [instructionsApi.reducerPath]: instructionsApi.reducer,
    },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(instructionsApi.middleware),
  })
}

describe('Instructions API', () => {
  let store: ReturnType<typeof createTestStore>

  beforeEach(() => {
    vi.clearAllMocks()
    store = createTestStore()
  })

  afterEach(() => {
    store.dispatch(instructionsApi.util.resetApiState())
  })

  describe('API Creation', () => {
    it('should create instructions API with correct reducer path', () => {
      const api = createInstructionsApi()

      expect(api).toBeDefined()
      expect(api.reducerPath).toBe('instructionsApi')
      expect(api.endpoints).toBeDefined()
    })

    it('should have all required endpoints', () => {
      const api = createInstructionsApi()

      expect(api.endpoints.getInstructions).toBeDefined()
      expect(api.endpoints.getInstructionById).toBeDefined()
      expect(api.endpoints.toggleInstructionFavorite).toBeDefined()
    })

    it('should accept custom config options', () => {
      const mockAuthFailure = vi.fn()
      const mockTokenRefresh = vi.fn()

      const api = createInstructionsApi({
        getAuthToken: () => 'test-token',
        onAuthFailure: mockAuthFailure,
        onTokenRefresh: mockTokenRefresh,
      })

      expect(api).toBeDefined()
      expect(api.reducerPath).toBe('instructionsApi')
    })
  })

  describe('getInstructions Endpoint', () => {
    it('should have getInstructions endpoint defined', () => {
      const api = createInstructionsApi()

      expect(api.endpoints.getInstructions).toBeDefined()
    })

    it('should be a query type endpoint', () => {
      const api = createInstructionsApi()
      const endpoint = api.endpoints.getInstructions

      // Query endpoints have specific properties
      expect(endpoint).toHaveProperty('initiate')
      expect(endpoint).toHaveProperty('select')
    })
  })

  describe('getInstructionById Endpoint', () => {
    it('should have getInstructionById endpoint defined', () => {
      const api = createInstructionsApi()

      expect(api.endpoints.getInstructionById).toBeDefined()
    })

    it('should be a query type endpoint', () => {
      const api = createInstructionsApi()
      const endpoint = api.endpoints.getInstructionById

      expect(endpoint).toHaveProperty('initiate')
      expect(endpoint).toHaveProperty('select')
    })
  })

  describe('toggleInstructionFavorite Mutation', () => {
    it('should have toggleInstructionFavorite endpoint defined', () => {
      const api = createInstructionsApi()

      expect(api.endpoints.toggleInstructionFavorite).toBeDefined()
    })

    it('should be a mutation type endpoint', () => {
      const api = createInstructionsApi()
      const endpoint = api.endpoints.toggleInstructionFavorite

      // Mutation endpoints have initiate property
      expect(endpoint).toHaveProperty('initiate')
    })
  })

  describe('Tag Types', () => {
    it('should be configured with correct reducer path', () => {
      const api = createInstructionsApi()
      expect(api.reducerPath).toBe('instructionsApi')
    })

    it('should create a valid Redux reducer', () => {
      const api = createInstructionsApi()
      expect(api.reducer).toBeDefined()
      expect(typeof api.reducer).toBe('function')
    })

    it('should create valid middleware', () => {
      const api = createInstructionsApi()
      expect(api.middleware).toBeDefined()
      expect(typeof api.middleware).toBe('function')
    })
  })

  describe('Export Hooks', () => {
    it('should export useGetInstructionsQuery hook', async () => {
      const { useGetInstructionsQuery } = await import('../rtk/instructions-api')
      expect(useGetInstructionsQuery).toBeDefined()
      expect(typeof useGetInstructionsQuery).toBe('function')
    })

    it('should export useLazyGetInstructionsQuery hook', async () => {
      const { useLazyGetInstructionsQuery } = await import('../rtk/instructions-api')
      expect(useLazyGetInstructionsQuery).toBeDefined()
      expect(typeof useLazyGetInstructionsQuery).toBe('function')
    })

    it('should export useGetInstructionByIdQuery hook', async () => {
      const { useGetInstructionByIdQuery } = await import('../rtk/instructions-api')
      expect(useGetInstructionByIdQuery).toBeDefined()
      expect(typeof useGetInstructionByIdQuery).toBe('function')
    })

    it('should export useLazyGetInstructionByIdQuery hook', async () => {
      const { useLazyGetInstructionByIdQuery } = await import('../rtk/instructions-api')
      expect(useLazyGetInstructionByIdQuery).toBeDefined()
      expect(typeof useLazyGetInstructionByIdQuery).toBe('function')
    })

    it('should export useToggleInstructionFavoriteMutation hook', async () => {
      const { useToggleInstructionFavoriteMutation } = await import('../rtk/instructions-api')
      expect(useToggleInstructionFavoriteMutation).toBeDefined()
      expect(typeof useToggleInstructionFavoriteMutation).toBe('function')
    })
  })

  describe('API Utility Methods', () => {
    it('should have util.resetApiState method', () => {
      const api = createInstructionsApi()
      expect(api.util.resetApiState).toBeDefined()
    })

    it('should have util.updateQueryData method', () => {
      const api = createInstructionsApi()
      expect(api.util.updateQueryData).toBeDefined()
    })

    it('should have util.invalidateTags method', () => {
      const api = createInstructionsApi()
      expect(api.util.invalidateTags).toBeDefined()
    })
  })

  describe('Store Integration', () => {
    it('should integrate with Redux store', () => {
      const testStore = createTestStore()
      const state = testStore.getState()

      expect(state).toHaveProperty('instructionsApi')
    })

    it('should reset API state correctly', () => {
      const testStore = createTestStore()
      testStore.dispatch(instructionsApi.util.resetApiState())

      const state = testStore.getState()
      expect(state.instructionsApi).toBeDefined()
    })
  })

  describe('GetInstructionsParams Type', () => {
    it('should accept search parameter', async () => {
      const { instructionsApi: api } = await import('../rtk/instructions-api')

      // Verify the endpoint accepts parameters by checking it doesn't throw
      expect(() => {
        api.endpoints.getInstructions.initiate({ search: 'castle' })
      }).not.toThrow()
    })

    it('should accept pagination parameters', async () => {
      const { instructionsApi: api } = await import('../rtk/instructions-api')

      expect(() => {
        api.endpoints.getInstructions.initiate({ page: 1, limit: 20 })
      }).not.toThrow()
    })

    it('should accept filter parameters', async () => {
      const { instructionsApi: api } = await import('../rtk/instructions-api')

      expect(() => {
        api.endpoints.getInstructions.initiate({
          tags: ['medieval'],
          theme: 'Castle',
          sort: 'name',
          order: 'asc',
        })
      }).not.toThrow()
    })
  })
})
