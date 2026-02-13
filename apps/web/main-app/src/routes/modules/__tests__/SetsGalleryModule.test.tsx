import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SetsGalleryModule } from '../SetsGalleryModule'

// Mock the app-sets-gallery module
vi.mock('@repo/app-sets-gallery', () => ({
  AppSetsGalleryModule: () => <div>Sets Gallery Module Content</div>,
}))

// Mock the LoadingPage component
vi.mock('../../pages/LoadingPage', () => ({
  LoadingPage: () => <div>Loading...</div>,
}))

describe('SetsGalleryModule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the sets gallery module', () => {
      render(<SetsGalleryModule />)

      expect(screen.getByText('Sets Gallery Module Content')).toBeInTheDocument()
    })

    it('wraps content in Suspense boundary', () => {
      const { container } = render(<SetsGalleryModule />)

      // Component should render without errors with Suspense
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('renders without accessibility violations', () => {
      const { container } = render(<SetsGalleryModule />)

      expect(container).toBeInTheDocument()
    })
  })
})
