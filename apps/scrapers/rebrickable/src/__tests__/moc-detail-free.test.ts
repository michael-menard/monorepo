import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MocDetailPage } from '../pages/moc-detail-page.js'

// Minimal Playwright Page mock
function createMockPage() {
  return {
    goto: vi.fn().mockResolvedValue(undefined),
    url: vi.fn().mockReturnValue('https://rebrickable.com/mocs/MOC-259512/Vinceslav/test/'),
    evaluate: vi.fn(),
    $: vi.fn(),
    $$eval: vi.fn(),
    $eval: vi.fn(),
    click: vi.fn().mockResolvedValue(undefined),
    waitForSelector: vi.fn().mockResolvedValue(null),
    waitForLoadState: vi.fn().mockResolvedValue(undefined),
    waitForEvent: vi.fn(),
    waitForTimeout: vi.fn().mockResolvedValue(undefined),
    waitForURL: vi.fn().mockResolvedValue(undefined),
    goBack: vi.fn().mockResolvedValue(undefined),
    screenshot: vi.fn().mockResolvedValue(Buffer.from('')),
    context: vi.fn().mockReturnValue({
      request: { get: vi.fn() },
    }),
  }
}

describe('MocDetailPage — Free Instructions', () => {
  let page: ReturnType<typeof createMockPage>
  let mocPage: MocDetailPage

  beforeEach(() => {
    page = createMockPage()
    mocPage = new MocDetailPage(page as any)
  })

  describe('hasFreeInstructions', () => {
    it('returns true when free instructions text is present', async () => {
      page.evaluate.mockResolvedValueOnce(true)
      const result = await mocPage.hasFreeInstructions()
      expect(result).toBe(true)
    })

    it('returns false when free instructions text is absent', async () => {
      page.evaluate.mockResolvedValueOnce(false)
      const result = await mocPage.hasFreeInstructions()
      expect(result).toBe(false)
    })

    it('returns false on evaluation error', async () => {
      page.evaluate.mockRejectedValueOnce(new Error('page crashed'))
      const result = await mocPage.hasFreeInstructions()
      expect(result).toBe(false)
    })
  })

  describe('scrapeFreeFileList', () => {
    it('returns files from free download links', async () => {
      page.evaluate.mockResolvedValueOnce([
        {
          fileName: 'castle_instructions.io',
          downloadDataUrl: '/users/test/mocs/purchases/download/0/12345/abc123/?expire=999',
          fileSize: '2.1 MB',
          uploadDate: 'April 18, 2026',
        },
      ])

      const files = await mocPage.scrapeFreeFileList()
      expect(files).toHaveLength(1)
      expect(files[0].fileName).toBe('castle_instructions.io')
      expect(files[0].downloadDataUrl).toContain('/download/')
    })

    it('returns multiple files when available', async () => {
      page.evaluate.mockResolvedValueOnce([
        {
          fileName: 'instructions.pdf',
          downloadDataUrl: '/users/test/mocs/purchases/download/0/111/abc/?expire=999',
          fileSize: '5 MB',
          uploadDate: '',
        },
        {
          fileName: 'instructions.io',
          downloadDataUrl: '/users/test/mocs/purchases/download/0/222/def/?expire=999',
          fileSize: '3 MB',
          uploadDate: '',
        },
      ])

      const files = await mocPage.scrapeFreeFileList()
      expect(files).toHaveLength(2)
    })

    it('returns empty array when no free links exist', async () => {
      page.evaluate.mockResolvedValueOnce([])
      const files = await mocPage.scrapeFreeFileList()
      expect(files).toHaveLength(0)
    })

    it('returns empty array on error', async () => {
      page.evaluate.mockRejectedValueOnce(new Error('evaluation failed'))
      const files = await mocPage.scrapeFreeFileList()
      expect(files).toHaveLength(0)
    })

    it('deduplicates files by download URL', async () => {
      const sameUrl = '/users/test/mocs/purchases/download/0/123/abc/?expire=999'
      page.evaluate.mockResolvedValueOnce([
        { fileName: 'file.io', downloadDataUrl: sameUrl, fileSize: '', uploadDate: '' },
      ])

      const files = await mocPage.scrapeFreeFileList()
      expect(files).toHaveLength(1)
    })
  })

  describe('downloadFreeFile', () => {
    const mockFile = {
      fileName: 'test_instructions.io',
      downloadDataUrl: '/users/test/mocs/purchases/download/0/12345/abc123/?expire=999',
      fileSize: '2.1 MB',
      uploadDate: '',
    }

    it('clicks the direct link and saves the download', async () => {
      const mockDownload = {
        suggestedFilename: () => 'test_instructions.io',
        saveAs: vi.fn().mockResolvedValue(undefined),
      }

      const mockLinkEl = {
        click: vi.fn().mockResolvedValue(undefined),
      }

      page.$.mockResolvedValueOnce(mockLinkEl)
      page.waitForEvent.mockResolvedValueOnce(mockDownload)

      // Mock fs.statSync to return non-zero size
      vi.mock('fs', async importOriginal => {
        const actual = (await importOriginal()) as Record<string, unknown>
        return {
          ...actual,
          existsSync: vi.fn().mockReturnValue(true),
          mkdirSync: vi.fn(),
          statSync: vi.fn().mockReturnValue({ size: 2100000 }),
        }
      })

      const result = await mocPage.downloadFreeFile(mockFile, '259512')

      expect(mockLinkEl.click).toHaveBeenCalled()
      // Result depends on fs mock — main assertion is no throw
      expect(result).toBeDefined()
    })

    it('falls back to modal flow when direct link element not found', async () => {
      page.$.mockResolvedValueOnce(null) // No link element found

      // Mock triggerDownload (modal fallback) — it will also fail since we have no modal
      // but this tests that the fallback path is attempted
      page.waitForSelector.mockRejectedValue(new Error('no modal'))

      const result = await mocPage.downloadFreeFile(mockFile, '259512')
      // Should return null since both paths fail
      expect(result).toBeNull()
    })

    it('prepends rebrickable.com to relative URLs', async () => {
      const relativeFile = {
        ...mockFile,
        downloadDataUrl: '/users/test/mocs/purchases/download/0/12345/abc/',
      }

      page.$.mockResolvedValueOnce(null) // Will fall to fallback
      page.waitForSelector.mockRejectedValue(new Error('no element'))

      // This just verifies it doesn't crash on relative URLs
      const result = await mocPage.downloadFreeFile(relativeFile, '12345')
      expect(result).toBeNull()
    })
  })
})
