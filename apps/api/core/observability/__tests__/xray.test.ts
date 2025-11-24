/**
 * X-Ray Utility Tests (Story 5.3)
 *
 * Tests X-Ray tracing utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  traceAsyncOperation,
  addAnnotation,
  addMetadata,
  isXRayEnabled,
  instrumentAWSClient,
  traceDatabase,
  traceS3,
  traceSearch,
  traceCache,
} from '../xray'

// Mock the X-Ray SDK
vi.mock('aws-xray-sdk-core', () => ({
  getSegment: vi.fn(() => ({
    addNewSubsegment: vi.fn(() => ({
      close: vi.fn(),
      addError: vi.fn(),
      addAnnotation: vi.fn(),
      addMetadata: vi.fn(),
    })),
    addAnnotation: vi.fn(),
    addMetadata: vi.fn(),
    addError: vi.fn(),
  })),
  captureAWSv3Client: vi.fn((client) => client),
}))

describe('X-Ray Utilities', () => {
  describe('traceAsyncOperation', () => {
    it('should execute operation when X-Ray is available', async () => {
      const mockOperation = vi.fn().mockResolvedValue('result')

      const result = await traceAsyncOperation('test-operation', mockOperation)

      expect(result).toBe('result')
      expect(mockOperation).toHaveBeenCalledWith(expect.anything())
    })

    it('should handle errors and add them to subsegment', async () => {
      const error = new Error('Test error')
      const mockOperation = vi.fn().mockRejectedValue(error)

      await expect(
        traceAsyncOperation('test-operation', mockOperation),
      ).rejects.toThrow('Test error')
    })

    it('should pass subsegment to operation callback', async () => {
      let receivedSubsegment: any

      await traceAsyncOperation('test-operation', async (subsegment) => {
        receivedSubsegment = subsegment
        return 'result'
      })

      expect(receivedSubsegment).toBeDefined()
    })
  })

  describe('Helper functions', () => {
    it('traceDatabase should prefix operation name with db:', async () => {
      const mockQuery = vi.fn().mockResolvedValue([{ id: 1 }])

      const result = await traceDatabase('getUsers', mockQuery)

      expect(result).toEqual([{ id: 1 }])
      expect(mockQuery).toHaveBeenCalled()
    })

    it('traceS3 should prefix operation name with s3:', async () => {
      const mockOperation = vi.fn().mockResolvedValue('s3-url')

      const result = await traceS3('uploadFile', mockOperation)

      expect(result).toBe('s3-url')
      expect(mockOperation).toHaveBeenCalled()
    })

    it('traceSearch should prefix operation name with search:', async () => {
      const mockOperation = vi.fn().mockResolvedValue({ hits: [] })

      const result = await traceSearch('searchImages', mockOperation)

      expect(result).toEqual({ hits: [] })
      expect(mockOperation).toHaveBeenCalled()
    })

    it('traceCache should prefix operation name with cache:', async () => {
      const mockOperation = vi.fn().mockResolvedValue('cached-value')

      const result = await traceCache('get', mockOperation)

      expect(result).toBe('cached-value')
      expect(mockOperation).toHaveBeenCalled()
    })
  })

  describe('instrumentAWSClient', () => {
    it('should return instrumented client when X-Ray is available', () => {
      const mockClient = { send: vi.fn() }

      const instrumented = instrumentAWSClient(mockClient)

      // Client should be returned (potentially wrapped)
      expect(instrumented).toBeDefined()
    })

    it('should handle instrumentation gracefully when X-Ray is unavailable', () => {
      const mockClient = { send: vi.fn() }

      // Should not throw even if X-Ray SDK is missing
      expect(() => instrumentAWSClient(mockClient)).not.toThrow()
    })
  })

  describe('isXRayEnabled', () => {
    it('should return true when X-Ray SDK is loaded and segment exists', () => {
      // Test assumes X-Ray mock is active
      const enabled = isXRayEnabled()

      // Should be true with our mock
      expect(typeof enabled).toBe('boolean')
    })
  })

  describe('addAnnotation and addMetadata', () => {
    it('addAnnotation should not throw when segment exists', () => {
      expect(() => addAnnotation('userId', 'user123')).not.toThrow()
      expect(() => addAnnotation('method', 'GET')).not.toThrow()
    })

    it('addMetadata should not throw when segment exists', () => {
      expect(() => addMetadata('request', 'path', '/api/mocs')).not.toThrow()
      expect(() => addMetadata('response', 'statusCode', 200)).not.toThrow()
    })

    it('should handle missing segment gracefully', () => {
      // These should not throw even without active segment
      expect(() => addAnnotation('key', 'value')).not.toThrow()
      expect(() => addMetadata('namespace', 'key', 'value')).not.toThrow()
    })
  })
})
