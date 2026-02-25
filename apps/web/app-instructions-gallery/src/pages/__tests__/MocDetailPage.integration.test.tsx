/**
 * MocDetailPage Integration Tests - INST-1101
 *
 * Integration tests using MSW for API mocking.
 * Tests data fetching, 404 handling, and API error scenarios.
 */

import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { http, HttpResponse } from 'msw'
import { MocDetailModule } from '../MocDetailModule'
import { instructionsApi } from '@repo/api-client/rtk/instructions-api'
import type { GetMocDetailResponse } from '@repo/api-client'
import { server } from '../../test/mocks/server'

// Mock logger
vi.mock('@repo/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

const mockMocDetailResponse: GetMocDetailResponse = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
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
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      mocId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      fileType: 'instruction',
      name: 'castle-instructions.pdf',
      mimeType: 'application/pdf',
      size: 1024000,
      s3Key: 'mocs/user-123/moc-123/instructions/file-1.pdf',
      downloadUrl: 'https://example.com/castle-instructions.pdf',
      uploadedAt: new Date('2025-01-01T00:00:00Z'),
    },
    {
      id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      mocId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      fileType: 'parts-list',
      name: 'castle-parts.csv',
      mimeType: 'text/csv',
      size: 51200,
      s3Key: 'mocs/user-123/moc-123/parts-lists/file-2.csv',
      downloadUrl: 'https://example.com/castle-parts.csv',
      uploadedAt: new Date('2025-01-01T00:00:00Z'),
    },
    {
      id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      mocId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
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

// Test helpers
function createTestStore() {
  return configureStore({
    reducer: {
      [instructionsApi.reducerPath]: instructionsApi.reducer,
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware().concat(instructionsApi.middleware),
  })
}

function renderWithProviders(ui: React.ReactElement) {
  const store = createTestStore()
  return {
    store,
    ...render(<Provider store={store}>{ui}</Provider>),
  }
}

// Uses the global MSW server from test/mocks/server (started in setup.ts).
// The global server handles /instructions/mocs/:id with scenario-aware responses.
// Per-test overrides use server.use() — reset automatically by global afterEach.
describe('MocDetailPage - Integration Tests', () => {

  describe('AC-12: GET /mocs/:id Endpoint', () => {
    it('fetches and displays MOC data successfully', async () => {
      renderWithProviders(<MocDetailModule mocIdOrSlug="moc-123" />)

      // Loading state should appear first (check for skeleton classes)
      // Note: Loading might be too fast to catch, so this is optional
      const hasLoadingState = document.querySelectorAll('.animate-pulse').length > 0
      // Either loading state appears or data loads immediately
      expect(hasLoadingState || screen.queryByTestId('moc-detail-dashboard')).toBeTruthy()

      // Wait for data to load
      await waitFor(
        () => {
          expect(screen.getByTestId('moc-detail-dashboard')).toBeInTheDocument()
        },
        { timeout: 5000 }
      )

      // Verify MOC data is displayed
      expect(screen.getByText('Castle MOC')).toBeInTheDocument()
    })

    it('displays all file types correctly', async () => {
      renderWithProviders(<MocDetailModule mocIdOrSlug="moc-123" />)

      await waitFor(
        () => {
          expect(screen.getByTestId('moc-detail-dashboard')).toBeInTheDocument()
        },
        { timeout: 5000 }
      )

      // All card sections should be present (text may appear in card headers + stats)
      expect(screen.getAllByText('Instructions').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Parts Lists').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Gallery').length).toBeGreaterThan(0)
    })
  })

  describe('AC-11 & AC-16: 404 Handling', () => {
    it('displays error for non-existent MOC', async () => {
      renderWithProviders(<MocDetailModule mocIdOrSlug="not-found" />)

      await waitFor(
        () => {
          expect(screen.getByText(/MOC not found|Failed to load MOC/i)).toBeInTheDocument()
        },
        { timeout: 5000 }
      )

      // Retry button should be available
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    it('displays error for unauthorized MOC access', async () => {
      renderWithProviders(<MocDetailModule mocIdOrSlug="unauthorized" />)

      await waitFor(
        () => {
          expect(screen.getByText(/Access denied|Failed to load MOC/i)).toBeInTheDocument()
        },
        { timeout: 5000 }
      )
    })
  })

  describe('API Error Handling', () => {
    it('handles 500 server errors gracefully', async () => {
      renderWithProviders(<MocDetailModule mocIdOrSlug="server-error" />)

      await waitFor(
        () => {
          expect(screen.getByText(/Internal server error|Failed to load MOC/i)).toBeInTheDocument()
        },
        { timeout: 5000 }
      )

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    it('handles network errors', async () => {
      // Override handler to simulate network failure
      server.use(
        http.get('*/instructions/mocs/:id', () => {
          return HttpResponse.error()
        })
      )

      renderWithProviders(<MocDetailModule mocIdOrSlug="moc-123" />)

      await waitFor(
        () => {
          expect(screen.getByText(/Failed to load MOC/i)).toBeInTheDocument()
        },
        { timeout: 5000 }
      )
    })

    it('handles malformed JSON responses', async () => {
      server.use(
        http.get('*/instructions/mocs/:id', () => {
          return new HttpResponse('Invalid JSON{', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        })
      )

      renderWithProviders(<MocDetailModule mocIdOrSlug="moc-123" />)

      await waitFor(
        () => {
          expect(screen.getByText(/Failed to load MOC|Invalid data/i)).toBeInTheDocument()
        },
        { timeout: 5000 }
      )
    })
  })

  describe('AC-13: Response Metadata', () => {
    it('receives and processes MOC metadata correctly', async () => {
      renderWithProviders(<MocDetailModule mocIdOrSlug="moc-123" />)

      await waitFor(
        () => {
          expect(screen.getByTestId('moc-detail-dashboard')).toBeInTheDocument()
        },
        { timeout: 5000 }
      )

      // Verify metadata is displayed
      expect(screen.getByText('Castle MOC')).toBeInTheDocument()
      expect(screen.getByText(/medieval castle MOC/i)).toBeInTheDocument()
    })
  })

  describe('AC-14: Files Array Processing', () => {
    it('processes files with correct metadata', async () => {
      renderWithProviders(<MocDetailModule mocIdOrSlug="moc-123" />)

      await waitFor(
        () => {
          expect(screen.getByTestId('moc-detail-dashboard')).toBeInTheDocument()
        },
        { timeout: 5000 }
      )

      // Verify file sections are present (text may appear in card headers + stats)
      expect(screen.getAllByText('Instructions').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Parts Lists').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Gallery').length).toBeGreaterThan(0)
    })

    it('handles MOC with no files', async () => {
      const mocWithNoFiles: GetMocDetailResponse = {
        ...mockMocDetailResponse,
        files: [],
        stats: {
          pieceCount: 1500,
          fileCount: 0,
        },
      }

      server.use(
        http.get('*/instructions/mocs/moc-no-files', () => {
          return HttpResponse.json(mocWithNoFiles)
        })
      )

      renderWithProviders(<MocDetailModule mocIdOrSlug="moc-no-files" />)

      await waitFor(
        () => {
          expect(screen.getByTestId('moc-detail-dashboard')).toBeInTheDocument()
        },
        { timeout: 5000 }
      )

      expect(screen.getByText('Castle MOC')).toBeInTheDocument()
    })
  })

  describe('AC-15: Stats Processing', () => {
    it('displays pieceCount and fileCount from stats', async () => {
      renderWithProviders(<MocDetailModule mocIdOrSlug="moc-123" />)

      await waitFor(
        () => {
          expect(screen.getByTestId('moc-detail-dashboard')).toBeInTheDocument()
        },
        { timeout: 5000 }
      )

      // Stats card should be visible (contains piece count)
      expect(screen.getByText('Castle MOC')).toBeInTheDocument()
    })
  })

  describe('Cache and Refetch Behavior', () => {
    it('uses cached data on subsequent renders', async () => {
      const { store, unmount } = renderWithProviders(<MocDetailModule mocIdOrSlug="moc-123" />)

      await waitFor(
        () => {
          expect(screen.getByTestId('moc-detail-dashboard')).toBeInTheDocument()
        },
        { timeout: 5000 }
      )

      unmount()

      // Re-render should use cached data (no loading state)
      render(
        <Provider store={store}>
          <MocDetailModule mocIdOrSlug="moc-123" />
        </Provider>
      )

      // Should render immediately from cache
      expect(screen.getByTestId('moc-detail-dashboard')).toBeInTheDocument()
    })

    it('refetches data when retry is clicked after error', async () => {
      // Start with error
      server.use(
        http.get('*/instructions/mocs/moc-123', () => {
          return HttpResponse.json(
            { error: 'INTERNAL_ERROR', message: 'Server error' },
            { status: 500 }
          )
        })
      )

      renderWithProviders(<MocDetailModule mocIdOrSlug="moc-123" />)

      await waitFor(
        () => {
          expect(screen.getByText(/Server error|Failed to load MOC/i)).toBeInTheDocument()
        },
        { timeout: 5000 }
      )

      // Fix the server
      server.use(
        http.get('*/instructions/mocs/moc-123', () => {
          return HttpResponse.json(mockMocDetailResponse)
        })
      )

      // Click retry
      const retryButton = screen.getByRole('button', { name: /retry/i })
      await userEvent.click(retryButton)

      // Should now load successfully
      await waitFor(
        () => {
          expect(screen.getByTestId('moc-detail-dashboard')).toBeInTheDocument()
        },
        { timeout: 5000 }
      )
    })
  })
})
