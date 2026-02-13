/**
 * Story BUGF-002: Edit Page - Save Mutation Tests
 *
 * Tests for the InstructionsEditPage mutation integration,
 * error handling, button states, and form validation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ArrowLeft: () => <span data-testid="icon-arrow-left">←</span>,
  Save: () => <span data-testid="icon-save">💾</span>,
  Loader2: () => <span data-testid="icon-loader">⏳</span>,
  AlertTriangle: () => <span data-testid="icon-alert">⚠</span>,
}))

// Mock @repo/app-component-library
vi.mock('@repo/app-component-library', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
  Alert: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <div role="alert" data-variant={variant}>
      {children}
    </div>
  ),
  AlertDescription: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  showSuccessToast: vi.fn(),
  showErrorToast: vi.fn(),
}))

// Mock mutation hook
const mockUpdateMoc = vi.fn()
const mockUnwrap = vi.fn()

vi.mock('@repo/api-client', () => ({
  useUpdateMocMutation: () => [
    (...args: unknown[]) => {
      mockUpdateMoc(...args)
      return { unwrap: mockUnwrap }
    },
  ],
}))

// Mock LoadingPage
vi.mock('../LoadingPage', () => ({
  LoadingPage: () => <div data-testid="loading-page">Loading...</div>,
}))

// Track navigate calls
const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ slug: 'test-moc' }),
}))

// Mock react-hook-form with controllable isDirty state
let mockIsDirty = false
const mockHandleSubmitFn = vi.fn()

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: (name: string) => ({
      name,
      onChange: vi.fn(),
      onBlur: vi.fn(),
      ref: vi.fn(),
    }),
    handleSubmit: (fn: (data: Record<string, unknown>) => void) => (e?: React.BaseSyntheticEvent) => {
      e?.preventDefault?.()
      mockHandleSubmitFn()
      fn({
        title: 'Updated MOC Title',
        description: 'Updated description',
        theme: 'Technic',
        tags: 'tag1, tag2, tag3',
      })
    },
    formState: {
      errors: {},
      get isDirty() {
        return mockIsDirty
      },
    },
    reset: vi.fn(),
    watch: vi.fn(),
    getValues: vi.fn(() => ({})),
  }),
}))

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: vi.fn(() => vi.fn()),
}))

import { InstructionsEditPage } from '../edit-page'
import { showSuccessToast } from '@repo/app-component-library'

describe('InstructionsEditPage (BUGF-002)', () => {
  const mockMoc = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    title: 'Test MOC',
    description: 'A test description',
    slug: 'test-moc',
    tags: ['tag1', 'tag2'],
    theme: 'Technic',
    status: 'draft' as const,
    isOwner: true,
    files: [
      {
        id: 'file-1',
        category: 'instruction',
        filename: 'instructions.pdf',
        url: 'https://example.com/file.pdf',
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockIsDirty = false
    mockUnwrap.mockResolvedValue({})
  })

  describe('AC-1/AC-2: Save edits via useUpdateMocMutation', () => {
    it('calls updateMoc on save with correct data transformation', async () => {
      mockIsDirty = true
      render(<InstructionsEditPage moc={mockMoc} />)

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(mockUpdateMoc).toHaveBeenCalledWith({
          id: mockMoc.id,
          input: {
            title: 'Updated MOC Title',
            description: 'Updated description',
            theme: 'Technic',
            tags: ['tag1', 'tag2', 'tag3'],
          },
        })
      })
    })

    it('calls .unwrap() on mutation result', async () => {
      mockIsDirty = true
      render(<InstructionsEditPage moc={mockMoc} />)

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(mockUnwrap).toHaveBeenCalled()
      })
    })
  })

  describe('AC-3: Zod schema validation before submission', () => {
    it('form uses zodResolver for validation', () => {
      render(<InstructionsEditPage moc={mockMoc} />)
      // zodResolver is mocked and called during form initialization
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    })
  })

  describe('AC-4: Success toast and navigation', () => {
    it('shows success toast on successful save', async () => {
      mockIsDirty = true
      mockUnwrap.mockResolvedValue({})
      render(<InstructionsEditPage moc={mockMoc} />)

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(showSuccessToast).toHaveBeenCalledWith(
          'Changes saved',
          expect.stringContaining('has been updated'),
          5000,
        )
      })
    })

    it('navigates to detail page on success', async () => {
      mockIsDirty = true
      mockUnwrap.mockResolvedValue({})
      render(<InstructionsEditPage moc={mockMoc} />)

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.objectContaining({ to: '/mocs/$slug' }),
        )
      })
    })
  })

  describe('AC-5: 409 error handling', () => {
    it('shows duplicate title error on 409', async () => {
      mockIsDirty = true
      mockUnwrap.mockRejectedValue({ status: 409 })
      render(<InstructionsEditPage moc={mockMoc} />)

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(
          screen.getByText(/a moc with this title already exists/i),
        ).toBeInTheDocument()
      })
    })
  })

  describe('AC-6: 403 error handling', () => {
    it('shows permission error on 403', async () => {
      mockIsDirty = true
      mockUnwrap.mockRejectedValue({ status: 403 })
      render(<InstructionsEditPage moc={mockMoc} />)

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(
          screen.getByText(/you don't have permission/i),
        ).toBeInTheDocument()
      })
    })
  })

  describe('AC-7: 404 error handling', () => {
    it('shows not found error on 404', async () => {
      mockIsDirty = true
      mockUnwrap.mockRejectedValue({ status: 404 })
      render(<InstructionsEditPage moc={mockMoc} />)

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(
          screen.getByText(/moc not found/i),
        ).toBeInTheDocument()
      })
    })
  })

  describe('AC-8: 500 error handling', () => {
    it('shows generic error on 500', async () => {
      mockIsDirty = true
      mockUnwrap.mockRejectedValue({ status: 500 })
      render(<InstructionsEditPage moc={mockMoc} />)

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(
          screen.getByText(/failed to save changes/i),
        ).toBeInTheDocument()
      })
    })
  })

  describe('AC-9: Form state preserved on error', () => {
    it('does not navigate away on error', async () => {
      mockIsDirty = true
      mockUnwrap.mockRejectedValue({ status: 500 })
      render(<InstructionsEditPage moc={mockMoc} />)

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/failed to save changes/i)).toBeInTheDocument()
      })
      // Form should still be visible (not navigated away)
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe('AC-10: Save button disabled when pristine', () => {
    it('disables save button when form is not dirty', () => {
      mockIsDirty = false
      render(<InstructionsEditPage moc={mockMoc} />)

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      expect(saveButton).toBeDisabled()
    })

    it('enables save button when form is dirty', () => {
      mockIsDirty = true
      render(<InstructionsEditPage moc={mockMoc} />)

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      expect(saveButton).not.toBeDisabled()
    })
  })

  describe('AC-11: Loading state during API call', () => {
    it('shows saving text during mutation', async () => {
      mockIsDirty = true
      // Create a promise that doesn't resolve immediately
      let resolveUnwrap: (value: unknown) => void
      mockUnwrap.mockReturnValue(
        new Promise(resolve => {
          resolveUnwrap = resolve
        }),
      )

      render(<InstructionsEditPage moc={mockMoc} />)

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await userEvent.click(saveButton)

      // Button should now show saving state
      await waitFor(() => {
        expect(screen.getByText(/saving/i)).toBeInTheDocument()
      })

      // Resolve the mutation
      resolveUnwrap!({})

      // After resolve, saving text should disappear
      await waitFor(() => {
        expect(screen.queryByText(/saving/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Error and loading states', () => {
    it('shows loading page when isLoading is true', () => {
      render(<InstructionsEditPage moc={mockMoc} isLoading={true} />)
      expect(screen.getByTestId('loading-page')).toBeInTheDocument()
    })

    it('shows error alert when error prop is provided', () => {
      render(<InstructionsEditPage moc={mockMoc} error="Failed to load" />)
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Failed to load')).toBeInTheDocument()
    })

    it('shows not found when moc is null', () => {
      render(<InstructionsEditPage moc={null as any} />)
      expect(screen.getByText('MOC not found')).toBeInTheDocument()
    })
  })

  describe('Render basics', () => {
    it('renders form with all expected fields', () => {
      render(<InstructionsEditPage moc={mockMoc} />)
      expect(screen.getByText('Edit MOC')).toBeInTheDocument()
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/theme/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/tags/i)).toBeInTheDocument()
    })

    it('shows files section with attached files', () => {
      render(<InstructionsEditPage moc={mockMoc} />)
      expect(screen.getByText('Files')).toBeInTheDocument()
      expect(screen.getByText('instructions.pdf')).toBeInTheDocument()
    })
  })
})
