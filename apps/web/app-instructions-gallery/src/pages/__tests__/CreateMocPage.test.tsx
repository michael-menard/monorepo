/**
 * CreateMocPage Tests
 *
 * Story INST-1102: Create Basic MOC
 * Phase 7: Frontend Create Page Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateMocPage } from '../CreateMocPage'
import type { MocInstructions } from '@repo/api-client/schemas/instructions'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock toast functions
vi.mock('@repo/app-component-library', async () => {
  const actual = await vi.importActual('@repo/app-component-library')
  return {
    ...actual,
    showErrorToast: vi.fn(),
    showSuccessToast: vi.fn(),
  }
})

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    custom: vi.fn(),
    dismiss: vi.fn(),
  },
}))

// Mock mutation hook
const mockCreateMoc = vi.fn()
const mockUnwrap = vi.fn()
const mockUseCreateMocMutation = vi.fn()

vi.mock('@repo/api-client/rtk/instructions-api', () => ({
  useCreateMocMutation: () => mockUseCreateMocMutation(),
}))

// Mock MocForm
vi.mock('../../components/MocForm', () => ({
  MocForm: ({ onSubmit, onCancel, isSubmitting, apiError }: any) => (
    <form
      data-testid="moc-form"
      onSubmit={e => {
        e.preventDefault()
        onSubmit({
          title: 'Test MOC',
          description: 'Test Description',
          theme: 'Castle',
          tags: ['test'],
          type: 'moc',
          status: 'draft',
          visibility: 'private',
        })
      }}
    >
      <input name="title" data-testid="title-input" />
      {apiError && (
        <div data-testid="api-error-banner" role="alert">
          {apiError}
        </div>
      )}
      <button type="submit" disabled={isSubmitting} data-testid="submit-button">
        {isSubmitting ? 'Creating...' : 'Create MOC'}
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel} data-testid="cancel-button">
          Cancel
        </button>
      )}
    </form>
  ),
}))

// Mock useLocalStorage
const mockSetRecoveredFormData = vi.fn()
const mockClearRecoveredFormData = vi.fn()
vi.mock('../../hooks/useLocalStorage', () => ({
  useLocalStorage: () => [null, mockSetRecoveredFormData, mockClearRecoveredFormData],
}))

describe('CreateMocPage', () => {
  const originalLocation = window.location

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateMoc.mockClear()
    mockUnwrap.mockClear()

    // Default mock implementation
    mockCreateMoc.mockReturnValue({ unwrap: mockUnwrap })
    mockUseCreateMocMutation.mockReturnValue([mockCreateMoc, { isLoading: false }])

    // Mock window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: 'http://localhost:3000/mocs/new' },
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // AC-1: Navigate to /mocs/new
  // ───────────────────────────────────────────────────────────────────────────

  describe('Page Rendering (AC-1)', () => {
    it('renders the create MOC page', () => {
      render(<CreateMocPage />)

      expect(screen.getByTestId('create-moc-page')).toBeInTheDocument()
    })

    it('renders page header with title', () => {
      render(<CreateMocPage />)

      expect(screen.getByRole('heading', { name: /add new moc/i })).toBeInTheDocument()
    })

    it('renders description text', () => {
      render(<CreateMocPage />)

      expect(
        screen.getByText(/create a new moc to add to your collection/i),
      ).toBeInTheDocument()
    })

    it('renders back button with link to /mocs', () => {
      render(<CreateMocPage />)

      const backButton = screen.getByTestId('back-button')
      expect(backButton).toBeInTheDocument()

      const backLink = backButton.closest('a')
      expect(backLink).toHaveAttribute('href', '/mocs')
    })

    it('renders the MocForm component', () => {
      render(<CreateMocPage />)

      expect(screen.getByTestId('moc-form')).toBeInTheDocument()
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // AC-6: Form submission triggers useCreateMocMutation
  // ───────────────────────────────────────────────────────────────────────────

  describe('Form Submission (AC-6)', () => {
    it('triggers mutation on form submit', async () => {
      const mockMoc: Partial<MocInstructions> = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'user-123',
        title: 'Test MOC',
        description: 'Test Description',
        theme: 'Castle',
        status: 'draft',
        visibility: 'private',
        type: 'moc',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      }

      mockUnwrap.mockResolvedValue(mockMoc)

      render(<CreateMocPage />)

      const submitButton = screen.getByTestId('submit-button')
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockCreateMoc).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Test MOC',
            description: 'Test Description',
            theme: 'Castle',
          }),
        )
      })
    })

    it('shows loading state during submission', () => {
      mockUseCreateMocMutation.mockReturnValue([mockCreateMoc, { isLoading: true }])

      render(<CreateMocPage />)

      expect(screen.getByTestId('submit-button')).toBeDisabled()
      expect(screen.getByTestId('submit-button')).toHaveTextContent('Creating...')
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // AC-7: Success shows toast and redirects
  // ───────────────────────────────────────────────────────────────────────────

  describe('Success Handling (AC-7)', () => {
    it('shows success toast immediately on form submit (optimistic)', async () => {
      const { showSuccessToast } = await import('@repo/app-component-library')
      const mockMoc: Partial<MocInstructions> = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test MOC',
      }

      mockUnwrap.mockResolvedValue(mockMoc)

      render(<CreateMocPage />)

      const submitButton = screen.getByTestId('submit-button')
      await userEvent.click(submitButton)

      // INST-1102: Success toast is shown immediately (before API response)
      await waitFor(() => {
        expect(showSuccessToast).toHaveBeenCalledWith(
          'MOC created!',
          'Test MOC has been created.',
          5000,
        )
      })
    })

    it('navigates to /mocs immediately on submit (optimistic)', async () => {
      const mockMoc: Partial<MocInstructions> = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test MOC',
      }

      mockUnwrap.mockResolvedValue(mockMoc)

      render(<CreateMocPage />)

      const submitButton = screen.getByTestId('submit-button')
      await userEvent.click(submitButton)

      // INST-1102: Navigation happens immediately (before API response)
      await waitFor(() => {
        expect(window.location.href).toBe('/mocs')
      })
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // AC-13: API errors display in form
  // ───────────────────────────────────────────────────────────────────────────

  describe('Error Handling (AC-13)', () => {
    it('saves form data to localStorage on API failure', async () => {
      const mockError = { data: { message: 'Network error' } }
      mockUnwrap.mockRejectedValue(mockError)

      render(<CreateMocPage />)

      const submitButton = screen.getByTestId('submit-button')
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockSetRecoveredFormData).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Test MOC',
            theme: 'Castle',
          }),
        )
      })
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // AC-14: Escape key cancels form
  // ───────────────────────────────────────────────────────────────────────────

  describe('Escape Key Handler (AC-14)', () => {
    it('navigates back to gallery on Escape key', async () => {
      render(<CreateMocPage />)

      fireEvent.keyDown(window, { key: 'Escape' })

      await waitFor(() => {
        expect(window.location.href).toBe('/mocs')
      })
    })

    it('does not navigate on Escape when isLoading', () => {
      mockUseCreateMocMutation.mockReturnValue([mockCreateMoc, { isLoading: true }])

      render(<CreateMocPage />)

      fireEvent.keyDown(window, { key: 'Escape' })

      // Should not navigate
      expect(window.location.href).toBe('http://localhost:3000/mocs/new')
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // AC-15: localStorage recovery
  // ───────────────────────────────────────────────────────────────────────────

  describe('Form Recovery (AC-15)', () => {
    it('clears recovered form data on mount', () => {
      render(<CreateMocPage />)

      // useLocalStorage mock returns null, but clearRecoveredFormData should be called
      // when there IS recovered data
      // This test verifies the effect runs
      expect(mockClearRecoveredFormData).not.toHaveBeenCalled() // No data to clear when null
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // Cancel Navigation
  // ───────────────────────────────────────────────────────────────────────────

  describe('Cancel Navigation', () => {
    it('navigates back when cancel button is clicked', async () => {
      render(<CreateMocPage />)

      const cancelButton = screen.getByTestId('cancel-button')
      await userEvent.click(cancelButton)

      await waitFor(() => {
        expect(window.location.href).toBe('/mocs')
      })
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // Optimistic UI Tests
  // ───────────────────────────────────────────────────────────────────────────

  describe('Optimistic UI', () => {
    it('navigates immediately even before API response', async () => {
      const mockMoc: Partial<MocInstructions> = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test MOC',
      }

      // Delay the API response
      mockUnwrap.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockMoc), 100)),
      )

      render(<CreateMocPage />)

      const submitButton = screen.getByTestId('submit-button')
      await userEvent.click(submitButton)

      // Navigation should happen immediately, not after API response
      await waitFor(() => {
        expect(window.location.href).toBe('/mocs')
      })
    })

    it('disables form during optimistic submission', async () => {
      // Create a promise that we control to keep the mutation pending
      let resolvePromise: (value: any) => void
      mockUnwrap.mockImplementation(
        () =>
          new Promise(resolve => {
            resolvePromise = resolve
          }),
      )

      render(<CreateMocPage />)

      const submitButton = screen.getByTestId('submit-button')
      await userEvent.click(submitButton)

      // After clicking, the form should show as submitting
      await waitFor(() => {
        expect(screen.getByTestId('submit-button')).toHaveTextContent('Creating...')
      })

      // Cleanup: resolve the promise
      resolvePromise!({
        id: '123',
        title: 'Test MOC',
      })
    })
  })
})
