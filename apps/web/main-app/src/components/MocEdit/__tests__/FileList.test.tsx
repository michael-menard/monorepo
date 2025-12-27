/**
 * Story 3.1.40: FileList Tests
 *
 * Tests for the file list component that displays MOC files.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import type { MocFileItem } from '@repo/upload-types'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ExternalLink: () => <span data-testid="icon-external-link" />,
  FileText: () => <span data-testid="icon-file-text" />,
  Image: () => <span data-testid="icon-image" />,
  Package: () => <span data-testid="icon-package" />,
  ImageIcon: () => <span data-testid="icon-image-icon" />,
  Download: () => <span data-testid="icon-download" />,
}))

// Mock @repo/app-component-library Button component
vi.mock('@repo/app-component-library', () => ({
  Button: ({
    children,
    asChild,
    ...props
  }: {
    children: React.ReactNode
    asChild?: boolean
    variant?: string
    size?: string
    className?: string
  }) => {
    if (asChild) {
      return <>{children}</>
    }
    return <button {...props}>{children}</button>
  },
}))

import { FileList } from '../FileList'

describe('FileList', () => {
  const mockFiles: MocFileItem[] = [
    {
      id: 'file-1',
      category: 'instruction',
      filename: 'instructions.pdf',
      size: 1024000,
      mimeType: 'application/pdf',
      url: 'https://example.com/instructions.pdf',
      uploadedAt: new Date().toISOString(),
    },
    {
      id: 'file-2',
      category: 'parts-list',
      filename: 'parts.xlsx',
      size: 512000,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      url: 'https://example.com/parts.xlsx',
      uploadedAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    },
    {
      id: 'file-3',
      category: 'image',
      filename: 'photo1.jpg',
      size: 2048000,
      mimeType: 'image/jpeg',
      url: 'https://example.com/photo1.jpg',
      uploadedAt: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
    },
    {
      id: 'file-4',
      category: 'thumbnail',
      filename: 'thumb.png',
      size: 256000,
      mimeType: 'image/png',
      url: 'https://example.com/thumb.png',
      uploadedAt: new Date(Date.now() - 86400000 * 10).toISOString(), // 10 days ago
    },
  ]

  describe('Unit: Empty state', () => {
    it('should show empty message when no files', () => {
      render(<FileList files={[]} />)

      expect(screen.getByTestId('file-list-empty')).toBeInTheDocument()
      expect(screen.getByText('No files attached to this MOC')).toBeInTheDocument()
    })
  })

  describe('Unit: File display', () => {
    it('should render file list container', () => {
      render(<FileList files={mockFiles} />)

      expect(screen.getByTestId('file-list')).toBeInTheDocument()
    })

    it('should display all file items', () => {
      render(<FileList files={mockFiles} />)

      expect(screen.getByTestId('file-item-file-1')).toBeInTheDocument()
      expect(screen.getByTestId('file-item-file-2')).toBeInTheDocument()
      expect(screen.getByTestId('file-item-file-3')).toBeInTheDocument()
      expect(screen.getByTestId('file-item-file-4')).toBeInTheDocument()
    })

    it('should display file names', () => {
      render(<FileList files={mockFiles} />)

      expect(screen.getByText('instructions.pdf')).toBeInTheDocument()
      expect(screen.getByText('parts.xlsx')).toBeInTheDocument()
      expect(screen.getByText('photo1.jpg')).toBeInTheDocument()
      expect(screen.getByText('thumb.png')).toBeInTheDocument()
    })

    it('should display formatted file sizes', () => {
      render(<FileList files={mockFiles} />)

      // 1024000 bytes = 1000 KB = 1 MB
      expect(screen.getByText(/1000\s*KB|1\s*MB/)).toBeInTheDocument()
    })
  })

  describe('Unit: File grouping by category', () => {
    it('should group files by category', () => {
      render(<FileList files={mockFiles} />)

      expect(screen.getByTestId('file-category-instruction')).toBeInTheDocument()
      expect(screen.getByTestId('file-category-parts-list')).toBeInTheDocument()
      expect(screen.getByTestId('file-category-image')).toBeInTheDocument()
      expect(screen.getByTestId('file-category-thumbnail')).toBeInTheDocument()
    })

    it('should display category labels', () => {
      render(<FileList files={mockFiles} />)

      expect(screen.getByText('Instructions')).toBeInTheDocument()
      expect(screen.getByText('Parts Lists')).toBeInTheDocument()
      expect(screen.getByText('Images')).toBeInTheDocument()
      expect(screen.getByText('Thumbnail')).toBeInTheDocument()
    })

    it('should not render empty categories', () => {
      const filesWithoutPartsList = mockFiles.filter(f => f.category !== 'parts-list')
      render(<FileList files={filesWithoutPartsList} />)

      expect(screen.queryByTestId('file-category-parts-list')).not.toBeInTheDocument()
    })
  })

  describe('Unit: Download/preview links', () => {
    it('should render download buttons for all files', () => {
      render(<FileList files={mockFiles} />)

      const downloadIcons = screen.getAllByTestId('icon-download')
      expect(downloadIcons.length).toBe(mockFiles.length)
    })

    it('should render preview links for images and PDFs', () => {
      render(<FileList files={mockFiles} />)

      const externalLinks = screen.getAllByTestId('icon-external-link')
      // PDF and 2 images (image + thumbnail) should have preview
      expect(externalLinks.length).toBe(3)
    })

    it('should have correct preview href attributes', () => {
      render(<FileList files={mockFiles} />)

      const previewLinks = screen.getAllByRole('link')
      const instructionPreview = previewLinks.find(link =>
        link.getAttribute('aria-label') === 'Preview instructions.pdf'
      )
      expect(instructionPreview).toHaveAttribute('href', 'https://example.com/instructions.pdf')
    })

    it('should render download buttons with correct aria-labels', () => {
      render(<FileList files={mockFiles} />)

      // Download is now a button instead of a link for presigned URL handling
      expect(screen.getByRole('button', { name: 'Download instructions.pdf' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Download parts.xlsx' })).toBeInTheDocument()
    })
  })

  describe('Unit: Date formatting', () => {
    it('should show "Today" for files uploaded today', () => {
      const todayFile: MocFileItem[] = [{
        id: 'today-file',
        category: 'instruction',
        filename: 'today.pdf',
        size: 1024,
        mimeType: 'application/pdf',
        url: 'https://example.com/today.pdf',
        uploadedAt: new Date().toISOString(),
      }]

      render(<FileList files={todayFile} />)
      expect(screen.getByText('Today')).toBeInTheDocument()
    })

    it('should show "Yesterday" for files uploaded yesterday', () => {
      const yesterdayFile: MocFileItem[] = [{
        id: 'yesterday-file',
        category: 'instruction',
        filename: 'yesterday.pdf',
        size: 1024,
        mimeType: 'application/pdf',
        url: 'https://example.com/yesterday.pdf',
        uploadedAt: new Date(Date.now() - 86400000).toISOString(),
      }]

      render(<FileList files={yesterdayFile} />)
      expect(screen.getByText('Yesterday')).toBeInTheDocument()
    })
  })

  describe('Unit: Accessibility', () => {
    it('should have accessible download button labels', () => {
      render(<FileList files={mockFiles} />)

      // Download buttons have aria-label for accessibility
      expect(screen.getByRole('button', { name: 'Download instructions.pdf' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Download parts.xlsx' })).toBeInTheDocument()
    })

    it('should have accessible preview link labels', () => {
      render(<FileList files={mockFiles} />)

      expect(screen.getByLabelText('Preview instructions.pdf')).toBeInTheDocument()
      expect(screen.getByLabelText('Preview photo1.jpg')).toBeInTheDocument()
    })
  })
})
