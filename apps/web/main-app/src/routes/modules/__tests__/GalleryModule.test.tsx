import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GalleryModule } from '../GalleryModule'

// Mock Redux for this component test
vi.mock('react-redux', () => ({
  useSelector: vi.fn(),
  useDispatch: () => vi.fn(),
  Provider: ({ children }: any) => children,
}))

describe.skip('GalleryModule', () => {
  it('renders the gallery module title and description', () => {
    render(<GalleryModule />)

    expect(screen.getByRole('heading', { level: 1, name: /gallery/i })).toBeInTheDocument()
    expect(screen.getByText(/browse and discover amazing lego moc designs/i)).toBeInTheDocument()
  })

  it('displays the gallery icon in the title', () => {
    render(<GalleryModule />)

    const title = screen.getByRole('heading', { level: 1, name: /gallery/i })
    expect(title).toBeInTheDocument()
    // The Images icon should be present in the title
    expect(title.querySelector('svg')).toBeInTheDocument()
  })

  it('shows the module loading placeholder', () => {
    render(<GalleryModule />)

    expect(screen.getByText(/gallery module loading/i)).toBeInTheDocument()
    expect(
      screen.getByText(/this will load the existing inspirationgallery page/i),
    ).toBeInTheDocument()
  })

  it('displays feature cards for gallery functionality', () => {
    render(<GalleryModule />)

    // Use text selectors since CardTitle renders as div with data-testid
    expect(screen.getByText(/advanced search/i)).toBeInTheDocument()
    expect(screen.getByText(/smart filtering/i)).toBeInTheDocument()
    expect(screen.getByText(/batch upload/i)).toBeInTheDocument()
  })

  it('has proper semantic structure', () => {
    render(<GalleryModule />)

    // Should have main heading
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()

    // Should have feature card titles (using text selectors)
    expect(screen.getByText(/advanced search/i)).toBeInTheDocument()
    expect(screen.getByText(/smart filtering/i)).toBeInTheDocument()
    expect(screen.getByText(/batch upload/i)).toBeInTheDocument()
  })

  it('displays the large gallery icon in the placeholder area', () => {
    render(<GalleryModule />)

    // The placeholder area should contain a large Images icon
    const placeholderArea = screen.getByText(/gallery module loading/i).closest('div')
    expect(placeholderArea).toBeInTheDocument()
    expect(placeholderArea?.querySelector('svg')).toBeInTheDocument()
  })
})
