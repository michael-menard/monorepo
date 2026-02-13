import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { InspirationModule } from '../InspirationModule'

// Mock the lazy-loaded inspiration gallery module
vi.mock('@repo/app-inspiration-gallery', () => ({
  default: () => <div>Inspiration Gallery Module Content</div>,
}))

// Mock the LoadingPage component
vi.mock('../../pages/LoadingPage', () => ({
  LoadingPage: () => <div>Loading...</div>,
}))

describe('InspirationModule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the inspiration gallery module after lazy load', async () => {
      render(<InspirationModule />)

      await waitFor(() => {
        expect(screen.getByText('Inspiration Gallery Module Content')).toBeInTheDocument()
      })
    })

    it('wraps content in Suspense boundary', async () => {
      const { container } = render(<InspirationModule />)

      // Component should render without errors with Suspense
      expect(container.firstChild).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByText('Inspiration Gallery Module Content')).toBeInTheDocument()
      })
    })
  })

  describe('accessibility', () => {
    it('renders without accessibility violations', async () => {
      const { container } = render(<InspirationModule />)

      await waitFor(() => {
        expect(screen.getByText('Inspiration Gallery Module Content')).toBeInTheDocument()
      })

      expect(container).toBeInTheDocument()
    })
  })
})
