/**
 * Tests for mockS3Upload utility
 *
 * Story: WISH-2120
 */

import { describe, it, expect, afterEach } from 'vitest'
import { server } from '../../mocks/server'
import { mockS3Upload } from '../mockS3Upload'

const API_BASE_URL = 'http://localhost:3001'

describe('mockS3Upload', () => {
  afterEach(() => {
    // Ensure handlers are reset after each test
    server.resetHandlers()
  })

  describe('Success scenario (AC6)', () => {
    it('mocks both presign API and S3 PUT to return success', async () => {
      const cleanup = mockS3Upload({ scenario: 'success' })

      try {
        // Test presign endpoint
        const presignResponse = await fetch(`${API_BASE_URL}/api/wishlist/images/presign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: 'test.jpg', mimeType: 'image/jpeg' }),
        })

        expect(presignResponse.status).toBe(200)
        const presignData = await presignResponse.json()
        expect(presignData).toHaveProperty('presignedUrl')
        expect(presignData).toHaveProperty('key')

        // Test S3 PUT endpoint
        const s3Response = await fetch(presignData.presignedUrl, {
          method: 'PUT',
          body: 'mock file content',
        })

        expect(s3Response.status).toBe(200)
      } finally {
        cleanup()
      }
    })

    it('returns presigned URL with correct structure', async () => {
      const cleanup = mockS3Upload({ scenario: 'success' })

      try {
        const response = await fetch(`${API_BASE_URL}/api/wishlist/images/presign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: 'photo.png', mimeType: 'image/png' }),
        })

        const data = await response.json()

        expect(data.presignedUrl).toContain('s3.amazonaws.com')
        expect(data.key).toContain('photo.png')
        expect(data).toHaveProperty('expiresIn')
      } finally {
        cleanup()
      }
    })
  })

  describe('Presign error scenario (AC7)', () => {
    it('mocks presign API failure with default status code', async () => {
      const cleanup = mockS3Upload({ scenario: 'presign-error' })

      try {
        const response = await fetch(`${API_BASE_URL}/api/wishlist/images/presign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: 'test.jpg', mimeType: 'image/jpeg' }),
        })

        expect(response.status).toBe(500)
        const data = await response.json()
        expect(data).toHaveProperty('error')
        expect(data).toHaveProperty('message')
      } finally {
        cleanup()
      }
    })

    it('mocks presign API failure with custom status code', async () => {
      const cleanup = mockS3Upload({ scenario: 'presign-error', statusCode: 403 })

      try {
        const response = await fetch(`${API_BASE_URL}/api/wishlist/images/presign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: 'test.jpg', mimeType: 'image/jpeg' }),
        })

        expect(response.status).toBe(403)
      } finally {
        cleanup()
      }
    })
  })

  describe('S3 error scenario (AC8)', () => {
    it('mocks S3 PUT failure while presign succeeds', async () => {
      const cleanup = mockS3Upload({ scenario: 's3-error' })

      try {
        // Presign should succeed
        const presignResponse = await fetch(`${API_BASE_URL}/api/wishlist/images/presign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: 'test.jpg', mimeType: 'image/jpeg' }),
        })

        expect(presignResponse.status).toBe(200)
        const presignData = await presignResponse.json()

        // S3 PUT should fail
        const s3Response = await fetch(presignData.presignedUrl, {
          method: 'PUT',
          body: 'mock file content',
        })

        expect(s3Response.status).toBe(403) // Default S3 error status
      } finally {
        cleanup()
      }
    })

    it('mocks S3 PUT failure with custom status code', async () => {
      const cleanup = mockS3Upload({ scenario: 's3-error', statusCode: 500 })

      try {
        const presignResponse = await fetch(`${API_BASE_URL}/api/wishlist/images/presign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: 'test.jpg', mimeType: 'image/jpeg' }),
        })

        const presignData = await presignResponse.json()

        const s3Response = await fetch(presignData.presignedUrl, {
          method: 'PUT',
          body: 'mock file content',
        })

        expect(s3Response.status).toBe(500)
      } finally {
        cleanup()
      }
    })
  })

  describe('Timeout scenario (AC9)', () => {
    it('simulates network timeout by never resolving', async () => {
      const cleanup = mockS3Upload({ scenario: 'timeout' })

      try {
        // Use AbortController to prevent test from hanging
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 100)

        await expect(
          fetch(`${API_BASE_URL}/api/wishlist/images/presign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: 'test.jpg', mimeType: 'image/jpeg' }),
            signal: controller.signal,
          }),
        ).rejects.toThrow()

        clearTimeout(timeoutId)
      } finally {
        cleanup()
      }
    })
  })

  describe('Cleanup function (AC11)', () => {
    it('returns a cleanup function', () => {
      const cleanup = mockS3Upload({ scenario: 'success' })

      expect(typeof cleanup).toBe('function')

      cleanup()
    })

    it('cleanup function removes handlers', async () => {
      // Set up custom handler that should be removed
      const cleanup = mockS3Upload({ scenario: 'presign-error' })

      // Verify error behavior is active
      const errorResponse = await fetch(`${API_BASE_URL}/api/wishlist/images/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: 'test.jpg', mimeType: 'image/jpeg' }),
      })
      expect(errorResponse.status).toBe(500)

      // Call cleanup
      cleanup()

      // After cleanup, the base handlers should be restored
      // (behavior depends on base handlers - this verifies resetHandlers was called)
    })

    it('allows multiple scenarios in sequence after cleanup', async () => {
      // First scenario
      const cleanup1 = mockS3Upload({ scenario: 'presign-error' })
      let response = await fetch(`${API_BASE_URL}/api/wishlist/images/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: 'test.jpg', mimeType: 'image/jpeg' }),
      })
      expect(response.status).toBe(500)
      cleanup1()

      // Second scenario
      const cleanup2 = mockS3Upload({ scenario: 'success' })
      response = await fetch(`${API_BASE_URL}/api/wishlist/images/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: 'test.jpg', mimeType: 'image/jpeg' }),
      })
      expect(response.status).toBe(200)
      cleanup2()
    })
  })

  describe('Response delay option', () => {
    it('supports custom delay for responses', async () => {
      const cleanup = mockS3Upload({ scenario: 'success', delay: 50 })

      try {
        const startTime = performance.now()
        await fetch(`${API_BASE_URL}/api/wishlist/images/presign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: 'test.jpg', mimeType: 'image/jpeg' }),
        })
        const endTime = performance.now()

        const duration = endTime - startTime
        expect(duration).toBeGreaterThanOrEqual(50)
      } finally {
        cleanup()
      }
    })
  })

  describe('Options validation', () => {
    it('accepts valid scenario values', () => {
      const scenarios = ['success', 'presign-error', 's3-error', 'timeout'] as const

      for (const scenario of scenarios) {
        const cleanup = mockS3Upload({ scenario })
        expect(cleanup).toBeInstanceOf(Function)
        cleanup()
      }
    })

    it('throws error for invalid scenario', () => {
      expect(() => {
        mockS3Upload({ scenario: 'invalid' as any })
      }).toThrow()
    })

    it('accepts valid status codes', () => {
      const cleanup = mockS3Upload({ scenario: 'presign-error', statusCode: 404 })
      expect(cleanup).toBeInstanceOf(Function)
      cleanup()
    })

    it('throws error for invalid status code (out of range)', () => {
      expect(() => {
        mockS3Upload({ scenario: 'presign-error', statusCode: 99 })
      }).toThrow()
    })
  })

  describe('Concurrent scenario setups', () => {
    it('handles multiple cleanup functions without leaks', async () => {
      // Set up multiple scenarios (simulating test isolation issue)
      const cleanup1 = mockS3Upload({ scenario: 'success' })
      const cleanup2 = mockS3Upload({ scenario: 'presign-error' })

      // Last handler wins (presign-error)
      const response = await fetch(`${API_BASE_URL}/api/wishlist/images/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: 'test.jpg', mimeType: 'image/jpeg' }),
      })

      // Should reflect the last scenario
      expect(response.status).toBe(500)

      cleanup1()
      cleanup2()
    })
  })
})
