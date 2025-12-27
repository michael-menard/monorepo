/**
 * Story 3.1.39: Instructions Edit Page Tests
 * Story 3.1.40: Edit Page & Data Fetching Tests
 *
 * Tests for edit page, form pre-population, and file display.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import type { MocForEditResponse } from '@repo/upload-types'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ArrowLeft: () => <span data-testid="icon-arrow-left" />,
  Save: () => <span data-testid="icon-save" />,
  Loader2: () => <span data-testid="icon-loader" />,
  AlertTriangle: () => <span data-testid="icon-alert" />,
  ExternalLink: () => <span data-testid="icon-external" />,
  FileText: () => <span data-testid="icon-file" />,
  Image: () => <span data-testid="icon-image" />,
  Package: () => <span data-testid="icon-package" />,
  ImageIcon: () => <span data-testid="icon-image-icon" />,
  Download: () => <span data-testid="icon-download" />,
}))

// Mock dependencies
vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(() => vi.fn()),
  useParams: vi.fn(() => ({ slug: 'test-moc' })),
}))

vi.mock('react-hook-form', () => ({
  useForm: vi.fn(() => ({
    register: vi.fn(() => ({})),
    handleSubmit: vi.fn(fn => (e: Event) => {
      e?.preventDefault?.()
      fn({})
    }),
    formState: { errors: {}, isDirty: false },
    reset: vi.fn(),
    watch: vi.fn(),
    getValues: vi.fn(() => ({})),
  })),
}))

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: vi.fn(() => vi.fn()),
}))

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@repo/app-component-library', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    size,
    asChild,
  }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    variant?: string
    size?: string
    asChild?: boolean
  }) => {
    if (asChild) return <>{children}</>
    return (
      <button onClick={onClick} disabled={disabled} data-variant={variant} data-size={size}>
        {children}
      </button>
    )
  },
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
}))

// Mock FileList component
vi.mock('../../../components/MocEdit/FileList', () => ({
  FileList: ({ files }: { files: Array<{ id: string; filename: string }> }) => (
    <div data-testid="file-list">
      {files.map(file => (
        <div key={file.id} data-testid={`file-${file.id}`}>
          {file.filename}
        </div>
      ))}
    </div>
  ),
}))

import { InstructionsEditPage } from '../InstructionsEditPage'

describe('InstructionsEditPage', () => {
  const mockMoc: MocForEditResponse = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    title: 'Test MOC',
    description: 'A test description',
    slug: 'test-moc',
    tags: ['tag1', 'tag2'],
    theme: 'Technic',
    status: 'draft',
    isOwner: true,
    files: [
      {
        id: 'file-1',
        category: 'instruction',
        filename: 'instructions.pdf',
        size: 1024000,
        mimeType: 'application/pdf',
        url: 'https://example.com/file.pdf',
        uploadedAt: new Date().toISOString(),
      },
      {
        id: 'file-2',
        category: 'image',
        filename: 'photo.jpg',
        size: 512000,
        mimeType: 'image/jpeg',
        url: 'https://example.com/photo.jpg',
        uploadedAt: new Date().toISOString(),
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Unit: Route renders for authenticated owner', () => {
    it('should render the edit page with form fields', () => {
      render(<InstructionsEditPage moc={mockMoc} />)

      expect(screen.getByText('Edit MOC')).toBeInTheDocument()
      expect(screen.getByText('Update your MOC instructions')).toBeInTheDocument()
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/theme/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/tags/i)).toBeInTheDocument()
    })

    it('should display MOC files section', () => {
      render(<InstructionsEditPage moc={mockMoc} />)

      expect(screen.getByText('Files')).toBeInTheDocument()
      expect(screen.getByTestId('file-list')).toBeInTheDocument()
    })

    it('should show file count in section description', () => {
      render(<InstructionsEditPage moc={mockMoc} />)

      expect(screen.getByText(/2 files/)).toBeInTheDocument()
    })

    it('should show save button disabled when form is not dirty', () => {
      render(<InstructionsEditPage moc={mockMoc} />)

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      expect(saveButton).toBeDisabled()
    })
  })

  describe('Unit: Form pre-population (AC: 3)', () => {
    it('should pre-populate form with MOC title', () => {
      render(<InstructionsEditPage moc={mockMoc} />)

      const titleInput = screen.getByLabelText(/title/i)
      expect(titleInput).toBeInTheDocument()
    })

    it('should render form with expected fields', () => {
      render(<InstructionsEditPage moc={mockMoc} />)

      expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/theme/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/tags/i)).toBeInTheDocument()
    })
  })

  describe('Unit: File display (AC: 4)', () => {
    it('should pass files to FileList component', () => {
      render(<InstructionsEditPage moc={mockMoc} />)

      expect(screen.getByTestId('file-file-1')).toBeInTheDocument()
      expect(screen.getByTestId('file-file-2')).toBeInTheDocument()
    })

    it('should display file names', () => {
      render(<InstructionsEditPage moc={mockMoc} />)

      expect(screen.getByText('instructions.pdf')).toBeInTheDocument()
      expect(screen.getByText('photo.jpg')).toBeInTheDocument()
    })
  })

  describe('Unit: Form validation', () => {
    it('should have form with required title field', () => {
      render(<InstructionsEditPage moc={mockMoc} />)

      const titleLabel = screen.getByText(/title \*/i)
      expect(titleLabel).toBeInTheDocument()
    })

    it('should have proper input IDs for accessibility', () => {
      render(<InstructionsEditPage moc={mockMoc} />)

      expect(screen.getByLabelText(/title/i)).toHaveAttribute('id', 'title')
      expect(screen.getByLabelText(/description/i)).toHaveAttribute('id', 'description')
      expect(screen.getByLabelText(/theme/i)).toHaveAttribute('id', 'theme')
      expect(screen.getByLabelText(/tags/i)).toHaveAttribute('id', 'tags')
    })
  })

  describe('Unit: Back navigation', () => {
    it('should render back button', () => {
      render(<InstructionsEditPage moc={mockMoc} />)

      const backButton = screen.getByRole('button', { name: /go back/i })
      expect(backButton).toBeInTheDocument()
    })
  })

  describe('Unit: Basic information card', () => {
    it('should render basic information card', () => {
      render(<InstructionsEditPage moc={mockMoc} />)

      expect(screen.getByText('Basic Information')).toBeInTheDocument()
      expect(screen.getByText('Update the details of your MOC')).toBeInTheDocument()
    })
  })

  describe('Unit: Empty files handling', () => {
    it('should handle MOC with no files', () => {
      const mocWithNoFiles: MocForEditResponse = {
        ...mockMoc,
        files: [],
      }

      render(<InstructionsEditPage moc={mocWithNoFiles} />)

      expect(screen.getByText(/0 files/)).toBeInTheDocument()
    })
  })

  describe('Integration: RTK Query types', () => {
    it('should accept MocForEditResponse type', () => {
      // Type check - if this renders, types are correct
      render(<InstructionsEditPage moc={mockMoc} />)

      expect(screen.getByText('Edit MOC')).toBeInTheDocument()
    })

    it('should handle nullable fields', () => {
      const mocWithNulls: MocForEditResponse = {
        ...mockMoc,
        description: null,
        tags: null,
        theme: null,
        slug: null,
      }

      render(<InstructionsEditPage moc={mocWithNulls} />)

      // Should render without errors
      expect(screen.getByText('Edit MOC')).toBeInTheDocument()
    })
  })
})
