/**
 * Dashboard API Schema Validation Tests
 * Tests Zod schema validation for DashboardStats and RecentMoc
 * Addresses QA Finding TEST-001
 */

import { describe, it, expect } from 'vitest'
import { DashboardStatsSchema, RecentMocSchema } from '../dashboard-api'

describe('DashboardStatsSchema', () => {
  describe('valid data', () => {
    it('should validate correct dashboard stats', () => {
      const validStats = {
        totalMocs: 10,
        wishlistCount: 5,
        themeCount: 3,
        lastUpdated: '2025-12-25T00:00:00Z',
      }

      const result = DashboardStatsSchema.parse(validStats)
      expect(result).toEqual(validStats)
    })

    it('should allow zero values for counts', () => {
      const zeroStats = {
        totalMocs: 0,
        wishlistCount: 0,
        themeCount: 0,
        lastUpdated: '2025-12-25T00:00:00Z',
      }

      const result = DashboardStatsSchema.parse(zeroStats)
      expect(result).toEqual(zeroStats)
    })
  })

  describe('invalid data - totalMocs', () => {
    it('should reject negative totalMocs', () => {
      const invalidStats = {
        totalMocs: -1,
        wishlistCount: 5,
        themeCount: 3,
        lastUpdated: '2025-12-25T00:00:00Z',
      }

      expect(() => DashboardStatsSchema.parse(invalidStats)).toThrow()
    })

    it('should reject non-integer totalMocs', () => {
      const invalidStats = {
        totalMocs: 10.5,
        wishlistCount: 5,
        themeCount: 3,
        lastUpdated: '2025-12-25T00:00:00Z',
      }

      expect(() => DashboardStatsSchema.parse(invalidStats)).toThrow()
    })

    it('should reject string totalMocs', () => {
      const invalidStats = {
        totalMocs: '10',
        wishlistCount: 5,
        themeCount: 3,
        lastUpdated: '2025-12-25T00:00:00Z',
      }

      expect(() => DashboardStatsSchema.parse(invalidStats)).toThrow()
    })
  })

  describe('invalid data - wishlistCount', () => {
    it('should reject negative wishlistCount', () => {
      const invalidStats = {
        totalMocs: 10,
        wishlistCount: -5,
        themeCount: 3,
        lastUpdated: '2025-12-25T00:00:00Z',
      }

      expect(() => DashboardStatsSchema.parse(invalidStats)).toThrow()
    })

    it('should reject non-integer wishlistCount', () => {
      const invalidStats = {
        totalMocs: 10,
        wishlistCount: 5.7,
        themeCount: 3,
        lastUpdated: '2025-12-25T00:00:00Z',
      }

      expect(() => DashboardStatsSchema.parse(invalidStats)).toThrow()
    })
  })

  describe('invalid data - themeCount', () => {
    it('should reject negative themeCount', () => {
      const invalidStats = {
        totalMocs: 10,
        wishlistCount: 5,
        themeCount: -3,
        lastUpdated: '2025-12-25T00:00:00Z',
      }

      expect(() => DashboardStatsSchema.parse(invalidStats)).toThrow()
    })

    it('should reject non-integer themeCount', () => {
      const invalidStats = {
        totalMocs: 10,
        wishlistCount: 5,
        themeCount: 3.14,
        lastUpdated: '2025-12-25T00:00:00Z',
      }

      expect(() => DashboardStatsSchema.parse(invalidStats)).toThrow()
    })
  })

  describe('invalid data - lastUpdated', () => {
    it('should reject invalid datetime string', () => {
      const invalidStats = {
        totalMocs: 10,
        wishlistCount: 5,
        themeCount: 3,
        lastUpdated: 'not-a-date',
      }

      expect(() => DashboardStatsSchema.parse(invalidStats)).toThrow()
    })

    it('should reject date-only string (missing time)', () => {
      const invalidStats = {
        totalMocs: 10,
        wishlistCount: 5,
        themeCount: 3,
        lastUpdated: '2025-12-25',
      }

      expect(() => DashboardStatsSchema.parse(invalidStats)).toThrow()
    })

    it('should reject number timestamp', () => {
      const invalidStats = {
        totalMocs: 10,
        wishlistCount: 5,
        themeCount: 3,
        lastUpdated: 1735084800000,
      }

      expect(() => DashboardStatsSchema.parse(invalidStats)).toThrow()
    })
  })

  describe('missing fields', () => {
    it('should reject missing totalMocs', () => {
      const invalidStats = {
        wishlistCount: 5,
        themeCount: 3,
        lastUpdated: '2025-12-25T00:00:00Z',
      }

      expect(() => DashboardStatsSchema.parse(invalidStats)).toThrow()
    })

    it('should reject missing wishlistCount', () => {
      const invalidStats = {
        totalMocs: 10,
        themeCount: 3,
        lastUpdated: '2025-12-25T00:00:00Z',
      }

      expect(() => DashboardStatsSchema.parse(invalidStats)).toThrow()
    })

    it('should reject missing themeCount', () => {
      const invalidStats = {
        totalMocs: 10,
        wishlistCount: 5,
        lastUpdated: '2025-12-25T00:00:00Z',
      }

      expect(() => DashboardStatsSchema.parse(invalidStats)).toThrow()
    })

    it('should reject missing lastUpdated', () => {
      const invalidStats = {
        totalMocs: 10,
        wishlistCount: 5,
        themeCount: 3,
      }

      expect(() => DashboardStatsSchema.parse(invalidStats)).toThrow()
    })
  })
})

describe('RecentMocSchema', () => {
  describe('valid data', () => {
    it('should validate correct recent MOC', () => {
      const validMoc = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'LEGO Technic Crane',
        thumbnail: 'https://example.com/image.jpg',
        createdAt: '2025-12-25T00:00:00Z',
      }

      const result = RecentMocSchema.parse(validMoc)
      expect(result).toEqual(validMoc)
    })

    it('should allow null thumbnail', () => {
      const mocWithNullThumbnail = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'LEGO Castle',
        thumbnail: null,
        createdAt: '2025-12-25T00:00:00Z',
      }

      const result = RecentMocSchema.parse(mocWithNullThumbnail)
      expect(result).toEqual(mocWithNullThumbnail)
    })

    it('should allow very long titles', () => {
      const mocWithLongTitle = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'A'.repeat(500),
        thumbnail: null,
        createdAt: '2025-12-25T00:00:00Z',
      }

      const result = RecentMocSchema.parse(mocWithLongTitle)
      expect(result).toEqual(mocWithLongTitle)
    })
  })

  describe('invalid data - id', () => {
    it('should reject non-UUID id', () => {
      const invalidMoc = {
        id: 'not-a-uuid',
        title: 'LEGO Crane',
        thumbnail: 'https://example.com/image.jpg',
        createdAt: '2025-12-25T00:00:00Z',
      }

      expect(() => RecentMocSchema.parse(invalidMoc)).toThrow()
    })

    it('should reject numeric id', () => {
      const invalidMoc = {
        id: 12345,
        title: 'LEGO Crane',
        thumbnail: 'https://example.com/image.jpg',
        createdAt: '2025-12-25T00:00:00Z',
      }

      expect(() => RecentMocSchema.parse(invalidMoc)).toThrow()
    })

    it('should reject UUID with wrong format', () => {
      const invalidMoc = {
        id: '123e4567-e89b-12d3-a456',
        title: 'LEGO Crane',
        thumbnail: 'https://example.com/image.jpg',
        createdAt: '2025-12-25T00:00:00Z',
      }

      expect(() => RecentMocSchema.parse(invalidMoc)).toThrow()
    })
  })

  describe('invalid data - title', () => {
    it('should reject empty title', () => {
      const invalidMoc = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: '',
        thumbnail: 'https://example.com/image.jpg',
        createdAt: '2025-12-25T00:00:00Z',
      }

      expect(() => RecentMocSchema.parse(invalidMoc)).toThrow()
    })

    it('should reject numeric title', () => {
      const invalidMoc = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 123,
        thumbnail: 'https://example.com/image.jpg',
        createdAt: '2025-12-25T00:00:00Z',
      }

      expect(() => RecentMocSchema.parse(invalidMoc)).toThrow()
    })
  })

  describe('invalid data - thumbnail', () => {
    it('should reject invalid URL', () => {
      const invalidMoc = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'LEGO Crane',
        thumbnail: 'not-a-url',
        createdAt: '2025-12-25T00:00:00Z',
      }

      expect(() => RecentMocSchema.parse(invalidMoc)).toThrow()
    })

    it('should reject relative URL', () => {
      const invalidMoc = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'LEGO Crane',
        thumbnail: '/images/crane.jpg',
        createdAt: '2025-12-25T00:00:00Z',
      }

      expect(() => RecentMocSchema.parse(invalidMoc)).toThrow()
    })

    it('should reject empty string thumbnail', () => {
      const invalidMoc = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'LEGO Crane',
        thumbnail: '',
        createdAt: '2025-12-25T00:00:00Z',
      }

      expect(() => RecentMocSchema.parse(invalidMoc)).toThrow()
    })
  })

  describe('invalid data - createdAt', () => {
    it('should reject invalid datetime string', () => {
      const invalidMoc = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'LEGO Crane',
        thumbnail: null,
        createdAt: 'invalid-date',
      }

      expect(() => RecentMocSchema.parse(invalidMoc)).toThrow()
    })

    it('should reject date-only string', () => {
      const invalidMoc = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'LEGO Crane',
        thumbnail: null,
        createdAt: '2025-12-25',
      }

      expect(() => RecentMocSchema.parse(invalidMoc)).toThrow()
    })

    it('should reject number timestamp', () => {
      const invalidMoc = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'LEGO Crane',
        thumbnail: null,
        createdAt: 1735084800000,
      }

      expect(() => RecentMocSchema.parse(invalidMoc)).toThrow()
    })
  })

  describe('missing fields', () => {
    it('should reject missing id', () => {
      const invalidMoc = {
        title: 'LEGO Crane',
        thumbnail: null,
        createdAt: '2025-12-25T00:00:00Z',
      }

      expect(() => RecentMocSchema.parse(invalidMoc)).toThrow()
    })

    it('should reject missing title', () => {
      const invalidMoc = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        thumbnail: null,
        createdAt: '2025-12-25T00:00:00Z',
      }

      expect(() => RecentMocSchema.parse(invalidMoc)).toThrow()
    })

    it('should reject missing thumbnail', () => {
      const invalidMoc = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'LEGO Crane',
        createdAt: '2025-12-25T00:00:00Z',
      }

      expect(() => RecentMocSchema.parse(invalidMoc)).toThrow()
    })

    it('should reject missing createdAt', () => {
      const invalidMoc = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'LEGO Crane',
        thumbnail: null,
      }

      expect(() => RecentMocSchema.parse(invalidMoc)).toThrow()
    })
  })
})
