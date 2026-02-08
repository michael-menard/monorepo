/**
 * MocDetailPage Unit Tests - INST-1101
 *
 * Tests for the MOC detail page layout rendering, loading states, and error handling.
 * Uses mocked RTK Query hooks to test component behavior in isolation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MocDetailModule } from '../MocDetailModule'
import type { GetMocDetailResponse } from '@repo/api-client'

// Mock RTK Query hook
vi.mock('@repo/api-client/rtk/instructions-api', () => ({
  useGetMocDetailQuery: vi.fn(),
}))

// Mock logger
vi.mock('@repo/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

// Import the mocked module to access and spy on it
import { useGetMocDetailQuery } from '@repo/api-client/rtk/instructions-api'

const mockMocDetailResponse: GetMocDetailResponse = {
  id: 'moc-123',
  userId: 'user-123',
  title: 'Castle MOC',
  description: 'A detailed medieval castle MOC',
  theme: 'Castle',
  tags: ['castle', 'medieval'],
  thumbnailUrl: 'https://example.com/castle-thumb.jpg',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-02T00:00:00Z'),
  stats: {
    pieceCount: 1500,
    fileCount: 3,
  },
  files: [
    {
      id: 'file-1',
      mocId: 'moc-123',
      fileType: 'instruction',
      name: 'castle-instructions.pdf',
      mimeType: 'application/pdf',
      size: 1024000,
      s3Key: 'mocs/user-123/moc-123/instructions/file-1.pdf',
      downloadUrl: 'https://example.com/castle-instructions.pdf',
      uploadedAt: new Date('2025-01-01T00:00:00Z'),
    },
    {
      id: 'file-2',
      mocId: 'moc-123',
      fileType: 'parts-list',
      name: 'castle-parts.csv',
      mimeType: 'text/csv',
      size: 51200,
      s3Key: 'mocs/user-123/moc-123/parts-lists/file-2.csv',
      downloadUrl: 'https://example.com/castle-parts.csv',
      uploadedAt: new Date('2025-01-01T00:00:00Z'),
    },
    {
      id: 'file-3',
      mocId: 'moc-123',
      fileType: 'gallery-image',
      name: 'castle-gallery-1.jpg',
      mimeType: 'image/jpeg',
      size: 204800,
      s3Key: 'mocs/user-123/moc-123/gallery/file-3.jpg',
      downloadUrl: 'https://example.com/castle-gallery-1.jpg',
      uploadedAt: new Date('2025-01-01T00:00:00Z'),
    },
  ],
}

describe('MocDetailPage - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AC-10: Loading State', () => {
    it('displays loading skeleton while fetching MOC data', () => {
      vi.mocked(useGetMocDetailQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: undefined,
        refetch: vi.fn(),
      } as any)

      render(<MocDetailModule mocIdOrSlug="moc-123" />)

      // Loading skeleton should be present (check for skeleton class or elements)
      const skeletonElements = document.querySelectorAll('.animate-pulse')
      expect(skeletonElements.length).toBeGreaterThan(0)

      // Dashboard should not be rendered yet
      expect(screen.queryByTestId('moc-detail-dashboard')).not.toBeInTheDocument()
    })

    it('transitions from loading to loaded state', async () => {
      const mockRefetch = vi.fn()

      // Start with loading state
      const { rerender } = render(<MocDetailModule mocIdOrSlug="moc-123" />)

      vi.mocked(useGetMocDetailQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: undefined,
        refetch: mockRefetch,
      } as any)

      rerender(<MocDetailModule mocIdOrSlug="moc-123" />)

      expect(screen.queryByTestId('moc-detail-dashboard')).not.toBeInTheDocument()

      // Update to loaded state
      vi.mocked(useGetMocDetailQuery).mockReturnValue({
        data: mockMocDetailResponse,
        isLoading: false,
        isError: false,
        error: undefined,
        refetch: mockRefetch,
      } as any)

      rerender(<MocDetailModule mocIdOrSlug="moc-123" />)

      await waitFor(() => {
        expect(screen.getByTestId('moc-detail-dashboard')).toBeInTheDocument()
      })
    })
  })

  describe('AC-1 & AC-11: Detail Page Rendering', () => {
    it('renders MOC detail dashboard with data', () => {
      vi.mocked(useGetMocDetailQuery).mockReturnValue({
        data: mockMocDetailResponse,
        isLoading: false,
        isError: false,
        error: undefined,
        refetch: vi.fn(),
      } as any)

      render(<MocDetailModule mocIdOrSlug="moc-123" />)

      // Dashboard should be rendered
      expect(screen.getByTestId('moc-detail-dashboard')).toBeInTheDocument()

      // MOC title should be visible
      expect(screen.getByText('Castle MOC')).toBeInTheDocument()
    })

    it('displays error message when mocIdOrSlug is not provided', () => {
      vi.mocked(useGetMocDetailQuery).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
        error: undefined,
        refetch: vi.fn(),
      } as any)

      render(<MocDetailModule mocIdOrSlug={undefined} />)

      expect(screen.getByText('No MOC specified.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    })
  })

  describe('Error States', () => {
    it('displays error message on API failure', () => {
      const mockError = new Error('Failed to fetch MOC')

      vi.mocked(useGetMocDetailQuery).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: mockError,
        refetch: vi.fn(),
      } as any)

      render(<MocDetailModule mocIdOrSlug="moc-123" />)

      expect(screen.getByText('Failed to fetch MOC')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    it('displays generic error message when error has no message', () => {
      vi.mocked(useGetMocDetailQuery).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: {} as any,
        refetch: vi.fn(),
      } as any)

      render(<MocDetailModule mocIdOrSlug="moc-123" />)

      expect(screen.getByText(/Failed to load MOC. Please try again./i)).toBeInTheDocument()
    })

    it('calls refetch when retry button is clicked', async () => {
      const user = userEvent.setup()
      const mockRefetch = vi.fn()

      vi.mocked(useGetMocDetailQuery).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Network error'),
        refetch: mockRefetch,
      } as any)

      render(<MocDetailModule mocIdOrSlug="moc-123" />)

      const retryButton = screen.getByRole('button', { name: /retry/i })
      await user.click(retryButton)

      expect(mockRefetch).toHaveBeenCalledTimes(1)
    })

    it('displays error when MOC data fails Zod validation', () => {
      const invalidMocData = {
        ...mockMocDetailResponse,
        // Invalid coverImageUrl (not a valid URL format)
        thumbnailUrl: 'not-a-url',
      }

      vi.mocked(useGetMocDetailQuery).mockReturnValue({
        data: invalidMocData as any,
        isLoading: false,
        isError: false,
        error: undefined,
        refetch: vi.fn(),
      } as any)

      render(<MocDetailModule mocIdOrSlug="moc-123" />)

      expect(screen.getByText('Invalid data received for this MOC.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    })
  })

  describe('AC-11: 404 Handling', () => {
    it('displays error for non-existent MOC (404)', () => {
      const notFoundError = new Error('MOC not found')

      vi.mocked(useGetMocDetailQuery).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: notFoundError,
        refetch: vi.fn(),
      } as any)

      render(<MocDetailModule mocIdOrSlug="nonexistent-moc" />)

      expect(screen.getByText('MOC not found')).toBeInTheDocument()
    })
  })

  describe('Back Navigation', () => {
    it('navigates back when back button is clicked in error state', async () => {
      const user = userEvent.setup()
      const mockBack = vi.fn()
      window.history.back = mockBack

      vi.mocked(useGetMocDetailQuery).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
        error: undefined,
        refetch: vi.fn(),
      } as any)

      render(<MocDetailModule mocIdOrSlug={undefined} />)

      const backButton = screen.getByRole('button', { name: /back/i })
      await user.click(backButton)

      expect(mockBack).toHaveBeenCalledTimes(1)
    })
  })

  describe('Data Mapping', () => {
    it('correctly maps API response to Moc type', () => {
      vi.mocked(useGetMocDetailQuery).mockReturnValue({
        data: mockMocDetailResponse,
        isLoading: false,
        isError: false,
        error: undefined,
        refetch: vi.fn(),
      } as any)

      render(<MocDetailModule mocIdOrSlug="moc-123" />)

      // Verify MOC title is rendered (from mapped data)
      expect(screen.getByText('Castle MOC')).toBeInTheDocument()

      // Verify dashboard is rendered (confirms successful mapping)
      expect(screen.getByTestId('moc-detail-dashboard')).toBeInTheDocument()
    })

    it('handles MOC with no files gracefully', () => {
      const mocWithNoFiles: GetMocDetailResponse = {
        ...mockMocDetailResponse,
        files: [],
        stats: {
          pieceCount: 1500,
          fileCount: 0,
        },
      }

      vi.mocked(useGetMocDetailQuery).mockReturnValue({
        data: mocWithNoFiles,
        isLoading: false,
        isError: false,
        error: undefined,
        refetch: vi.fn(),
      } as any)

      render(<MocDetailModule mocIdOrSlug="moc-123" />)

      expect(screen.getByTestId('moc-detail-dashboard')).toBeInTheDocument()
      expect(screen.getByText('Castle MOC')).toBeInTheDocument()
    })

    it('handles optional fields in MOC data', () => {
      const mocWithOptionalFields: GetMocDetailResponse = {
        ...mockMocDetailResponse,
        description: null, // Use null instead of undefined for Zod
        // thumbnailUrl: Keep valid URL since coverImageUrl requires URL in Moc schema
        tags: [], // Empty tags array
      }

      vi.mocked(useGetMocDetailQuery).mockReturnValue({
        data: mocWithOptionalFields,
        isLoading: false,
        isError: false,
        error: undefined,
        refetch: vi.fn(),
      } as any)

      render(<MocDetailModule mocIdOrSlug="moc-123" />)

      expect(screen.getByTestId('moc-detail-dashboard')).toBeInTheDocument()
      expect(screen.getByText('Castle MOC')).toBeInTheDocument()
    })
  })
})
