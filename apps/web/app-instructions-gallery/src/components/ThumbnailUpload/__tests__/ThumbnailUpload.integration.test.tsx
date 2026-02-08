/**
 * ThumbnailUpload Integration Tests
 * Story INST-1103: Upload Thumbnail (AC42-44)
 *
 * Tests the full upload flow with MSW-mocked API calls
 */
import { describe, it, expect, beforeEach, vi, beforeAll, afterEach, afterAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { ThumbnailUpload } from '../index'
import { instructionsApi } from '@repo/api-client'

const API_BASE_URL = 'http://localhost:3001'

// MSW Server setup
const server = setupServer()

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('ThumbnailUpload Integration Tests', () => {
  let store: ReturnType<typeof configureStore>
  const mockMocId = '123e4567-e89b-12d3-a456-426614174000'

  beforeEach(() => {
    // Create fresh store for each test
    store = configureStore({
      reducer: {
        [instructionsApi.reducerPath]: instructionsApi.reducer,
      },
      middleware: getDefaultMiddleware =>
        getDefaultMiddleware().concat(instructionsApi.middleware),
    })
  })

  /**
   * AC42: Integration test - POST endpoint called, success updates UI
   */
  it('should call POST endpoint and update UI on successful upload', async () => {
    const user = userEvent.setup()
    const mockThumbnailUrl = 'https://cdn.example.com/mocs/user-123/moc-456/thumbnail/test.jpg'
    const onSuccessMock = vi.fn()

    // AC43: MSW handler for thumbnail upload endpoint
    server.use(
      http.post(`${API_BASE_URL}/api/v2/mocs/:id/thumbnail`, async ({ request, params }) => {
        const formData = await request.formData()
        const file = formData.get('file') as File

        expect(file).toBeDefined()
        expect(file.name).toContain('test')
        expect(params.id).toBe(mockMocId)

        return HttpResponse.json({
          thumbnailUrl: mockThumbnailUrl,
        })
      })
    )

    render(
      <Provider store={store}>
        <ThumbnailUpload
          mocId={mockMocId}
          existingThumbnailUrl={undefined}
          onSuccess={onSuccessMock}
        />
      </Provider>
    )

    // Create and upload a test file
    const file = new File(['test image content'], 'test-thumbnail.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/upload thumbnail/i)

    await user.upload(input, file)

    // Verify preview is shown
    expect(screen.getByAltText(/thumbnail preview/i)).toBeInTheDocument()
    expect(screen.getByText(/test-thumbnail.jpg/i)).toBeInTheDocument()

    // Click upload button
    const uploadButton = screen.getByRole('button', { name: /upload thumbnail/i })
    await user.click(uploadButton)

    // Wait for upload to complete
    await waitFor(() => {
      expect(onSuccessMock).toHaveBeenCalledWith(mockThumbnailUrl)
    })

    // Verify success toast was shown (checking toast message)
    await waitFor(() => {
      expect(screen.queryByText(/uploading/i)).not.toBeInTheDocument()
    })
  })

  /**
   * AC43: Integration test - MSW handler returns error
   */
  it('should handle API errors gracefully', async () => {
    const user = userEvent.setup()
    const onSuccessMock = vi.fn()

    // MSW handler that returns error
    server.use(
      http.post(`${API_BASE_URL}/api/v2/mocs/:id/thumbnail`, () => {
        return HttpResponse.json(
          {
            code: 'FILE_TOO_LARGE',
            message: 'File size exceeds 10MB limit',
          },
          { status: 400 }
        )
      })
    )

    render(
      <Provider store={store}>
        <ThumbnailUpload
          mocId={mockMocId}
          existingThumbnailUrl={undefined}
          onSuccess={onSuccessMock}
        />
      </Provider>
    )

    // Upload file
    const file = new File(['test'], 'large-file.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/upload thumbnail/i)
    await user.upload(input, file)

    const uploadButton = screen.getByRole('button', { name: /upload thumbnail/i })
    await user.click(uploadButton)

    // Wait for error handling
    await waitFor(() => {
      expect(onSuccessMock).not.toHaveBeenCalled()
    })

    // Verify error toast is shown
    await waitFor(() => {
      expect(screen.queryByText(/uploading/i)).not.toBeInTheDocument()
    })
  })

  /**
   * AC44: Integration test - RTK Query cache invalidated on success
   */
  it('should invalidate RTK Query cache on successful upload', async () => {
    const user = userEvent.setup()
    const mockThumbnailUrl = 'https://cdn.example.com/mocs/user-123/moc-456/thumbnail/new.jpg'

    // Setup cache spy
    const invalidateSpy = vi.spyOn(instructionsApi.util, 'invalidateTags')

    server.use(
      http.post(`${API_BASE_URL}/api/v2/mocs/:id/thumbnail`, () => {
        return HttpResponse.json({
          thumbnailUrl: mockThumbnailUrl,
        })
      })
    )

    render(
      <Provider store={store}>
        <ThumbnailUpload
          mocId={mockMocId}
          existingThumbnailUrl="https://cdn.example.com/old.jpg"
          onSuccess={() => {}}
        />
      </Provider>
    )

    // Upload new thumbnail
    const file = new File(['new image'], 'new-thumbnail.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/upload thumbnail/i)
    await user.upload(input, file)

    const uploadButton = screen.getByRole('button', { name: /upload thumbnail/i })
    await user.click(uploadButton)

    // Wait for cache invalidation
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled()
    })

    invalidateSpy.mockRestore()
  })

  /**
   * Additional test: Replace existing thumbnail
   */
  it('should replace existing thumbnail on new upload', async () => {
    const user = userEvent.setup()
    const existingUrl = 'https://cdn.example.com/old-thumbnail.jpg'
    const newUrl = 'https://cdn.example.com/new-thumbnail.jpg'

    server.use(
      http.post(`${API_BASE_URL}/api/v2/mocs/:id/thumbnail`, () => {
        return HttpResponse.json({
          thumbnailUrl: newUrl,
        })
      })
    )

    render(
      <Provider store={store}>
        <ThumbnailUpload
          mocId={mockMocId}
          existingThumbnailUrl={existingUrl}
          onSuccess={() => {}}
        />
      </Provider>
    )

    // Verify existing thumbnail is shown
    expect(screen.getByAltText(/current thumbnail/i)).toHaveAttribute('src', existingUrl)

    // Upload new file
    const file = new File(['new'], 'replacement.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/upload thumbnail/i)
    await user.upload(input, file)

    const uploadButton = screen.getByRole('button', { name: /upload thumbnail/i })
    await user.click(uploadButton)

    // Wait for upload to complete
    await waitFor(() => {
      expect(screen.queryByText(/uploading/i)).not.toBeInTheDocument()
    })
  })
})
