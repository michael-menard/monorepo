/**
 * GotItModal Validation Tests
 * Story: SETS-MVP-0340 - Form Validation
 *
 * Tests cover:
 * - AC18: Price validation (0.00-999999.99 range, decimal precision)
 * - AC19: Date validation (no future dates)
 * - AC21: Type consistency (valueAsNumber conversion)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import type { WishlistItem } from '@repo/api-client/schemas/wishlist'
import { wishlistGalleryApi } from '@repo/api-client/rtk/wishlist-gallery-api'
import { GotItModal } from '../index'

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    custom: vi.fn(() => 'mock-toast-id'),
    dismiss: vi.fn(),
  },
}))

// Mock data
const mockWishlistItem: WishlistItem = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  userId: '123e4567-e89b-12d3-a456-426614174001',
  title: 'LEGO Star Wars Millennium Falcon',
  store: 'LEGO',
  setNumber: '75192',
  sourceUrl: 'https://lego.com/product/75192',
  imageUrl: 'https://example.com/image.jpg',
  price: '849.99',
  currency: 'USD',
  pieceCount: 7541,
  releaseDate: '2023-01-01T00:00:00.000Z',
  tags: ['Star Wars', 'UCS'],
  priority: 5,
  notes: 'Dream set!',
  sortOrder: 1,
  status: 'wishlist',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
  createdBy: null,
  updatedBy: null,
}

// Helper to create a test store with mocked RTK Query
function createTestStore() {
  return configureStore({
    reducer: {
      [wishlistGalleryApi.reducerPath]: wishlistGalleryApi.reducer,
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware().concat(wishlistGalleryApi.middleware),
  })
}

// Helper to render with providers
function renderWithProviders(ui: React.ReactElement) {
  const store = createTestStore()
  return {
    ...render(<Provider store={store}>{ui}</Provider>),
    store,
  }
}

describe('GotItModal - Validation Tests', () => {
  const mockOnClose = vi.fn()
  // const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AC18: Price validation (0.00-999999.99)', () => {
    it('accepts minimum valid price: 0.00', async () => {
      renderWithProviders(
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
      )

      const priceInput = screen.getByTestId('price-paid-input') as HTMLInputElement

      // Clear and enter 0
      await userEvent.clear(priceInput)
      await userEvent.type(priceInput, '0')

      // Blur to trigger validation
      fireEvent.blur(priceInput)

      // No error should appear
      await waitFor(() => {
        expect(screen.queryByText(/Price paid must be at least/i)).not.toBeInTheDocument()
      })
    })

    it('accepts maximum valid price: 999999.99', async () => {
      renderWithProviders(
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
      )

      const priceInput = screen.getByTestId('price-paid-input') as HTMLInputElement

      await userEvent.clear(priceInput)
      await userEvent.type(priceInput, '999999.99')
      fireEvent.blur(priceInput)

      await waitFor(() => {
        expect(screen.queryByText(/cannot exceed/i)).not.toBeInTheDocument()
      })
    })

    it('rejects price below minimum: -0.01', async () => {
      renderWithProviders(
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
      )

      const priceInput = screen.getByTestId('price-paid-input') as HTMLInputElement

      await userEvent.clear(priceInput)
      await userEvent.type(priceInput, '-0.01')
      fireEvent.blur(priceInput)

      await waitFor(() => {
        expect(screen.getByText(/Price paid must be at least 0/i)).toBeInTheDocument()
      })
    })

    it('rejects price above maximum: 1000000.00', async () => {
      renderWithProviders(
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
      )

      const priceInput = screen.getByTestId('price-paid-input') as HTMLInputElement

      await userEvent.clear(priceInput)
      await userEvent.type(priceInput, '1000000')
      fireEvent.blur(priceInput)

      await waitFor(() => {
        expect(screen.getByText(/Price paid cannot exceed 999999.99/i)).toBeInTheDocument()
      })
    })

    it('accepts valid decimal: 99.99', async () => {
      renderWithProviders(
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
      )

      const priceInput = screen.getByTestId('price-paid-input') as HTMLInputElement

      await userEvent.clear(priceInput)
      await userEvent.type(priceInput, '99.99')
      fireEvent.blur(priceInput)

      await waitFor(() => {
        expect(screen.queryByText(/decimal/i)).not.toBeInTheDocument()
      })
    })

    it('accepts empty price (optional field)', async () => {
      renderWithProviders(
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
      )

      const priceInput = screen.getByTestId('price-paid-input') as HTMLInputElement

      await userEvent.clear(priceInput)
      fireEvent.blur(priceInput)

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      })
    })

    it('validates tax field with same constraints', async () => {
      renderWithProviders(
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
      )

      const taxInput = screen.getByTestId('tax-input') as HTMLInputElement

      await userEvent.type(taxInput, '1000000')
      fireEvent.blur(taxInput)

      await waitFor(() => {
        expect(screen.getByText(/Tax cannot exceed 999999.99/i)).toBeInTheDocument()
      })
    })

    it('validates shipping field with same constraints', async () => {
      renderWithProviders(
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
      )

      const shippingInput = screen.getByTestId('shipping-input') as HTMLInputElement

      await userEvent.type(shippingInput, '-5')
      fireEvent.blur(shippingInput)

      await waitFor(() => {
        expect(screen.getByText(/Shipping must be at least 0/i)).toBeInTheDocument()
      })
    })
  })

  describe('AC19: Date validation (no future dates)', () => {
    it("accepts today's date", async () => {
      renderWithProviders(
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
      )

      const dateInput = screen.getByTestId('purchase-date-input') as HTMLInputElement
      const today = new Date().toISOString().split('T')[0]

      fireEvent.change(dateInput, { target: { value: today } })
      fireEvent.blur(dateInput)

      await waitFor(() => {
        expect(screen.queryByText(/must be in the past/i)).not.toBeInTheDocument()
      })
    })

    it('accepts past date', async () => {
      renderWithProviders(
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
      )

      const dateInput = screen.getByTestId('purchase-date-input') as HTMLInputElement

      fireEvent.change(dateInput, { target: { value: '2024-01-01' } })
      fireEvent.blur(dateInput)

      await waitFor(() => {
        expect(screen.queryByText(/must be in the past/i)).not.toBeInTheDocument()
      })
    })

    it('rejects future date', async () => {
      renderWithProviders(
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
      )

      const dateInput = screen.getByTestId('purchase-date-input') as HTMLInputElement
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)
      const futureDateString = futureDate.toISOString().split('T')[0]

      fireEvent.change(dateInput, { target: { value: futureDateString } })
      fireEvent.blur(dateInput)

      await waitFor(() => {
        expect(screen.getByText(/Purchase date must be in the past/i)).toBeInTheDocument()
      })
    })

    it('has HTML5 max attribute set to today', () => {
      renderWithProviders(
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
      )

      const dateInput = screen.getByTestId('purchase-date-input') as HTMLInputElement
      const today = new Date().toISOString().split('T')[0]

      expect(dateInput).toHaveAttribute('max', today)
    })
  })

  describe('AC21: Type consistency (valueAsNumber)', () => {
    it('price inputs have type="number"', () => {
      renderWithProviders(
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
      )

      const priceInput = screen.getByTestId('price-paid-input')
      const taxInput = screen.getByTestId('tax-input')
      const shippingInput = screen.getByTestId('shipping-input')

      expect(priceInput).toHaveAttribute('type', 'number')
      expect(taxInput).toHaveAttribute('type', 'number')
      expect(shippingInput).toHaveAttribute('type', 'number')
    })

    it('price inputs have step="0.01" for decimal precision', () => {
      renderWithProviders(
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
      )

      const priceInput = screen.getByTestId('price-paid-input')
      const taxInput = screen.getByTestId('tax-input')
      const shippingInput = screen.getByTestId('shipping-input')

      expect(priceInput).toHaveAttribute('step', '0.01')
      expect(taxInput).toHaveAttribute('step', '0.01')
      expect(shippingInput).toHaveAttribute('step', '0.01')
    })

    it('price inputs have min="0" attribute', () => {
      renderWithProviders(
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
      )

      const priceInput = screen.getByTestId('price-paid-input')
      const taxInput = screen.getByTestId('tax-input')
      const shippingInput = screen.getByTestId('shipping-input')

      expect(priceInput).toHaveAttribute('min', '0')
      expect(taxInput).toHaveAttribute('min', '0')
      expect(shippingInput).toHaveAttribute('min', '0')
    })

    it('price inputs have max="999999.99" attribute', () => {
      renderWithProviders(
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
      )

      const priceInput = screen.getByTestId('price-paid-input')
      const taxInput = screen.getByTestId('tax-input')
      const shippingInput = screen.getByTestId('shipping-input')

      expect(priceInput).toHaveAttribute('max', '999999.99')
      expect(taxInput).toHaveAttribute('max', '999999.99')
      expect(shippingInput).toHaveAttribute('max', '999999.99')
    })
  })

  describe('Error clearing', () => {
    it('clears error when user corrects price input', async () => {
      renderWithProviders(
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
      )

      const priceInput = screen.getByTestId('price-paid-input') as HTMLInputElement

      // Enter invalid value
      await userEvent.clear(priceInput)
      await userEvent.type(priceInput, '-1')
      fireEvent.blur(priceInput)

      await waitFor(() => {
        expect(screen.getByText(/Price paid must be at least 0/i)).toBeInTheDocument()
      })

      // Correct the value
      await userEvent.clear(priceInput)
      await userEvent.type(priceInput, '50')
      fireEvent.blur(priceInput)

      await waitFor(() => {
        expect(screen.queryByText(/Price paid must be at least 0/i)).not.toBeInTheDocument()
      })
    })
  })
})
