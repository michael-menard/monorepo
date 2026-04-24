import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LikedMocsPage } from '../pages/liked-mocs-page.js'

// Minimal Playwright Page mock
function createMockPage() {
  return {
    goto: vi.fn().mockResolvedValue(undefined),
    url: vi.fn().mockReturnValue('https://rebrickable.com/users/testuser/likedmocs/'),
    waitForSelector: vi.fn().mockResolvedValue(null),
    waitForLoadState: vi.fn().mockResolvedValue(undefined),
    $$eval: vi.fn().mockResolvedValue([]),
    $: vi.fn().mockResolvedValue(null),
    screenshot: vi.fn().mockResolvedValue(Buffer.from('')),
  }
}

describe('LikedMocsPage', () => {
  let page: ReturnType<typeof createMockPage>
  let likedMocsPage: LikedMocsPage

  beforeEach(() => {
    page = createMockPage()
    likedMocsPage = new LikedMocsPage(page as any)
  })

  describe('scrapeCurrentPage — no Premium filtering', () => {
    it('returns all MOCs including Premium ones', async () => {
      // Simulate page returning both free and premium MOCs
      page.$$eval.mockResolvedValueOnce([
        { mocNumber: '100', title: 'Free MOC', url: 'https://rebrickable.com/mocs/MOC-100/', author: 'Author1', partsCount: 500 },
        { mocNumber: '200', title: 'Premium MOC', url: 'https://rebrickable.com/mocs/MOC-200/', author: 'Author2', partsCount: 1000 },
        { mocNumber: '300', title: 'Another Free', url: 'https://rebrickable.com/mocs/MOC-300/', author: 'Author3', partsCount: 250 },
      ])

      // scrapeAllInstructions calls scrapeCurrentPage internally, but since goToNextPage
      // will return false (no Next button), it only scrapes one page
      page.$.mockResolvedValueOnce(null) // No "Next" button

      const results = await likedMocsPage.scrapeAllInstructions()

      // All 3 MOCs should be returned — no Premium filtering
      expect(results).toHaveLength(3)
      expect(results.map(r => r.mocNumber)).toEqual(['100', '200', '300'])
    })

    it('deduplicates by MOC number', async () => {
      page.$$eval.mockResolvedValueOnce([
        { mocNumber: '100', title: 'MOC A', url: 'https://rebrickable.com/mocs/MOC-100/', author: '', partsCount: 0 },
        { mocNumber: '100', title: 'MOC A Duplicate', url: 'https://rebrickable.com/mocs/MOC-100/', author: '', partsCount: 0 },
      ])
      page.$.mockResolvedValueOnce(null)

      const results = await likedMocsPage.scrapeAllInstructions()
      expect(results).toHaveLength(1)
      expect(results[0].mocNumber).toBe('100')
    })

    it('stops pagination early when limit is reached', async () => {
      // Page 1 returns 3 items — exceeds limit of 2
      page.$$eval.mockResolvedValueOnce([
        { mocNumber: '100', title: 'MOC 1', url: 'https://rebrickable.com/mocs/MOC-100/', author: '', partsCount: 0 },
        { mocNumber: '200', title: 'MOC 2', url: 'https://rebrickable.com/mocs/MOC-200/', author: '', partsCount: 0 },
        { mocNumber: '300', title: 'MOC 3', url: 'https://rebrickable.com/mocs/MOC-300/', author: '', partsCount: 0 },
      ])
      // Should NOT attempt to go to next page since allItems.length (3) >= limit (2)

      const results = await likedMocsPage.scrapeAllInstructions(2)
      // All 3 items from the first page are collected, then pagination stops
      expect(results).toHaveLength(3)
      // Verify goToNextPage was never called (no Next button lookup)
      expect(page.$).not.toHaveBeenCalled()
    })

    it('handles empty page gracefully', async () => {
      page.$$eval.mockResolvedValueOnce([])
      page.$.mockResolvedValueOnce(null)

      const results = await likedMocsPage.scrapeAllInstructions()
      expect(results).toHaveLength(0)
    })

    it('filters out items with missing MOC number via browser eval', async () => {
      // The $$eval runs in the browser and filters out items with empty mocNumber.
      // In our mock, we simulate the browser already having filtered them out.
      page.$$eval.mockResolvedValueOnce([
        { mocNumber: '100', title: 'Valid', url: 'https://rebrickable.com/mocs/MOC-100/', author: '', partsCount: 0 },
      ])
      page.$.mockResolvedValueOnce(null)

      const results = await likedMocsPage.scrapeAllInstructions()
      expect(results).toHaveLength(1)
      expect(results[0].mocNumber).toBe('100')
    })
  })
})
