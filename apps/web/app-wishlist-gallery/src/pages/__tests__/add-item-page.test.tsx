import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { AddWishlistItemPage } from '../add-item-page'

// -----------------------------------------------------------------------------
// Mocks
// -----------------------------------------------------------------------------

// Mock logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

// Mock uploadWishlistImage helper
const uploadWishlistImageMock = vi.fn()
vi.mock('../utils/uploadWishlistImage', () => ({
  uploadWishlistImage: (...args: unknown[]) => uploadWishlistImageMock(...args),
}))

// Mock RTK mutation hook
let addMutationFn: ReturnType<typeof vi.fn>
let unwrapMock: ReturnType<typeof vi.fn>

vi.mock('@repo/api-client/rtk/wishlist-gallery-api', () => {
  addMutationFn = vi.fn()
  unwrapMock = vi.fn()

  return {
    useAddToWishlistMutation: () => [addMutationFn, { isLoading: false }],
  }
})

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function setupLocation(initialHref = 'http://localhost/wishlist/add') {
  const originalLocation = window.location
  // @ts-expect-error override for test
  delete window.location
  // @ts-expect-error minimal href implementation
  window.location = { href: initialHref } as Location
  return originalLocation
}

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

describe('AddWishlistItemPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mutation behavior: resolve to created item
    unwrapMock.mockResolvedValue({
      id: 'wish-123',
      userId: 'user-1',
      title: 'My New Set',
    })
    addMutationFn.mockReturnValue({ unwrap: unwrapMock })

    // Stub URL.createObjectURL for image previews
    // @ts-expect-error partial implementation for tests
    global.URL.createObjectURL = vi.fn(() => 'blob:preview-url')
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('shows validation error when title is missing', async () => {
    const user = userEvent.setup()

    render(<AddWishlistItemPage />)

    const submitButton = screen.getByRole('button', { name: /add to wishlist/i })
    await user.click(submitButton)

    // Title is required by CreateWishlistItemSchema
    expect(await screen.findByText(/title is required/i)).toBeInTheDocument()
    expect(addMutationFn).not.toHaveBeenCalled()
  })

  it('submits minimal valid form and calls add mutation with normalized payload', async () => {
    const user = userEvent.setup()

    const originalLocation = setupLocation()

    try {
      render(<AddWishlistItemPage />)

      // Fill in required title (store defaults to LEGO)
      const titleInput = screen.getByPlaceholder(/medieval castle/i)
      await user.type(titleInput, 'My Test Set')

      const submitButton = screen.getByRole('button', { name: /add to wishlist/i })
      await user.click(submitButton)

      expect(addMutationFn).toHaveBeenCalledTimes(1)
      const payload = addMutationFn.mock.calls[0][0] as any
      expect(payload.title).toBe('My Test Set')
      expect(payload.store).toBe('LEGO')
      // Optional fields normalized
      expect(payload.sourceUrl).toBeUndefined()
      expect(payload.price).toBeUndefined()

      // After successful create (no image), should redirect back to /wishlist
      expect(window.location.href).toContain('/wishlist')
    } finally {
      window.location = originalLocation
    }
  })

  it('uploads image when present and uses created item id', async () => {
    const user = userEvent.setup()

    const originalLocation = setupLocation()

    try {
      uploadWishlistImageMock.mockResolvedValue('https://example.com/image.png')

      const { container } = render(<AddWishlistItemPage />)

      const titleInput = screen.getByPlaceholder(/medieval castle/i)
      await user.type(titleInput, 'Set With Image')

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['dummy'], 'image.png', { type: 'image/png' })
      await user.upload(fileInput, file)

      const submitButton = screen.getByRole('button', { name: /add to wishlist/i })
      await user.click(submitButton)

      expect(addMutationFn).toHaveBeenCalledTimes(1)
      expect(uploadWishlistImageMock).toHaveBeenCalledTimes(1)
      expect(uploadWishlistImageMock).toHaveBeenCalledWith('wish-123', expect.any(File))

      // Redirect after successful create + image upload
      expect(window.location.href).toContain('/wishlist')
    } finally {
      window.location = originalLocation
    }
  })

  it('does not redirect when image upload fails', async () => {
    const user = userEvent.setup()

    const originalLocation = setupLocation()

    try {
      uploadWishlistImageMock.mockRejectedValue(new Error('upload failed'))

      const { container } = render(<AddWishlistItemPage />)

      const titleInput = screen.getByPlaceholder(/medieval castle/i)
      await user.type(titleInput, 'Set With Failing Image')

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['dummy'], 'image.png', { type: 'image/png' })
      await user.upload(fileInput, file)

      const submitButton = screen.getByRole('button', { name: /add to wishlist/i })
      await user.click(submitButton)

      expect(addMutationFn).toHaveBeenCalledTimes(1)
      expect(uploadWishlistImageMock).toHaveBeenCalledTimes(1)

      // Because upload fails, the page should not redirect to /wishlist
      expect(window.location.href).toContain('/wishlist/add')
    } finally {
      window.location = originalLocation
    }
  })
})
