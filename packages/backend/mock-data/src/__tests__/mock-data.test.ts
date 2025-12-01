import { describe, it, expect } from 'vitest'
import {
  mockWishlistItems,
  mockMocInstructions,
  mockUserStats,
  mockRecentActivities,
  mockQuickActions,
  getWishlistStats,
  getWishlistCategories,
  getMocInstructionStats,
  getMocInstructionCategories,
  getProfileDashboardData,
} from '../index'

describe('Mock Data Package', () => {
  describe('Wishlist Data', () => {
    it('should have valid wishlist items', () => {
      expect(mockWishlistItems).toBeDefined()
      expect(Array.isArray(mockWishlistItems)).toBe(true)
      expect(mockWishlistItems.length).toBeGreaterThan(0)

      // Check first item structure
      const firstItem = mockWishlistItems[0]
      expect(firstItem).toHaveProperty('id')
      expect(firstItem).toHaveProperty('name')
      expect(firstItem).toHaveProperty('price')
      expect(firstItem).toHaveProperty('priority')
      expect(firstItem).toHaveProperty('isPurchased')
      expect(typeof firstItem.price).toBe('number')
    })

    it('should calculate wishlist stats correctly', () => {
      const stats = getWishlistStats()
      expect(stats).toHaveProperty('total')
      expect(stats).toHaveProperty('purchased')
      expect(stats).toHaveProperty('unpurchased')
      expect(stats).toHaveProperty('totalValue')
      expect(stats.total).toBe(mockWishlistItems.length)
      expect(stats.purchased + stats.unpurchased).toBe(stats.total)
    })

    it('should get wishlist categories', () => {
      const categories = getWishlistCategories()
      expect(Array.isArray(categories)).toBe(true)
      expect(categories.length).toBeGreaterThan(0)
      expect(categories.every(cat => typeof cat === 'string')).toBe(true)
    })
  })

  describe('MOC Instructions Data', () => {
    it('should have valid MOC instructions', () => {
      expect(mockMocInstructions).toBeDefined()
      expect(Array.isArray(mockMocInstructions)).toBe(true)
      expect(mockMocInstructions.length).toBeGreaterThan(0)

      // Check first instruction structure
      const firstInstruction = mockMocInstructions[0]
      expect(firstInstruction).toHaveProperty('id')
      expect(firstInstruction).toHaveProperty('title')
      expect(firstInstruction).toHaveProperty('author')
      expect(firstInstruction).toHaveProperty('difficulty')
      expect(firstInstruction).toHaveProperty('downloadCount')
      expect(typeof firstInstruction.downloadCount).toBe('number')
    })

    it('should calculate MOC instruction stats correctly', () => {
      const stats = getMocInstructionStats()
      expect(stats).toHaveProperty('total')
      expect(stats).toHaveProperty('published')
      expect(stats).toHaveProperty('totalDownloads')
      expect(stats).toHaveProperty('averageRating')
      expect(stats.total).toBe(mockMocInstructions.length)
    })

    it('should get MOC instruction categories', () => {
      const categories = getMocInstructionCategories()
      expect(Array.isArray(categories)).toBe(true)
      expect(categories.length).toBeGreaterThan(0)
      expect(categories.every(cat => typeof cat === 'string')).toBe(true)
    })
  })

  describe('Profile Data', () => {
    it('should have valid user stats', () => {
      expect(mockUserStats).toBeDefined()
      expect(mockUserStats).toHaveProperty('totalWishlistItems')
      expect(mockUserStats).toHaveProperty('totalMocInstructions')
      expect(mockUserStats).toHaveProperty('memberSince')
      expect(typeof mockUserStats.totalWishlistItems).toBe('number')
      expect(typeof mockUserStats.totalMocInstructions).toBe('number')
    })

    it('should have valid recent activities', () => {
      expect(mockRecentActivities).toBeDefined()
      expect(Array.isArray(mockRecentActivities)).toBe(true)
      expect(mockRecentActivities.length).toBeGreaterThan(0)

      const firstActivity = mockRecentActivities[0]
      expect(firstActivity).toHaveProperty('id')
      expect(firstActivity).toHaveProperty('type')
      expect(firstActivity).toHaveProperty('title')
      expect(firstActivity).toHaveProperty('timestamp')
      expect(firstActivity.timestamp instanceof Date).toBe(true)
    })

    it('should have valid quick actions', () => {
      expect(mockQuickActions).toBeDefined()
      expect(Array.isArray(mockQuickActions)).toBe(true)
      expect(mockQuickActions.length).toBeGreaterThan(0)

      const firstAction = mockQuickActions[0]
      expect(firstAction).toHaveProperty('id')
      expect(firstAction).toHaveProperty('title')
      expect(firstAction).toHaveProperty('href')
      expect(firstAction).toHaveProperty('icon')
      expect(firstAction).toHaveProperty('color')
    })

    it('should get complete profile dashboard data', () => {
      const dashboardData = getProfileDashboardData()
      expect(dashboardData).toHaveProperty('stats')
      expect(dashboardData).toHaveProperty('recentActivities')
      expect(dashboardData).toHaveProperty('quickActions')
      expect(dashboardData.recentActivities.length).toBeLessThanOrEqual(5)
      expect(dashboardData.quickActions.length).toBeLessThanOrEqual(6)
    })
  })

  describe('Data Consistency', () => {
    it('should have consistent data between stats and actual items', () => {
      const wishlistStats = getWishlistStats()
      const mocStats = getMocInstructionStats()

      expect(wishlistStats.total).toBe(mockWishlistItems.length)
      expect(mocStats.total).toBe(mockMocInstructions.length)

      // Check that user stats match calculated stats
      expect(mockUserStats.totalWishlistItems).toBe(wishlistStats.total)
      expect(mockUserStats.totalMocInstructions).toBe(mocStats.total)
    })

    it('should have valid priority values in wishlist', () => {
      const validPriorities = ['low', 'medium', 'high']
      mockWishlistItems.forEach(item => {
        expect(validPriorities).toContain(item.priority)
      })
    })

    it('should have valid difficulty values in MOC instructions', () => {
      const validDifficulties = ['beginner', 'intermediate', 'advanced', 'expert']
      mockMocInstructions.forEach(instruction => {
        expect(validDifficulties).toContain(instruction.difficulty)
      })
    })
  })
})
