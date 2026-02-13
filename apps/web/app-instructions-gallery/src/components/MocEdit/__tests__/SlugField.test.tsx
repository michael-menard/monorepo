/**
 * Tests for SlugField component (Phase 3)
 *
 * Tests slug input with:
 * - Pattern validation (lowercase, numbers, hyphens)
 * - Debounced uniqueness check API
 * - Auto-generation from title
 * - Availability indicators
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Check: () => <span data-testid="icon-check">Check</span>,
  X: () => <span data-testid="icon-x">X</span>,
  Loader2: () => <span data-testid="icon-loader">Loader</span>,
  RefreshCw: () => <span data-testid="icon-refresh">Refresh</span>,
}))

// Mock @repo/app-component-library - provide simple implementations
// that don't require FormFieldContext
vi.mock('@repo/app-component-library', () => ({
  FormItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormLabel: ({ children, ...props }: { children: React.ReactNode }) => (
    <label {...props}>{children}</label>
  ),
  FormControl: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  FormMessage: () => null,
  Input: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    (props, ref) => <input ref={ref} {...props} />,
  ),
}))

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { useForm, FormProvider } from 'react-hook-form'
import { logger } from '@repo/logger'
import { SlugField } from '../SlugField'
import type { EditMocFormInput } from '@repo/upload/types'

// Test wrapper with react-hook-form
function SlugFieldWrapper({
  currentSlug = null,
  mocId = 'moc-123',
  title = 'Test MOC',
}: {
  currentSlug?: string | null
  mocId?: string
  title?: string
}) {
  const methods = useForm<EditMocFormInput>({
    defaultValues: {
      slug: currentSlug || '',
    },
  })

  return (
    <FormProvider {...methods}>
      <SlugField control={methods.control} currentSlug={currentSlug} mocId={mocId} title={title} />
    </FormProvider>
  )
}

describe('SlugField', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  describe('Rendering', () => {
    it('should render input with placeholder', () => {
      render(<SlugFieldWrapper />)

      expect(screen.getByPlaceholderText('my-awesome-moc')).toBeInTheDocument()
    })

    it('should initialize with current slug value', () => {
      render(<SlugFieldWrapper currentSlug="existing-slug" />)

      const input = screen.getByPlaceholderText('my-awesome-moc') as HTMLInputElement
      expect(input.value).toBe('existing-slug')
    })

    it('should render refresh button for generating from title', () => {
      render(<SlugFieldWrapper />)

      const refreshButton = screen.getByLabelText('Generate slug from title')
      expect(refreshButton).toBeInTheDocument()
      expect(refreshButton).toHaveAttribute('title', 'Generate from title')
    })
  })

  describe('Input Handling', () => {
    it('should allow manual slug input', async () => {
      render(<SlugFieldWrapper />)

      const input = screen.getByPlaceholderText('my-awesome-moc')

      // Use fireEvent for fake timers compatibility
      await act(async () => {
        vi.useRealTimers()
        const user = userEvent.setup()
        await user.type(input, 'custom-slug')
        vi.useFakeTimers()
      })

      expect(input).toHaveValue('custom-slug')
    })

    it('should convert input to lowercase', async () => {
      render(<SlugFieldWrapper />)

      const input = screen.getByPlaceholderText('my-awesome-moc')

      await act(async () => {
        vi.useRealTimers()
        const user = userEvent.setup()
        await user.type(input, 'MySlug')
        vi.useFakeTimers()
      })

      expect(input).toHaveValue('myslug')
    })
  })

  describe('Slug Generation from Title', () => {
    it('should generate slug from title when refresh button clicked', async () => {
      render(<SlugFieldWrapper title="My Awesome MOC" />)

      const refreshButton = screen.getByLabelText('Generate slug from title')

      await act(async () => {
        vi.useRealTimers()
        const user = userEvent.setup()
        await user.click(refreshButton)
        vi.useFakeTimers()
      })

      const input = screen.getByPlaceholderText('my-awesome-moc')
      expect(input).toHaveValue('my-awesome-moc')
    })

    it('should disable refresh button when title is empty', () => {
      render(<SlugFieldWrapper title="" />)

      const refreshButton = screen.getByLabelText('Generate slug from title')
      expect(refreshButton).toBeDisabled()
    })

    it('should enable refresh button when title is provided', () => {
      render(<SlugFieldWrapper title="Test Title" />)

      const refreshButton = screen.getByLabelText('Generate slug from title')
      expect(refreshButton).not.toBeDisabled()
    })
  })

  describe('Availability Check', () => {
    // These tests use REAL timers since they involve MSW API calls.
    // MSW's internal handlers conflict with fake timers.
    beforeEach(() => {
      vi.useRealTimers()
    })

    afterEach(() => {
      vi.useFakeTimers()
    })

    it('should show available state with green check', async () => {
      server.use(
        http.get('/api/v2/mocs/check-slug', () => {
          return HttpResponse.json({ available: true })
        }),
      )

      const user = userEvent.setup()
      render(<SlugFieldWrapper />)

      const input = screen.getByPlaceholderText('my-awesome-moc')
      await user.type(input, 'available-slug')

      await waitFor(
        () => {
          const statusIcon = screen.getByTitle('Slug is available')
          expect(statusIcon).toBeInTheDocument()
        },
        { timeout: 2000 },
      )
    })

    it('should show unavailable state with red X', async () => {
      server.use(
        http.get('/api/v2/mocs/check-slug', () => {
          return HttpResponse.json({ available: false })
        }),
      )

      const user = userEvent.setup()
      render(<SlugFieldWrapper />)

      const input = screen.getByPlaceholderText('my-awesome-moc')
      await user.type(input, 'taken-slug')

      await waitFor(
        () => {
          const statusIcon = screen.getByTitle('Slug is already in use')
          expect(statusIcon).toBeInTheDocument()
        },
        { timeout: 2000 },
      )
    })

    it('should show error state with amber X', async () => {
      server.use(
        http.get('/api/v2/mocs/check-slug', () => {
          return HttpResponse.json({ error: 'Server error' }, { status: 500 })
        }),
      )

      const user = userEvent.setup()
      render(<SlugFieldWrapper />)

      const input = screen.getByPlaceholderText('my-awesome-moc')
      await user.type(input, 'error-slug')

      await waitFor(
        () => {
          const statusIcon = screen.getByTitle('Could not check availability')
          expect(statusIcon).toBeInTheDocument()
          expect(logger.error).toHaveBeenCalledWith(
            'Failed to check slug availability',
            expect.any(Object),
          )
        },
        { timeout: 2000 },
      )
    })

    it('should call check-slug API with correct parameters', async () => {
      let capturedUrl = ''

      server.use(
        http.get('/api/v2/mocs/check-slug', ({ request }) => {
          capturedUrl = request.url
          return HttpResponse.json({ available: true })
        }),
      )

      const user = userEvent.setup()
      render(<SlugFieldWrapper mocId="moc-456" />)

      const input = screen.getByPlaceholderText('my-awesome-moc')
      await user.type(input, 'my-slug')

      await waitFor(
        () => {
          expect(capturedUrl).toContain('slug=my-slug')
          expect(capturedUrl).toContain('excludeId=moc-456')
        },
        { timeout: 2000 },
      )
    })

    it('should not check availability if slug matches currentSlug', async () => {
      const checkSlugMock = vi.fn(() => HttpResponse.json({ available: true }))

      server.use(http.get('/api/v2/mocs/check-slug', checkSlugMock))

      render(<SlugFieldWrapper currentSlug="existing-slug" />)

      // Wait a bit to ensure no API call happens
      await new Promise(resolve => setTimeout(resolve, 700))

      expect(checkSlugMock).not.toHaveBeenCalled()
    })

    it('should not check availability if slug is empty', async () => {
      const checkSlugMock = vi.fn(() => HttpResponse.json({ available: true }))

      server.use(http.get('/api/v2/mocs/check-slug', checkSlugMock))

      render(<SlugFieldWrapper />)

      // Wait a bit to ensure no API call happens
      await new Promise(resolve => setTimeout(resolve, 700))

      expect(checkSlugMock).not.toHaveBeenCalled()
    })
  })

  describe('Unavailable State', () => {
    // These tests use REAL timers since they involve MSW API calls
    beforeEach(() => {
      vi.useRealTimers()
    })

    afterEach(() => {
      vi.useFakeTimers()
    })

    it('should show "already in use" error when unavailable', async () => {
      server.use(
        http.get('/api/v2/mocs/check-slug', () => {
          return HttpResponse.json({ available: false })
        }),
      )

      const user = userEvent.setup()
      render(<SlugFieldWrapper />)

      const input = screen.getByPlaceholderText('my-awesome-moc')
      await user.type(input, 'duplicate-slug')

      await waitFor(
        () => {
          expect(screen.getByText(/This slug is already used/i)).toBeInTheDocument()
        },
        { timeout: 2000 },
      )
    })

    it('should have aria-invalid when unavailable', async () => {
      server.use(
        http.get('/api/v2/mocs/check-slug', () => {
          return HttpResponse.json({ available: false })
        }),
      )

      const user = userEvent.setup()
      render(<SlugFieldWrapper />)

      const input = screen.getByPlaceholderText('my-awesome-moc')
      await user.type(input, 'unavailable')

      await waitFor(
        () => {
          expect(input).toHaveAttribute('aria-invalid', 'true')
        },
        { timeout: 2000 },
      )
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels on input and button', () => {
      render(<SlugFieldWrapper />)

      const input = screen.getByPlaceholderText('my-awesome-moc')
      expect(input).toBeInTheDocument()

      const button = screen.getByLabelText('Generate slug from title')
      expect(button).toBeInTheDocument()
    })

    it('should have role="status" on availability indicators', async () => {
      // Use real timers since this test involves MSW API calls
      vi.useRealTimers()

      server.use(
        http.get('/api/v2/mocs/check-slug', () => {
          return HttpResponse.json({ available: true })
        }),
      )

      const user = userEvent.setup()
      render(<SlugFieldWrapper />)

      const input = screen.getByPlaceholderText('my-awesome-moc')
      await user.type(input, 'test-slug')

      await waitFor(
        () => {
          const statusElements = screen.getAllByRole('status')
          expect(statusElements.length).toBeGreaterThan(0)
        },
        { timeout: 2000 },
      )

      vi.useFakeTimers()
    })
  })
})
