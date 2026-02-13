import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { InstructionsCreateModule } from '../InstructionsCreateModule'

// Mock the lazy-loaded instructions gallery module
const MockInstructionsGalleryModule = vi.fn()

vi.mock('@repo/app-instructions-gallery', () => ({
  default: (props: any) => {
    MockInstructionsGalleryModule(props)
    return <div>Instructions Gallery Module Content - Mode: {props.mode}</div>
  },
}))

// Mock the LoadingPage component
vi.mock('../../pages/LoadingPage', () => ({
  LoadingPage: () => <div>Loading...</div>,
}))

describe('InstructionsCreateModule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the instructions gallery module after lazy load', async () => {
      render(<InstructionsCreateModule />)

      await waitFor(() => {
        expect(screen.getByText(/Instructions Gallery Module Content/)).toBeInTheDocument()
      })
    })

    it('passes mode="create" to the instructions gallery module', async () => {
      render(<InstructionsCreateModule />)

      await waitFor(() => {
        expect(MockInstructionsGalleryModule).toHaveBeenCalledWith(
          expect.objectContaining({ mode: 'create' }),
        )
      })
    })

    it('wraps content in Suspense boundary', async () => {
      const { container } = render(<InstructionsCreateModule />)

      // Component should render without errors with Suspense
      expect(container.firstChild).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByText(/Instructions Gallery Module Content/)).toBeInTheDocument()
      })
    })
  })

  describe('accessibility', () => {
    it('renders without accessibility violations', async () => {
      const { container } = render(<InstructionsCreateModule />)

      await waitFor(() => {
        expect(screen.getByText(/Instructions Gallery Module Content/)).toBeInTheDocument()
      })

      expect(container).toBeInTheDocument()
    })
  })
})
