import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InstructionsModule } from '../InstructionsModule'

// Mock Redux for this component test
vi.mock('react-redux', () => ({
  useSelector: vi.fn(),
  useDispatch: () => vi.fn(),
  Provider: ({ children }: any) => children,
}))

describe('InstructionsModule', () => {
  it('renders the instructions module title and description', () => {
    render(<InstructionsModule />)

    expect(screen.getByRole('heading', { level: 1, name: /moc instructions/i })).toBeInTheDocument()
    expect(screen.getByText(/step-by-step building guides for lego mocs/i)).toBeInTheDocument()
  })

  it('displays the book icon in the title', () => {
    render(<InstructionsModule />)

    const title = screen.getByRole('heading', { level: 1, name: /moc instructions/i })
    expect(title).toBeInTheDocument()
    // The BookOpen icon should be present in the title
    expect(title.querySelector('svg')).toBeInTheDocument()
  })

  it('shows the module loading placeholder', () => {
    render(<InstructionsModule />)

    expect(screen.getByText(/instructions module loading/i)).toBeInTheDocument()
    expect(
      screen.getByText(/this will load the existing moc instructions functionality/i),
    ).toBeInTheDocument()
  })

  it('displays feature cards for instructions functionality', () => {
    render(<InstructionsModule />)

    // Use text selectors since CardTitle renders as div with data-testid
    expect(screen.getByText(/pdf instructions/i)).toBeInTheDocument()
    expect(screen.getByText(/video guides/i)).toBeInTheDocument()
    expect(screen.getByText(/parts lists/i)).toBeInTheDocument()
  })

  it('has proper semantic structure', () => {
    render(<InstructionsModule />)

    // Should have main heading
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()

    // Should have feature card titles (using text selectors)
    expect(screen.getByText(/pdf instructions/i)).toBeInTheDocument()
    expect(screen.getByText(/video guides/i)).toBeInTheDocument()
    expect(screen.getByText(/parts lists/i)).toBeInTheDocument()
  })

  it('displays the large book icon in the placeholder area', () => {
    render(<InstructionsModule />)

    // The placeholder area should contain a large BookOpen icon
    const placeholderArea = screen.getByText(/instructions module loading/i).closest('div')
    expect(placeholderArea).toBeInTheDocument()
    expect(placeholderArea?.querySelector('svg')).toBeInTheDocument()
  })
})
