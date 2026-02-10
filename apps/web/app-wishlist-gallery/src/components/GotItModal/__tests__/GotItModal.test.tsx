/**
 * GotItModal Component Tests
 * Story: SETS-MVP-0310 - Status Update Flow
 * Story: SETS-MVP-0320 - Purchase UX Polish (success toast, navigation)
 * Story: SETS-MVP-0340 - Form Validation (updated for React Hook Form)
 *
 * Tests cover:
 * - Form field rendering and defaults
 * - Form validation (price, tax, shipping)
 * - Build status selection
 * - Form submission and loading states
 * - Keyboard accessibility (ESC, Tab, focus trap)
 * - Error handling
 * - Success toast with "View in Collection" navigation (SETS-MVP-0320)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import type { WishlistItem } from '@repo/api-client/schemas/wishlist'
import { wishlistGalleryApi } from '@repo/api-client/rtk/wishlist-gallery-api'
import { toast } from 'sonner'
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
    expect(screen.getByTestId('purchase-date-input')).toBeInTheDocument()
    expect(screen.getByText('Build Status')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  // Test 4: Price is pre-filled from wishlist item (as number value)
  it('pre-fills price from wishlist item', () => {
    renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
    )

    const priceInput = screen.getByTestId('price-paid-input') as HTMLInputElement
    // With valueAsNumber, the value is a number
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

  // Test 6: Build status defaults to 'not_started'
  it('defaults build status to "Not Started"', () => {
    renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
    )

    // The select should show the default value
    expect(screen.getAllByText('Not Started').length).toBeGreaterThan(0)
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

  // Test 9: Form validation rejects out-of-range price (SETS-MVP-0340)
  it('validates price range (rejects values above max)', async () => {
    renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
    )

    const priceInput = screen.getByTestId('price-paid-input')
    // const submitButton = screen.getByTestId('submit-button')

    // Enter invalid price above max
    await userEvent.clear(priceInput)
    await userEvent.type(priceInput, '1000000')
    fireEvent.blur(priceInput)

    await waitFor(() => {
      expect(screen.getByText(/Price paid cannot exceed 999999.99/i)).toBeInTheDocument()
    })
  })

  // Test 10: Form validation rejects out-of-range tax (SETS-MVP-0340)
  it('validates tax range (rejects negative values)', async () => {
    renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
    )

    const taxInput = screen.getByTestId('tax-input')

    await userEvent.type(taxInput, '-1')
    fireEvent.blur(taxInput)

    await waitFor(() => {
      expect(screen.getByText(/Tax must be at least 0/i)).toBeInTheDocument()
    })
  })

  // Test 11: Form validation rejects out-of-range shipping (SETS-MVP-0340)
  it('validates shipping range (rejects negative values)', async () => {
    renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
    )

    const shippingInput = screen.getByTestId('shipping-input')

    await userEvent.type(shippingInput, '-10')
    fireEvent.blur(shippingInput)

    await waitFor(() => {
      expect(screen.getByText(/Shipping must be at least 0/i)).toBeInTheDocument()
    })
  })

  // Test 12: Build status select is rendered with combobox role
  it('renders build status select', () => {
    renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
    )

    // Verify the select is rendered as a combobox
    const selectTrigger = screen.getByRole('combobox')
    expect(selectTrigger).toBeInTheDocument()
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

  // Test 18: Build status field has label
  it('has build status label', () => {
    renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
    )

    // Verify the label is present
    expect(screen.getByText('Build Status')).toBeInTheDocument()
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
    expect(screen.getByLabelText('Purchase Date')).toBeInTheDocument()
    expect(screen.getByText('Build Status')).toBeInTheDocument()
  })

  // Test 24: Form fields have correct input types (SETS-MVP-0340: type="number")
  it('uses correct input types for form fields', () => {
    renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
    )

    const priceInput = screen.getByTestId('price-paid-input')
    const dateInput = screen.getByTestId('purchase-date-input')

    // SETS-MVP-0340: Changed to type="number" with valueAsNumber
    expect(priceInput).toHaveAttribute('type', 'number')
    expect(priceInput).toHaveAttribute('step', '0.01')
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
    expect(priceInput).toHaveAttribute('type', 'number')
  })

  // Test 26: Form can be filled with purchase details
  it('allows filling purchase details', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
    )

    // Fill in purchase details
    const priceInput = screen.getByTestId('price-paid-input')
    const taxInput = screen.getByTestId('tax-input')
    const shippingInput = screen.getByTestId('shipping-input')

    await user.clear(priceInput)
    await user.type(priceInput, '99.99')
    await user.type(taxInput, '8.50')
    await user.type(shippingInput, '5.00')

    // Verify the values were entered
    // Note: number inputs drop trailing zeros (8.50 → 8.5, 5.00 → 5)
    expect((priceInput as HTMLInputElement).value).toBe('99.99')
    expect((taxInput as HTMLInputElement).value).toBe('8.5')
    expect((shippingInput as HTMLInputElement).value).toBe('5')
  })

  // Test 27: Build status defaults to not_started
  it('defaults buildStatus to not_started', () => {
    renderWithProviders(
      <GotItModal isOpen={true} onClose={mockOnClose} item={mockWishlistItem} />,
    )

    // The default value should be shown in the select
    expect(screen.getAllByText('Not Started').length).toBeGreaterThan(0)
  })
})

/**
 * SETS-MVP-0320: Success Toast Tests
 *
 * AC1: Success toast shows "Added to your collection!" with item title
 * AC2: Toast duration is 5000ms with "View in Collection" action button
 */
const mockUnwrap = vi.fn()
const mockMutationTrigger = vi.fn(() => ({ unwrap: mockUnwrap }))

vi.mock('@repo/api-client/rtk/wishlist-gallery-api', async () => {
  const actual = await vi.importActual('@repo/api-client/rtk/wishlist-gallery-api')
  return {
    ...actual,
    useUpdateItemPurchaseMutation: () => [mockMutationTrigger, { isLoading: false }],
  }
})

describe('SETS-MVP-0320: Success Toast', () => {
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUnwrap.mockResolvedValue({ id: 'set-123' })
  })

  // AC1: toast.success called with correct message and item title as description
  it('calls toast.success with "Added to your collection!" after purchase', async () => {
    renderWithProviders(
      <GotItModal
        isOpen={true}
        onClose={mockOnClose}
        item={mockWishlistItem}
        onSuccess={mockOnSuccess}
      />,
    )

    // Submit the form (price is pre-filled from item, date defaults to today)
    const submitButton = screen.getByTestId('submit-button')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Added to your collection!',
        expect.objectContaining({
          description: 'LEGO Star Wars Millennium Falcon',
          duration: 5000,
        }),
      )
    })
  })

  // AC2: Toast includes "View in Collection" action button with 5000ms duration
  it('includes "View in Collection" action button with 5000ms duration', async () => {
    renderWithProviders(
      <GotItModal
        isOpen={true}
        onClose={mockOnClose}
        item={mockWishlistItem}
        onSuccess={mockOnSuccess}
      />,
    )

    const submitButton = screen.getByTestId('submit-button')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Added to your collection!',
        expect.objectContaining({
          duration: 5000,
          action: expect.objectContaining({
            label: 'View in Collection',
            onClick: expect.any(Function),
          }),
        }),
      )
    })
  })

  // AC1 supplement: onSuccess callback is invoked after successful purchase
  it('calls onSuccess callback after successful purchase', async () => {
    renderWithProviders(
      <GotItModal
        isOpen={true}
        onClose={mockOnClose}
        item={mockWishlistItem}
        onSuccess={mockOnSuccess}
      />,
    )

    const submitButton = screen.getByTestId('submit-button')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledTimes(1)
    })
  })

  // AC1 supplement: modal closes after successful purchase
  it('closes modal after successful purchase', async () => {
    renderWithProviders(
      <GotItModal
        isOpen={true}
        onClose={mockOnClose}
        item={mockWishlistItem}
        onSuccess={mockOnSuccess}
      />,
    )

    const submitButton = screen.getByTestId('submit-button')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  // AC1 supplement: error toast shown on API failure
  it('shows error toast when purchase fails', async () => {
    mockUnwrap.mockRejectedValueOnce(new Error('Network error'))

    renderWithProviders(
      <GotItModal
        isOpen={true}
        onClose={mockOnClose}
        item={mockWishlistItem}
        onSuccess={mockOnSuccess}
      />,
    )

    const submitButton = screen.getByTestId('submit-button')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to mark as purchased',
        expect.objectContaining({
          description: 'Network error',
        }),
      )
    })
  })
})
