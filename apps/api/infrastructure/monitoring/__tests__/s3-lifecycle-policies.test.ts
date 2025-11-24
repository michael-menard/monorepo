import { describe, it, expect } from 'vitest'
import { estimateLifecycleSavings } from '../s3-lifecycle-policies'

describe('s3-lifecycle-policies', () => {
  describe('estimateLifecycleSavings', () => {
    it('should calculate savings for 1TB of data', () => {
      const totalGB = 1024 // 1TB

      const result = estimateLifecycleSavings(totalGB)

      expect(result.standardCost).toBeGreaterThan(0)
      expect(result.optimizedCost).toBeGreaterThan(0)
      expect(result.standardCost).toBeGreaterThan(result.optimizedCost)
      expect(result.savings).toBeGreaterThan(0)
      expect(result.savingsPercent).toBeGreaterThan(50) // Should be >50% savings
      expect(result.savingsPercent).toBeLessThan(100)
    })

    it('should calculate correct savings percentage', () => {
      const totalGB = 500

      const result = estimateLifecycleSavings(totalGB)

      const expectedSavingsPercent = ((result.savings / result.standardCost) * 100).toFixed(2)

      expect(result.savingsPercent.toFixed(2)).toBe(expectedSavingsPercent)
    })

    it('should show higher savings for larger datasets', () => {
      const smallDataset = estimateLifecycleSavings(100)
      const largeDataset = estimateLifecycleSavings(1000)

      // Larger dataset should have proportionally similar savings percentage
      expect(Math.abs(smallDataset.savingsPercent - largeDataset.savingsPercent)).toBeLessThan(
        1,
      )

      // But absolute savings should be ~10x for 10x data
      expect(largeDataset.savings).toBeGreaterThan(smallDataset.savings * 9)
      expect(largeDataset.savings).toBeLessThan(smallDataset.savings * 11)
    })

    it('should return reasonable cost estimates', () => {
      const totalGB = 1000

      const result = estimateLifecycleSavings(totalGB)

      // S3 Standard pricing ~$0.023/GB/month → 1000GB = ~$23/month
      expect(result.standardCost).toBeGreaterThan(20)
      expect(result.standardCost).toBeLessThan(30)

      // Optimized cost should be much lower
      expect(result.optimizedCost).toBeLessThan(10)
    })

    it('should handle zero data gracefully', () => {
      const result = estimateLifecycleSavings(0)

      expect(result.standardCost).toBe(0)
      expect(result.optimizedCost).toBe(0)
      expect(result.savings).toBe(0)
      expect(isNaN(result.savingsPercent) || result.savingsPercent === 0).toBe(true)
    })
  })
})
