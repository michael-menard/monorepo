import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { lookupGeolocation, getGeolocation, __resetReader, isReaderInitialized } from '../geoip.js'

// Mock @maxmind/geoip2-node
vi.mock('@maxmind/geoip2-node', () => ({
  Reader: {
    open: vi.fn(),
  },
  ReaderModel: vi.fn(),
  City: vi.fn(),
}))

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { Reader, ReaderModel } from '@maxmind/geoip2-node'
import { logger } from '@repo/logger'

/**
 * Geolocation Service Tests (WISH-2047)
 *
 * Tests for IP geolocation lookup using MaxMind GeoLite2.
 * Uses mocked database reader since actual .mmdb file is not available in tests.
 */
describe('Geolocation Service', () => {
  // Mock reader instance
  const mockReader = {
    city: vi.fn(),
  }

  beforeEach(() => {
    // Reset singleton state
    __resetReader()
    vi.clearAllMocks()

    // Default mock: Reader.open succeeds (returns ReaderModel)
    vi.mocked(Reader.open).mockResolvedValue(mockReader as unknown as ReaderModel)
  })

  afterEach(() => {
    __resetReader()
  })

  describe('lookupGeolocation', () => {
    // Test 1: Successful lookup with known IP
    it('returns geolocation data for valid IP', async () => {
      // Mock a successful city lookup response
      mockReader.city.mockResolvedValue({
        country: {
          isoCode: 'US',
          names: { en: 'United States' },
        },
        subdivisions: [{ names: { en: 'California' } }],
        city: { names: { en: 'Mountain View' } },
        location: {
          latitude: 37.4056,
          longitude: -122.0775,
        },
      })

      const result = await lookupGeolocation('8.8.8.8')

      expect(result.success).toBe(true)
      expect(result.ip).toBe('8.8.8.8')
      expect(result.data).toEqual({
        country: 'US',
        countryName: 'United States',
        region: 'California',
        city: 'Mountain View',
        latitude: 37.4056,
        longitude: -122.0775,
      })
    })

    // Test 2: Invalid IP returns null
    it('returns null for invalid IP', async () => {
      mockReader.city.mockRejectedValue(new Error('Invalid IP address'))

      const result = await lookupGeolocation('invalid-ip')

      expect(result.success).toBe(false)
      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
    })

    // Test 3: Empty IP returns null
    it('returns null for empty IP', async () => {
      const result = await lookupGeolocation('')

      expect(result.success).toBe(false)
      expect(result.data).toBeNull()
      expect(result.error).toBe('Invalid IP address')
    })

    // Test 4: Database initialization failure is handled gracefully
    it('handles database initialization failure gracefully', async () => {
      vi.mocked(Reader.open).mockRejectedValue(new Error('Database not found'))

      const result = await lookupGeolocation('8.8.8.8')

      expect(result.success).toBe(false)
      expect(result.data).toBeNull()
      expect(result.error).toBe('Database not available')
    })

    // Test 5: Performance timing is recorded
    it('records lookup duration', async () => {
      mockReader.city.mockResolvedValue({
        country: { isoCode: 'US', names: { en: 'United States' } },
        city: { names: { en: 'Test City' } },
        location: { latitude: 0, longitude: 0 },
      })

      const result = await lookupGeolocation('8.8.8.8')

      expect(result.durationMs).toBeGreaterThanOrEqual(0)
      expect(typeof result.durationMs).toBe('number')
    })

    // Test 6: Handles partial response data
    it('handles partial response data with null fields', async () => {
      // Some fields may be missing in the response
      mockReader.city.mockResolvedValue({
        country: { isoCode: 'XX' },
        // No subdivisions
        // No city
        location: { latitude: 10, longitude: 20 },
      })

      const result = await lookupGeolocation('1.2.3.4')

      expect(result.success).toBe(true)
      expect(result.data?.country).toBe('XX')
      expect(result.data?.countryName).toBeNull()
      expect(result.data?.region).toBeNull()
      expect(result.data?.city).toBeNull()
      expect(result.data?.latitude).toBe(10)
      expect(result.data?.longitude).toBe(20)
    })

    // Test 7: IPv6 address lookup
    it('handles IPv6 addresses', async () => {
      mockReader.city.mockResolvedValue({
        country: { isoCode: 'DE', names: { en: 'Germany' } },
        city: { names: { en: 'Berlin' } },
        location: { latitude: 52.52, longitude: 13.405 },
      })

      const result = await lookupGeolocation('2001:4860:4860::8888')

      expect(result.success).toBe(true)
      expect(result.data?.country).toBe('DE')
    })

    // Test 8: Logs warning on lookup failure
    it('logs warning on lookup failure', async () => {
      mockReader.city.mockRejectedValue(new Error('IP not in database'))

      await lookupGeolocation('192.168.1.1')

      expect(logger.warn).toHaveBeenCalledWith(
        'Geolocation lookup failed',
        expect.objectContaining({
          ip: '192.168.1.1',
          error: 'IP not in database',
        }),
      )
    })
  })

  describe('getGeolocation', () => {
    // Test 9: Returns data directly on success
    it('returns geolocation data directly', async () => {
      mockReader.city.mockResolvedValue({
        country: { isoCode: 'JP', names: { en: 'Japan' } },
        city: { names: { en: 'Tokyo' } },
        location: { latitude: 35.6762, longitude: 139.6503 },
      })

      const data = await getGeolocation('1.1.1.1')

      expect(data).not.toBeNull()
      expect(data?.country).toBe('JP')
      expect(data?.city).toBe('Tokyo')
    })

    // Test 10: Returns null on failure
    it('returns null on failure', async () => {
      mockReader.city.mockRejectedValue(new Error('Not found'))

      const data = await getGeolocation('0.0.0.0')

      expect(data).toBeNull()
    })
  })

  describe('Singleton Pattern', () => {
    // Test 11: Reader is initialized only once
    it('initializes reader only once', async () => {
      mockReader.city.mockResolvedValue({
        country: { isoCode: 'US' },
      })

      // Multiple lookups
      await lookupGeolocation('1.1.1.1')
      await lookupGeolocation('2.2.2.2')
      await lookupGeolocation('3.3.3.3')

      // Reader.open should only be called once
      expect(Reader.open).toHaveBeenCalledTimes(1)
    })

    // Test 12: Reset clears singleton
    it('reset clears singleton state', async () => {
      mockReader.city.mockResolvedValue({
        country: { isoCode: 'US' },
      })

      await lookupGeolocation('1.1.1.1')
      expect(isReaderInitialized()).toBe(true)

      __resetReader()
      expect(isReaderInitialized()).toBe(false)
    })
  })

  describe('Error Handling', () => {
    // Test 13: Handles null/undefined input
    it('handles null input', async () => {
      const result = await lookupGeolocation(null as unknown as string)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid IP address')
    })

    // Test 14: Does not throw on any error
    it('never throws, always returns result', async () => {
      vi.mocked(Reader.open).mockRejectedValue(new Error('Fatal error'))

      // Should not throw
      const result = await lookupGeolocation('8.8.8.8')

      expect(result.success).toBe(false)
      expect(result.data).toBeNull()
    })
  })
})
