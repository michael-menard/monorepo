/**
 * GotItModal Accessibility Tests
 * Story: SETS-MVP-0340 - Form Validation
 *
 * Tests cover:
 * - AC20: ARIA attributes (aria-invalid, aria-describedby, role="alert")
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

describe('GotItModal - Accessibility Tests', () => {
  const mockOnClose = vi.fn()
  // const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AC20: ARIA attributes - aria-invalid', () => {
    it('has aria-invalid="false" when no validation errors', () => {
      renderWithProviders(
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
      )

      const priceInput = screen.getByTestId('price-paid-input')
      const taxInput = screen.getByTestId('tax-input')
      const shippingInput = screen.getByTestId('shipping-input')
      const dateInput = screen.getByTestId('purchase-date-input')

      expect(priceInput).toHaveAttribute('aria-invalid', 'false')
      expect(taxInput).toHaveAttribute('aria-invalid', 'false')
      expect(shippingInput).toHaveAttribute('aria-invalid', 'false')
      expect(dateInput).toHaveAttribute('aria-invalid', 'false')
    })

    it('sets aria-invalid="true" when validation error exists', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
      )

      const priceInput = screen.getByTestId('price-paid-input') as HTMLInputElement

      // Enter invalid value
      await user.clear(priceInput)
      await user.type(priceInput, '-1')
      fireEvent.blur(priceInput)

      await waitFor(() => {
        expect(priceInput).toHaveAttribute('aria-invalid', 'true')
      })
    })

    it('clears aria-invalid when error is corrected', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
      )

      const priceInput = screen.getByTestId('price-paid-input') as HTMLInputElement

      // Enter invalid value
      await user.clear(priceInput)
      await user.type(priceInput, '-1')
      fireEvent.blur(priceInput)

      await waitFor(() => {
        expect(priceInput).toHaveAttribute('aria-invalid', 'true')
      })

      // Correct the value
      await user.clear(priceInput)
      await user.type(priceInput, '50')
      fireEvent.blur(priceInput)

      await waitFor(() => {
        expect(priceInput).toHaveAttribute('aria-invalid', 'false')
      })
    })
  })

  describe('AC20: ARIA attributes - aria-describedby', () => {
    it('has no aria-describedby when no validation errors', () => {
      renderWithProviders(
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
      )

      const priceInput = screen.getByTestId('price-paid-input')
      const taxInput = screen.getByTestId('tax-input')
      const shippingInput = screen.getByTestId('shipping-input')
      const dateInput = screen.getByTestId('purchase-date-input')

      expect(priceInput).not.toHaveAttribute('aria-describedby')
      expect(taxInput).not.toHaveAttribute('aria-describedby')
      expect(shippingInput).not.toHaveAttribute('aria-describedby')
      expect(dateInput).not.toHaveAttribute('aria-describedby')
    })

    it('links input to error message via aria-describedby', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
      )

      const priceInput = screen.getByTestId('price-paid-input') as HTMLInputElement

      // Enter invalid value
      await user.clear(priceInput)
      await user.type(priceInput, '-1')
      fireEvent.blur(priceInput)

      await waitFor(() => {
        expect(priceInput).toHaveAttribute('aria-describedby', 'pricePaid-error')
      })
    })

    it('error message has matching ID for aria-describedby', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
      )

      const priceInput = screen.getByTestId('price-paid-input') as HTMLInputElement

      // Enter invalid value
      await user.clear(priceInput)
      await user.type(priceInput, '-1')
      fireEvent.blur(priceInput)

      await waitFor(() => {
        const errorMessage = screen.getByText(/Price paid must be at least 0/i)
        expect(errorMessage).toHaveAttribute('id', 'pricePaid-error')
      })
    })

    it('clears aria-describedby when error is corrected', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
      )

      const priceInput = screen.getByTestId('price-paid-input') as HTMLInputElement

      // Enter invalid value
      await user.clear(priceInput)
      await user.type(priceInput, '-1')
      fireEvent.blur(priceInput)

      await waitFor(() => {
        expect(priceInput).toHaveAttribute('aria-describedby', 'pricePaid-error')
      })

      // Correct the value
      await user.clear(priceInput)
      await user.type(priceInput, '50')
      fireEvent.blur(priceInput)

      await waitFor(() => {
        expect(priceInput).not.toHaveAttribute('aria-describedby')
      })
    })
  })

  describe('AC20: ARIA attributes - role="alert"', () => {
    it('error messages have role="alert" for screen reader announcement', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
      )

      const priceInput = screen.getByTestId('price-paid-input') as HTMLInputElement

      // Enter invalid value
      await user.clear(priceInput)
      await user.type(priceInput, '-1')
      fireEvent.blur(priceInput)

      await waitFor(() => {
        const errorMessage = screen.getByText(/Price paid must be at least 0/i)
        expect(errorMessage).toHaveAttribute('role', 'alert')
      })
    })

    it('multiple error messages each have role="alert"', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
      )

      const priceInput = screen.getByTestId('price-paid-input') as HTMLInputElement
      const taxInput = screen.getByTestId('tax-input') as HTMLInputElement

      // Enter invalid values
      await user.clear(priceInput)
      await user.type(priceInput, '-1')
      await user.type(taxInput, '1000000')
      fireEvent.blur(priceInput)
      fireEvent.blur(taxInput)

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert')
        expect(alerts.length).toBeGreaterThanOrEqual(2)
      })
    })
  })

  describe('AC20: Labels and associations', () => {
    it('all inputs have visible labels', () => {
      renderWithProviders(
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
      )

      expect(screen.getByLabelText('Price Paid')).toBeInTheDocument()
      expect(screen.getByLabelText('Tax')).toBeInTheDocument()
      expect(screen.getByLabelText('Shipping')).toBeInTheDocument()
      expect(screen.getByLabelText('Purchase Date')).toBeInTheDocument()
      expect(screen.getByText('Build Status')).toBeInTheDocument()
    })

    it('labels are properly associated with inputs via htmlFor/id', () => {
      renderWithProviders(
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
      )

      const priceInput = screen.getByTestId('price-paid-input')
      const taxInput = screen.getByTestId('tax-input')
      const shippingInput = screen.getByTestId('shipping-input')
      const dateInput = screen.getByTestId('purchase-date-input')

      expect(priceInput).toHaveAttribute('id', 'pricePaid')
      expect(taxInput).toHaveAttribute('id', 'tax')
      expect(shippingInput).toHaveAttribute('id', 'shipping')
      expect(dateInput).toHaveAttribute('id', 'purchaseDate')
    })
  })

  describe('AC20: Error styling', () => {
    it('error messages have red text color', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
      )

      const priceInput = screen.getByTestId('price-paid-input') as HTMLInputElement

      // Enter invalid value
      await user.clear(priceInput)
      await user.type(priceInput, '-1')
      fireEvent.blur(priceInput)

      await waitFor(() => {
        const errorMessage = screen.getByText(/Price paid must be at least 0/i)
        expect(errorMessage.className).toContain('text-red-600')
        expect(errorMessage.className).toContain('dark:text-red-400')
      })
    })

    it('inputs with errors have red border', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
      )

      const priceInput = screen.getByTestId('price-paid-input') as HTMLInputElement

      // Enter invalid value
      await user.clear(priceInput)
      await user.type(priceInput, '-1')
      fireEvent.blur(priceInput)

      await waitFor(() => {
        expect(priceInput.className).toContain('border-red-500')
      })
    })
  })
})
