import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { WishlistItem } from '@repo/api-client/schemas/wishlist'
import { GotItModal } from '..'

vi.mock('@repo/app-component-library', async () => {
  const actual = await vi.importActual<typeof import('@repo/app-component-library')>(
    '@repo/app-component-library',
  )
  return {
    ...actual,
    useToast: () => ({
      toast: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
      dismiss: vi.fn(),
      dismissAll: vi.fn(),
    }),
  }
})

const markAsPurchasedMock = vi.fn()

vi.mock('@repo/api-client/rtk/wishlist-gallery-api', () => ({
  useMarkAsPurchasedMutation: () => [markAsPurchasedMock, { isLoading: false }],
}))

const mockItem: WishlistItem = {
  id: 'item-1',
  userId: 'user-1',
  title: 'Test Set',
  store: 'LEGO',
  setNumber: '12345',
  sourceUrl: null,
  imageUrl: null,
  price: '99.99',
  currency: 'USD',
  pieceCount: 1000,
  releaseDate: null,
  tags: [],
  priority: 3,
  notes: null,
  sortOrder: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('GotItModal', () => {
  it('pre-fills price from wishlist item', () => {
    render(<GotItModal open onOpenChange={vi.fn()} item={mockItem} />)

    const priceInput = screen.getByLabelText(/price paid/i) as HTMLInputElement
    expect(priceInput.value).toBe('99.99')
  })

  it('submits purchase data via mutation', async () => {
    markAsPurchasedMock.mockResolvedValueOnce({ unwrap: () => Promise.resolve() })

    const onOpenChange = vi.fn()

    render(<GotItModal open onOpenChange={onOpenChange} item={mockItem} />)

    const submitButton = screen.getByRole('button', { name: /add to collection/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(markAsPurchasedMock).toHaveBeenCalled()
    })
  })
})
