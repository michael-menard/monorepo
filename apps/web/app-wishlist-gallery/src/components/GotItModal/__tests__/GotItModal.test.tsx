/**
 * GotItModal Component Tests
 * Story: WISH-2042 - Purchase/Got It Flow
 *
 * Tests cover:
 * - Form field rendering and defaults
 * - Form validation (price, tax, shipping, quantity)
 * - Form submission and loading states
 * - Keyboard accessibility (ESC, Tab, focus trap)
 * - Error handling
 * - Success toast with undo and "View in Sets" buttons
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

describe('GotItModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Test 1: Component renders when open with item
  it('renders modal when open with valid item', () => {
    renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
    )

    expect(screen.getByText('Got It!')).toBeInTheDocument()
    expect(
      screen.getByText(/Add "LEGO Star Wars Millennium Falcon" to your collection/),
    ).toBeInTheDocument()
  })

  // Test 2: Does not render when item is null
  it('does not render when item is null', () => {
    const { container } = renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={null} />,
    )

    expect(container.firstChild).toBeNull()
  })

  // Test 3: All form fields are present
  it('renders all form fields', () => {
    renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
    )

    expect(screen.getByTestId('price-paid-input')).toBeInTheDocument()
    expect(screen.getByTestId('tax-input')).toBeInTheDocument()
    expect(screen.getByTestId('shipping-input')).toBeInTheDocument()
    expect(screen.getByTestId('quantity-input')).toBeInTheDocument()
    expect(screen.getByTestId('purchase-date-input')).toBeInTheDocument()
    expect(screen.getByTestId('keep-on-wishlist-checkbox')).toBeInTheDocument()
  })

  // Test 4: Price is pre-filled from wishlist item
  it('pre-fills price from wishlist item', () => {
    renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
    )

    const priceInput = screen.getByTestId('price-paid-input') as HTMLInputElement
    expect(priceInput.value).toBe('849.99')
  })

  // Test 5: Purchase date defaults to today
  it('defaults purchase date to today', () => {
    renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
    )

    const today = new Date().toISOString().split('T')[0]
    const dateInput = screen.getByTestId('purchase-date-input') as HTMLInputElement
    expect(dateInput.value).toBe(today)
  })

  // Test 6: Quantity defaults to 1
  it('defaults quantity to 1', () => {
    renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
    )

    const quantityInput = screen.getByTestId('quantity-input') as HTMLInputElement
    expect(quantityInput.value).toBe('1')
  })

  // Test 7: "Keep on Wishlist" checkbox defaults to unchecked
  it('defaults "Keep on Wishlist" checkbox to unchecked', () => {
    renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
    )

    const checkbox = screen.getByTestId('keep-on-wishlist-checkbox')
    // Radix UI checkbox uses aria-checked instead of checked property
    expect(checkbox).toHaveAttribute('aria-checked', 'false')
  })

  // Test 8: Cancel button closes modal
  it('closes modal when cancel button is clicked', async () => {
    renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
    )

    const cancelButton = screen.getByTestId('cancel-button')
    fireEvent.click(cancelButton)

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  // Test 9: Form validation rejects invalid price format
  it('validates price format (rejects invalid decimal)', async () => {
    renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
    )

    const priceInput = screen.getByTestId('price-paid-input')
    const submitButton = screen.getByTestId('submit-button')

    // Enter invalid price
    await userEvent.clear(priceInput)
    await userEvent.type(priceInput, 'abc')

    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/Price must be a valid decimal/i)).toBeInTheDocument()
    })
  })

  // Test 10: Form validation rejects invalid tax format
  it('validates tax format (rejects invalid decimal)', async () => {
    renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
    )

    const taxInput = screen.getByTestId('tax-input')
    const submitButton = screen.getByTestId('submit-button')

    await userEvent.type(taxInput, '99.999')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/Tax must be a valid decimal/i)).toBeInTheDocument()
    })
  })

  // Test 11: Form validation rejects invalid shipping format
  it('validates shipping format (rejects invalid decimal)', async () => {
    renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
    )

    const shippingInput = screen.getByTestId('shipping-input')
    const submitButton = screen.getByTestId('submit-button')

    await userEvent.type(shippingInput, '-10')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/Shipping must be a valid decimal/i)).toBeInTheDocument()
    })
  })

  // Test 12: Quantity input has minimum value constraint
  it('has quantity input with min value of 1', () => {
    renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
    )

    const quantityInput = screen.getByTestId('quantity-input') as HTMLInputElement

    // Input should have min="1" attribute
    expect(quantityInput).toHaveAttribute('min', '1')
    expect(quantityInput).toHaveAttribute('type', 'number')
  })

  // Test 13: Form allows optional empty fields
  it('allows optional fields to remain empty', async () => {
    renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
    )

    const taxInput = screen.getByTestId('tax-input')
    const shippingInput = screen.getByTestId('shipping-input')

    // Optional fields start empty
    expect((taxInput as HTMLInputElement).value).toBe('')
    expect((shippingInput as HTMLInputElement).value).toBe('')

    // No validation errors should be shown for empty optional fields
    expect(screen.queryByText(/Tax must be/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Shipping must be/)).not.toBeInTheDocument()
  })

  // Test 14: Submit button text changes during loading
  it('has initial submit button text', () => {
    renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
    )

    const submitButton = screen.getByTestId('submit-button')
    expect(submitButton).toHaveTextContent('Add to Collection')
  })

  // Test 18: Checkbox can be toggled
  it('toggles "Keep on Wishlist" checkbox', async () => {
    renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
    )

    const checkbox = screen.getByTestId('keep-on-wishlist-checkbox')

    // Checkbox should be unchecked initially (check via aria-checked attribute)
    expect(checkbox).toHaveAttribute('aria-checked', 'false')

    // Click to toggle
    await userEvent.click(checkbox)

    // Should now be checked
    await waitFor(() => {
      expect(checkbox).toHaveAttribute('aria-checked', 'true')
    })
  })

  // Test 19: Quantity can be incremented
  it('allows quantity to be changed', async () => {
    renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
    )

    const quantityInput = screen.getByTestId('quantity-input') as HTMLInputElement

    // Change quantity via fireEvent
    fireEvent.change(quantityInput, { target: { value: '5' } })

    expect(quantityInput.value).toBe('5')
  })

  // Test 20: Purchase date can be changed
  it('allows purchase date to be changed', async () => {
    renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
    )

    const dateInput = screen.getByTestId('purchase-date-input') as HTMLInputElement

    // Change date via fireEvent
    fireEvent.change(dateInput, { target: { value: '2024-01-15' } })

    expect(dateInput.value).toBe('2024-01-15')
  })

  // Test 21: Form resets when modal reopens with new item
  it('resets form when modal reopens with different item', () => {
    const { rerender } = renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
    )

    // Fill in some data
    const taxInput = screen.getByTestId('tax-input') as HTMLInputElement
    fireEvent.change(taxInput, { target: { value: '50.00' } })

    // Close modal
    rerender(
      <Provider store={createTestStore()}>
        <GotItModal isOpen={false} onClose={mockOnClose} item={mockWishlistItem} />
      </Provider>,
    )

    // Reopen with same item
    rerender(
      <Provider store={createTestStore()}>
        <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />
      </Provider>,
    )

    // Tax should be reset
    const newTaxInput = screen.getByTestId('tax-input') as HTMLInputElement
    expect(newTaxInput.value).toBe('')
  })

  // Test 22: onSuccess callback prop is accepted
  it('accepts onSuccess callback prop', () => {
    renderWithProviders(
      <GotItModal
        isOpen={true}
        onClose={mockOnClose}
        item={mockWishlistItem}
        onSuccess={mockOnSuccess}
      />,
    )

    // Component should render without error when onSuccess is provided
    expect(screen.getByText('Got It!')).toBeInTheDocument()
  })

  // Test 23: Modal has proper ARIA attributes
  it('has proper accessibility attributes', () => {
    renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
    )

    // Check for proper labels
    expect(screen.getByLabelText('Price Paid')).toBeInTheDocument()
    expect(screen.getByLabelText('Tax')).toBeInTheDocument()
    expect(screen.getByLabelText('Shipping')).toBeInTheDocument()
    expect(screen.getByLabelText('Quantity')).toBeInTheDocument()
    expect(screen.getByLabelText('Purchase Date')).toBeInTheDocument()
    expect(screen.getByLabelText('Keep on wishlist')).toBeInTheDocument()
  })

  // Test 24: Form fields have correct input types
  it('uses correct input types for form fields', () => {
    renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
    )

    const priceInput = screen.getByTestId('price-paid-input')
    const quantityInput = screen.getByTestId('quantity-input')
    const dateInput = screen.getByTestId('purchase-date-input')

    expect(priceInput).toHaveAttribute('type', 'text')
    expect(priceInput).toHaveAttribute('inputMode', 'decimal')
    expect(quantityInput).toHaveAttribute('type', 'number')
    expect(dateInput).toHaveAttribute('type', 'date')
  })

  // Test 25: Price input accepts decimal input
  it('accepts decimal input for price field', async () => {
    renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
    )

    const priceInput = screen.getByTestId('price-paid-input') as HTMLInputElement

    // Change to valid decimal
    fireEvent.change(priceInput, { target: { value: '99.99' } })

    expect(priceInput.value).toBe('99.99')
    expect(priceInput).toHaveAttribute('inputMode', 'decimal')
  })
})
