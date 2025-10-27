import {beforeEach, describe, expect, it} from 'vitest'
import {configureStore} from '@reduxjs/toolkit'
import wishlistReducer, {fetchWishlistItems, selectWishlistItems, selectWishlistStats,} from '../wishlistSlice'
import mocInstructionsReducer, {fetchMocInstructions, incrementDownloadCount, selectMocInstructions, selectMocInstructionsStats,} from '../mocInstructionsSlice'
import profileReducer, {fetchProfileData, selectUserStats} from '../profileSlice'

// Create a test store that matches the app store structure
const createTestStore = () => {
  return configureStore({
    reducer: {
      wishlist: wishlistReducer,
      mocInstructions: mocInstructionsReducer,
      profile: profileReducer,
    },
  })
}

describe('Centralized Data Integration', () => {
  let store: ReturnType<typeof createTestStore>

  beforeEach(() => {
    store = createTestStore()
  })

  describe('MOC Instructions Centralization', () => {
    it('should have comprehensive MOC instruction data', async () => {
      const result = await store.dispatch(fetchMocInstructions({}))

      expect(result.type).toBe('mocInstructions/fetchInstructions/fulfilled')
      expect(result.payload).toBeDefined()
      expect(Array.isArray(result.payload)).toBe(true)

      const state = store.getState()
      const instructions = selectMocInstructions(state)

      // Should have multiple instructions
      expect(instructions.length).toBeGreaterThan(4)

      // Each instruction should have comprehensive data
      instructions.forEach(instruction => {
        expect(instruction).toHaveProperty('id')
        expect(instruction).toHaveProperty('title')
        expect(instruction).toHaveProperty('description')
        expect(instruction).toHaveProperty('author')
        expect(instruction).toHaveProperty('category')
        expect(instruction).toHaveProperty('difficulty')
        expect(instruction).toHaveProperty('tags')
        expect(instruction).toHaveProperty('estimatedTime')
        expect(instruction).toHaveProperty('totalParts')
        expect(instruction).toHaveProperty('downloadCount')
        expect(instruction).toHaveProperty('steps')
        expect(instruction).toHaveProperty('partsList')

        // Validate data types
        expect(typeof instruction.id).toBe('string')
        expect(typeof instruction.title).toBe('string')
        expect(typeof instruction.author).toBe('string')
        expect(Array.isArray(instruction.tags)).toBe(true)
        expect(Array.isArray(instruction.steps)).toBe(true)
        expect(Array.isArray(instruction.partsList)).toBe(true)
        expect(typeof instruction.downloadCount).toBe('number')
      })
    })

    it('should support advanced filtering', async () => {
      // Test category filtering
      const vehicleResult = await store.dispatch(fetchMocInstructions({ category: 'vehicles' }))
      expect(vehicleResult.payload.every((inst: any) => inst.category === 'vehicles')).toBe(true)

      // Test difficulty filtering
      const expertResult = await store.dispatch(fetchMocInstructions({ difficulty: 'expert' }))
      expect(expertResult.payload.every((inst: any) => inst.difficulty === 'expert')).toBe(true)

      // Test parts range filtering
      const largeBuildsResult = await store.dispatch(fetchMocInstructions({ minParts: 1500 }))
      expect(largeBuildsResult.payload.every((inst: any) => (inst.totalParts || 0) >= 1500)).toBe(
        true,
      )

      // Test time range filtering
      const quickBuildsResult = await store.dispatch(fetchMocInstructions({ maxTime: 5 }))
      expect(quickBuildsResult.payload.every((inst: any) => (inst.estimatedTime || 0) <= 5)).toBe(
        true,
      )
    })

    it('should support search functionality', async () => {
      const searchResult = await store.dispatch(fetchMocInstructions({ search: 'dragon' }))
      const hasSearchTerm = searchResult.payload.some(
        (inst: any) =>
          inst.title.toLowerCase().includes('dragon') ||
          inst.description.toLowerCase().includes('dragon') ||
          inst.tags.some((tag: string) => tag.toLowerCase().includes('dragon')),
      )
      expect(hasSearchTerm).toBe(true)
    })

    it('should support sorting', async () => {
      // Test sorting by download count (descending)
      const popularResult = await store.dispatch(
        fetchMocInstructions({
          sortBy: 'downloadCount',
          sortOrder: 'desc',
        }),
      )

      const downloads = popularResult.payload.map((inst: any) => inst.downloadCount)
      for (let i = 1; i < downloads.length; i++) {
        expect(downloads[i]).toBeLessThanOrEqual(downloads[i - 1])
      }

      // Test sorting by title (ascending)
      const alphabeticalResult = await store.dispatch(
        fetchMocInstructions({
          sortBy: 'title',
          sortOrder: 'asc',
        }),
      )

      const titles = alphabeticalResult.payload.map((inst: any) => inst.title)
      for (let i = 1; i < titles.length; i++) {
        expect(titles[i].localeCompare(titles[i - 1])).toBeGreaterThanOrEqual(0)
      }
    })

    it('should calculate accurate stats', async () => {
      await store.dispatch(fetchMocInstructions({}))

      const state = store.getState()
      const instructions = selectMocInstructions(state)
      const stats = selectMocInstructionsStats(state)

      expect(stats).toBeDefined()
      expect(stats?.total).toBe(instructions.length)
      expect(stats?.published).toBe(instructions.filter(inst => inst.isPublished).length)
      expect(stats?.totalDownloads).toBe(
        instructions.reduce((sum, inst) => sum + inst.downloadCount, 0),
      )

      const avgRating =
        instructions.reduce((sum, inst) => sum + (inst.rating || 0), 0) / instructions.length
      expect(stats?.averageRating).toBeCloseTo(avgRating, 1)
    })
  })

  describe('Data Consistency Across Features', () => {
    it('should maintain consistency between profile stats and actual data', async () => {
      // Load all data
      await Promise.all([
        store.dispatch(fetchWishlistItems()),
        store.dispatch(fetchMocInstructions({})),
        store.dispatch(fetchProfileData()),
      ])

      const state = store.getState()
      const wishlistItems = selectWishlistItems(state)
      const mocInstructions = selectMocInstructions(state)
      const userStats = selectUserStats(state)
      const wishlistStats = selectWishlistStats(state)
      const mocStats = selectMocInstructionsStats(state)

      // Profile stats should match actual data counts
      expect(userStats?.totalWishlistItems).toBe(wishlistStats?.total)
      expect(userStats?.totalMocInstructions).toBe(mocStats?.total)
      expect(userStats?.totalDownloads).toBe(mocStats?.totalDownloads)
      expect(userStats?.averageRating).toBeCloseTo(mocStats?.averageRating || 0, 1)
    })

    it('should have realistic and diverse data', async () => {
      await store.dispatch(fetchMocInstructions({}))

      const state = store.getState()
      const instructions = selectMocInstructions(state)

      // Should have multiple categories
      const categories = Array.from(new Set(instructions.map(inst => inst.category)))
      expect(categories.length).toBeGreaterThan(3)

      // Should have multiple difficulty levels
      const difficulties = Array.from(new Set(instructions.map(inst => inst.difficulty)))
      expect(difficulties.length).toBeGreaterThan(2)

      // Should have multiple authors
      const authors = Array.from(new Set(instructions.map(inst => inst.author)))
      expect(authors.length).toBeGreaterThan(3)

      // Should have varied part counts
      const partCounts = instructions.map(inst => inst.totalParts || 0)
      const minParts = Math.min(...partCounts)
      const maxParts = Math.max(...partCounts)
      expect(maxParts - minParts).toBeGreaterThan(1000) // Good range of complexity

      // Should have varied build times
      const buildTimes = instructions.map(inst => inst.estimatedTime || 0)
      const minTime = Math.min(...buildTimes)
      const maxTime = Math.max(...buildTimes)
      expect(maxTime - minTime).toBeGreaterThan(5) // Good range of time investment
    })
  })

  describe('Real-time Updates', () => {
    it('should update stats when data changes', async () => {
      await store.dispatch(fetchMocInstructions({}))

      const state = store.getState()
      const instructions = selectMocInstructions(state)
      const firstInstruction = instructions[0]
      const originalDownloads = firstInstruction.downloadCount
      const originalStats = selectMocInstructionsStats(state)
      const originalTotalDownloads = originalStats?.totalDownloads || 0

      // Increment download count using the actual async thunk
      const result = await store.dispatch(incrementDownloadCount(firstInstruction.id))
      expect(result.type).toBe('mocInstructions/incrementDownload/fulfilled')

      const newState = store.getState()
      const updatedInstructions = selectMocInstructions(newState)
      const updatedInstruction = updatedInstructions.find(inst => inst.id === firstInstruction.id)
      const newStats = selectMocInstructionsStats(newState)

      // Verify the instruction was updated
      expect(updatedInstruction?.downloadCount).toBe(originalDownloads + 1)

      // Verify the stats were recalculated correctly
      expect(newStats?.totalDownloads).toBe(originalTotalDownloads + 1)

      // Verify the total is the sum of all download counts
      const expectedTotal = updatedInstructions.reduce((sum, inst) => sum + inst.downloadCount, 0)
      expect(newStats?.totalDownloads).toBe(expectedTotal)
    })
  })
})
