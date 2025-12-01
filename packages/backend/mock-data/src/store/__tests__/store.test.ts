import { describe, it, expect, beforeEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import wishlistReducer, {
  fetchWishlistItems,
  togglePurchaseStatus,
  selectWishlistItems,
  selectWishlistStats,
} from '../wishlistSlice'
import mocInstructionsReducer, {
  fetchMocInstructions,
  incrementDownloadCount,
  selectMocInstructions,
  selectMocInstructionsStats,
} from '../mocInstructionsSlice'
import profileReducer, {
  fetchProfileData,
  addRecentActivity,
  selectUserStats,
  selectRecentActivities,
} from '../profileSlice'

// Create a test store
const createTestStore = () => {
  return configureStore({
    reducer: {
      wishlist: wishlistReducer,
      mocInstructions: mocInstructionsReducer,
      profile: profileReducer,
    },
  })
}

describe('RTK Store Integration', () => {
  let store: ReturnType<typeof createTestStore>

  beforeEach(() => {
    store = createTestStore()
  })

  describe('Wishlist Slice', () => {
    it('should fetch wishlist items', async () => {
      const result = await store.dispatch(fetchWishlistItems())

      expect(result.type).toBe('wishlist/fetchItems/fulfilled')
      expect(result.payload).toBeDefined()
      expect(Array.isArray(result.payload)).toBe(true)

      const state = store.getState()
      const items = selectWishlistItems(state)
      const stats = selectWishlistStats(state)

      expect(items.length).toBeGreaterThan(0)
      expect(stats).toBeDefined()
      expect(stats?.total).toBe(items.length)
    })

    it('should toggle purchase status', async () => {
      // First fetch items
      await store.dispatch(fetchWishlistItems())

      const state = store.getState()
      const items = selectWishlistItems(state)
      const firstItem = items[0]
      const originalStatus = firstItem.isPurchased

      // Toggle purchase status
      const result = await store.dispatch(togglePurchaseStatus(firstItem.id))

      expect(result.type).toBe('wishlist/togglePurchase/fulfilled')

      const newState = store.getState()
      const updatedItems = selectWishlistItems(newState)
      const updatedItem = updatedItems.find(item => item.id === firstItem.id)

      expect(updatedItem?.isPurchased).toBe(!originalStatus)
    })
  })

  describe('MOC Instructions Slice', () => {
    it('should fetch MOC instructions', async () => {
      const result = await store.dispatch(fetchMocInstructions())

      expect(result.type).toBe('mocInstructions/fetchInstructions/fulfilled')
      expect(result.payload).toBeDefined()
      expect(Array.isArray(result.payload)).toBe(true)

      const state = store.getState()
      const instructions = selectMocInstructions(state)
      const stats = selectMocInstructionsStats(state)

      expect(instructions.length).toBeGreaterThan(0)
      expect(stats).toBeDefined()
      expect(stats?.total).toBe(instructions.length)
    })

    it('should increment download count', async () => {
      // First fetch instructions
      await store.dispatch(fetchMocInstructions())

      const state = store.getState()
      const instructions = selectMocInstructions(state)
      const firstInstruction = instructions[0]
      const originalCount = firstInstruction.downloadCount

      // Increment download count
      const result = await store.dispatch(incrementDownloadCount(firstInstruction.id))

      expect(result.type).toBe('mocInstructions/incrementDownload/fulfilled')

      const newState = store.getState()
      const updatedInstructions = selectMocInstructions(newState)
      const updatedInstruction = updatedInstructions.find(inst => inst.id === firstInstruction.id)

      expect(updatedInstruction?.downloadCount).toBe(originalCount + 1)
    })
  })

  describe('Profile Slice', () => {
    it('should fetch profile data', async () => {
      const result = await store.dispatch(fetchProfileData())

      expect(result.type).toBe('profile/fetchProfileData/fulfilled')
      expect(result.payload).toBeDefined()

      const state = store.getState()
      const userStats = selectUserStats(state)
      const activities = selectRecentActivities(state)

      expect(userStats).toBeDefined()
      expect(Array.isArray(activities)).toBe(true)
    })

    it('should add recent activity', async () => {
      // First fetch profile data
      await store.dispatch(fetchProfileData())

      const state = store.getState()
      const originalActivities = selectRecentActivities(state)
      const originalCount = originalActivities.length

      // Add new activity
      const newActivity = {
        type: 'download' as const,
        title: 'Test Download',
        description: 'Test description',
      }

      const result = await store.dispatch(addRecentActivity(newActivity))

      expect(result.type).toBe('profile/addRecentActivity/fulfilled')

      const newState = store.getState()
      const updatedActivities = selectRecentActivities(newState)

      expect(updatedActivities.length).toBe(originalCount + 1)
      expect(updatedActivities[0].title).toBe('Test Download')
    })
  })

  describe('Store Integration', () => {
    it('should handle multiple async actions', async () => {
      // Dispatch multiple actions
      const results = await Promise.all([
        store.dispatch(fetchWishlistItems()),
        store.dispatch(fetchMocInstructions()),
        store.dispatch(fetchProfileData()),
      ])

      // All should succeed
      results.forEach(result => {
        expect(result.type).toContain('/fulfilled')
      })

      const state = store.getState()

      // All data should be loaded
      expect(selectWishlistItems(state).length).toBeGreaterThan(0)
      expect(selectMocInstructions(state).length).toBeGreaterThan(0)
      expect(selectUserStats(state)).toBeDefined()
      expect(selectRecentActivities(state).length).toBeGreaterThan(0)
    })

    it('should maintain state consistency', async () => {
      // Load all data
      await Promise.all([
        store.dispatch(fetchWishlistItems()),
        store.dispatch(fetchMocInstructions()),
        store.dispatch(fetchProfileData()),
      ])

      const state = store.getState()
      const wishlistStats = selectWishlistStats(state)
      const mocStats = selectMocInstructionsStats(state)
      const userStats = selectUserStats(state)

      // Stats should be consistent
      expect(wishlistStats?.total).toBe(selectWishlistItems(state).length)
      expect(mocStats?.total).toBe(selectMocInstructions(state).length)
      expect(userStats?.totalWishlistItems).toBe(wishlistStats?.total)
      expect(userStats?.totalMocInstructions).toBe(mocStats?.total)
    })
  })
})
