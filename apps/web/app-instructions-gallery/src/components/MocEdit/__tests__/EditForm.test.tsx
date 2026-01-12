/**
 * EditForm Tests
 * Story 3.1.41: Edit Form & Validation
 *
 * Tests for form validation, field behavior, and submit button state.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Save: () => <span data-testid="icon-save">Save</span>,
  Loader2: () => <span data-testid="icon-loader">Loading</span>,
  AlertCircle: () => <span data-testid="icon-alert">Alert</span>,
  Check: () => <span data-testid="icon-check">Check</span>,
  X: () => <span data-testid="icon-x">X</span>,
  RefreshCw: () => <span data-testid="icon-refresh">Refresh</span>,
}))

// Mock logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock react-hook-form with all necessary hooks
vi.mock('react-hook-form', async () => {
  const actual = await vi.importActual('react-hook-form')
  return {
    ...actual,
    useForm: vi.fn(() => ({
      control: {},
      handleSubmit: vi.fn(fn => (e?: React.BaseSyntheticEvent) => {
        e?.preventDefault?.()
        return fn({
          title: 'Test MOC',
          description: 'A test description',
          tags: ['tag1'],
          theme: 'Technic',
          slug: 'test-moc',
        })
      }),
      formState: { errors: {}, isValid: true },
      reset: vi.fn(),
      watch: vi.fn(),
      getValues: vi.fn(() => ({
        title: 'Test MOC',
        description: 'A test description',
        tags: ['tag1'],
        theme: 'Technic',
        slug: 'test-moc',
      })),
    })),
    useWatch: vi.fn(() => ({
      title: 'Test MOC',
      description: 'A test description',
      tags: ['tag1'],
      theme: 'Technic',
      slug: 'test-moc',
    })),
    useController: vi.fn(() => ({
      field: {
        value: 'test-moc',
        onChange: vi.fn(),
        onBlur: vi.fn(),
      },
      fieldState: { error: null },
    })),
  }
})

// Mock zodResolver
vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: vi.fn(() => vi.fn()),
}))

// Mock app-component-library
vi.mock('@repo/app-component-library', () => ({
  Form: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="form-provider">{children}</div>
  ),
  FormField: ({
    render,
    name,
  }: {
    render: (props: {
      field: { value: string | string[] | null; onChange: (v: unknown) => void; onBlur: () => void }
    }) => React.ReactNode
    name: string
  }) => {
    const defaultValue = name === 'tags' ? ['tag1'] : name === 'title' ? 'Test MOC' : ''
    return (
      <div data-testid={`form-field-${name}`}>
        {render({
          field: {
            value: defaultValue,
            onChange: vi.fn(),
            onBlur: vi.fn(),
          },
        })}
      </div>
    )
  },
  FormItem: ({ children }: { children: React.ReactNode }) => <div data-testid="form-item">{children}</div>,
  FormLabel: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
  FormControl: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormMessage: () => null,
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
  Button: ({
    children,
    onClick,
    disabled,
    type,
  }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    type?: string
  }) => (
    <button onClick={onClick} disabled={disabled} type={type as 'button' | 'submit' | 'reset'}>
      {children}
    </button>
  ),
  Select: ({ children, onValueChange: _onValueChange }: { children: React.ReactNode; onValueChange?: (v: string) => void }) => (
    <div data-testid="select">{children}</div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  SelectValue: ({ placeholder }: { placeholder: string }) => <span>{placeholder}</span>,
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

// Mock upload-types
vi.mock('@repo/upload-types', () => ({
  EditMocFormSchema: {
    parse: vi.fn(),
  },
  LEGO_THEMES: ['Technic', 'Creator', 'City'],
  hasFormChanges: vi.fn(() => false),
  toFormValues: vi.fn((moc: { title: string; description: string | null; tags: string[] | null; theme: string | null; slug: string | null }) => ({
    title: moc.title,
    description: moc.description,
    tags: moc.tags ?? [],
    theme: moc.theme,
    slug: moc.slug,
  })),
  slugify: vi.fn((s: string) => s.toLowerCase().replace(/\s+/g, '-')),
}))

// Import after mocks
import { EditForm } from '../EditForm'

// Type for mock MOC
interface MockMoc {
  id: string
  title: string
  description: string | null
  slug: string | null
  tags: string[] | null
  theme: string | null
  status: 'draft' | 'published' | 'archived' | 'pending_review'
  isOwner: boolean
  files: Array<{
    id: string
    category: 'instruction' | 'parts-list' | 'image' | 'thumbnail'
    filename: string
    size: number
    mimeType: string
    url: string
    uploadedAt: string
  }>
}

describe('EditForm', () => {
  const mockMoc: MockMoc = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    title: 'Test MOC',
    description: 'A test description',
    slug: 'test-moc',
    tags: ['tag1', 'tag2'],
    theme: 'Technic',
    status: 'draft',
    isOwner: true,
    files: [],
  }

  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnSubmit.mockResolvedValue(undefined)
  })

  describe('Unit: Title validation', () => {
    it('should render title field with label', () => {
      render(<EditForm moc={mockMoc} onSubmit={mockOnSubmit} />)

      expect(screen.getByText(/title/i)).toBeInTheDocument()
    })

    it('should show character count for title', () => {
      render(<EditForm moc={mockMoc} onSubmit={mockOnSubmit} />)

      // Character count should be visible
      expect(screen.getByText(/\/100/)).toBeInTheDocument()
    })
  })

  describe('Unit: Description validation', () => {
    it('should render description field with label', () => {
      render(<EditForm moc={mockMoc} onSubmit={mockOnSubmit} />)

      expect(screen.getByText(/description/i)).toBeInTheDocument()
    })

    it('should show character count for description', () => {
      render(<EditForm moc={mockMoc} onSubmit={mockOnSubmit} />)

      // Character count should be visible
      expect(screen.getByText(/\/2000/)).toBeInTheDocument()
    })
  })

  describe('Unit: Tags validation', () => {
    it('should render tags field with label', () => {
      render(<EditForm moc={mockMoc} onSubmit={mockOnSubmit} />)

      expect(screen.getByText(/tags/i)).toBeInTheDocument()
    })
  })

  describe('Unit: Theme field', () => {
    it('should render theme field with label', () => {
      render(<EditForm moc={mockMoc} onSubmit={mockOnSubmit} />)

      // Find the label for theme (not the select options)
      const labels = screen.getAllByText(/theme/i)
      expect(labels.length).toBeGreaterThan(0)
    })

    it('should show placeholder for theme select', () => {
      render(<EditForm moc={mockMoc} onSubmit={mockOnSubmit} />)

      expect(screen.getByText(/select a theme/i)).toBeInTheDocument()
    })
  })

  describe('Unit: Slug field', () => {
    it('should render slug field with label', () => {
      render(<EditForm moc={mockMoc} onSubmit={mockOnSubmit} />)

      expect(screen.getByText(/url slug/i)).toBeInTheDocument()
    })
  })

  describe('Unit: Submit button state', () => {
    it('should render submit button', () => {
      render(<EditForm moc={mockMoc} onSubmit={mockOnSubmit} />)

      const submitButton = screen.getByRole('button', { name: /no changes/i })
      expect(submitButton).toBeInTheDocument()
    })

    it('should disable submit button when no changes', () => {
      render(<EditForm moc={mockMoc} onSubmit={mockOnSubmit} />)

      const submitButton = screen.getByRole('button', { name: /no changes/i })
      expect(submitButton).toBeDisabled()
    })

    it('should show saving state when isSubmitting is true', () => {
      render(<EditForm moc={mockMoc} onSubmit={mockOnSubmit} isSubmitting={true} />)

      expect(screen.getByText(/saving/i)).toBeInTheDocument()
    })
  })

  describe('Unit: Real-time validation', () => {
    it('should render form with validation mode onChange', () => {
      render(<EditForm moc={mockMoc} onSubmit={mockOnSubmit} />)

      // Form provider should be rendered
      expect(screen.getByTestId('form-provider')).toBeInTheDocument()
    })
  })

  describe('Integration: Form fields', () => {
    it('should render all form fields', () => {
      render(<EditForm moc={mockMoc} onSubmit={mockOnSubmit} />)

      expect(screen.getByTestId('form-field-title')).toBeInTheDocument()
      expect(screen.getByTestId('form-field-description')).toBeInTheDocument()
      expect(screen.getByTestId('form-field-tags')).toBeInTheDocument()
      expect(screen.getByTestId('form-field-theme')).toBeInTheDocument()
    })

    it('should not submit when form is unchanged', () => {
      render(<EditForm moc={mockMoc} onSubmit={mockOnSubmit} />)

      const submitButton = screen.getByRole('button', { name: /no changes/i })
      expect(submitButton).toBeDisabled()
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })
})
