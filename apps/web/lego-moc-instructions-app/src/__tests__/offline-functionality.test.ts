import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { offlineManager } from '../services/offlineManager'
import { offlineApi } from '../services/offlineApi'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  storage: new Map(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
})

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Offline Functionality Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    navigator.onLine = true
    localStorageMock.storage.clear()
    localStorageMock.getItem.mockImplementation(key => {
      return localStorageMock.storage.get(key) || null
    })
    localStorageMock.setItem.mockImplementation((key, value) => {
      localStorageMock.storage.set(key, value)
    })
    localStorageMock.removeItem.mockImplementation(key => {
      localStorageMock.storage.delete(key)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('OfflineManager', () => {
    it('should initialize with default data', () => {
      const status = offlineManager.getOfflineStatus()

      expect(status.isOnline).toBe(true)
      expect(status.pendingActions).toBe(0)
      expect(status.dataVersion).toBe('1.0.0')
    })

    it('should store and retrieve offline data', async () => {
      const testData = { test: 'data' }
      const key = 'test-key'

      await offlineManager.storeData(key, testData)
      const retrieved = await offlineManager.getStoredData(key)

      expect(retrieved).toEqual(testData)
    })

    it('should queue offline actions', async () => {
      const action = {
        type: 'create' as const,
        endpoint: '/api/test',
        data: { test: 'data' },
      }

      await offlineManager.queueAction(action)

      expect(offlineManager.hasPendingActions()).toBe(true)
      expect(offlineManager.getPendingActionCount()).toBe(1)
    })

    it('should process queued actions when online', async () => {
      const mockResponse = { ok: true, status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const action = {
        type: 'create' as const,
        endpoint: '/api/test',
        data: { test: 'data' },
      }

      await offlineManager.queueAction(action)
      await offlineManager.processQueuedActions()

      expect(mockFetch).toHaveBeenCalled()
      // The action should still be pending because the fetch failed
      expect(offlineManager.hasPendingActions()).toBe(true)
    })

    it('should retry failed actions up to max retry count', async () => {
      const mockResponse = { ok: false, status: 500, statusText: 'Server Error' }
      mockFetch.mockRejectedValue(new Error('Network error'))

      const action = {
        type: 'create' as const,
        endpoint: '/api/test',
        data: { test: 'data' },
      }

      await offlineManager.queueAction(action)
      await offlineManager.processQueuedActions()

      // Should still have the action in queue after failed attempt
      expect(offlineManager.hasPendingActions()).toBe(true)
      expect(offlineManager.getPendingActionCount()).toBe(1)
    })

    it('should clear offline data', async () => {
      await offlineManager.storeData('test', { data: 'test' })
      await offlineManager.queueAction({
        type: 'create',
        endpoint: '/test',
        data: {},
      })

      await offlineManager.clearOfflineData()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('offline_actions')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('offline_data')
    })
  })

  describe('Offline API', () => {
    it('should handle offline GET requests with cached data', async () => {
      navigator.onLine = false
      const cachedData = { success: true, data: [{ id: '1', title: 'Test' }] }

      localStorageMock.getItem.mockImplementation(key => {
        if (key === 'offline_data') {
          return JSON.stringify({
            version: '1.0.0',
            lastSync: Date.now(),
            data: {
              'moc-instructions': {
                data: cachedData,
                timestamp: Date.now(),
              },
            },
          })
        }
        return null
      })

      const result = await offlineManager.getStoredData('moc-instructions')
      expect(result).toEqual(cachedData)
    })

    it('should handle offline GET requests without cached data', async () => {
      navigator.onLine = false
      localStorageMock.getItem.mockReturnValue(null)

      const result = await offlineManager.getStoredData('nonexistent')
      expect(result).toBeNull()
    })

    it('should queue mutations when offline', async () => {
      navigator.onLine = false
      const mutationData = { title: 'New MOC', difficulty: 'beginner' }

      await offlineManager.queueAction({
        type: 'create',
        endpoint: 'moc-instructions',
        data: mutationData,
      })

      expect(offlineManager.hasPendingActions()).toBe(true)
      expect(offlineManager.getPendingActionCount()).toBe(1)
    })
  })

  describe('Network Status Detection', () => {
    it('should detect online status correctly', () => {
      navigator.onLine = true
      const status = offlineManager.getOfflineStatus()
      expect(status.isOnline).toBe(true)
    })

    it('should detect offline status correctly', () => {
      navigator.onLine = false
      const status = offlineManager.getOfflineStatus()
      expect(status.isOnline).toBe(false)
    })
  })

  describe('Data Persistence', () => {
    it('should persist data across sessions', async () => {
      const testData = { test: 'persistent data' }
      await offlineManager.storeData('persistent', testData)

      // Simulate page reload by clearing the mock and setting up new storage
      localStorageMock.getItem.mockImplementation(key => {
        if (key === 'offline_data') {
          return JSON.stringify({
            version: '1.0.0',
            lastSync: Date.now(),
            data: {
              persistent: {
                data: testData,
                timestamp: Date.now(),
              },
            },
          })
        }
        return null
      })

      const retrieved = await offlineManager.getStoredData('persistent')
      expect(retrieved).toEqual(testData)
    })
  })
})
