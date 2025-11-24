import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MocCard, MocCardCompact, DifficultyBadge } from '../components/moc-card'

describe('MocCard', () => {
  it('renders with title', () => {
    render(<MocCard title="Test MOC" />)
    expect(screen.getByText('Test MOC')).toBeInTheDocument()
  })

  it('renders with description', () => {
    render(<MocCard title="Test MOC" description="A test MOC description" />)
    expect(screen.getByText('A test MOC description')).toBeInTheDocument()
  })

  it('renders with image', () => {
    render(<MocCard title="Test MOC" imageUrl="/test.jpg" imageAlt="Test image" />)
    const image = screen.getByAltText('Test image')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', '/test.jpg')
  })

  it('renders with metadata', () => {
    const metadata = {
      pieces: 500,
      difficulty: 'Medium' as const,
      category: 'Castle',
      author: 'Test Author'
    }
    render(<MocCard title="Test MOC" metadata={metadata} />)
    
    expect(screen.getByText('500 pieces')).toBeInTheDocument()
    expect(screen.getByText('Castle')).toBeInTheDocument()
    expect(screen.getByText('by Test Author')).toBeInTheDocument()
  })

  it('calls onCardClick when clicked', () => {
    const handleClick = vi.fn()
    render(<MocCard title="Test MOC" onCardClick={handleClick} />)
    
    screen.getByText('Test MOC').closest('[data-slot="card"]')?.click()
    expect(handleClick).toHaveBeenCalledOnce()
  })
})

describe('MocCardCompact', () => {
  it('renders in compact layout', () => {
    render(<MocCardCompact title="Compact MOC" description="Compact description" />)
    expect(screen.getByText('Compact MOC')).toBeInTheDocument()
    expect(screen.getByText('Compact description')).toBeInTheDocument()
  })

  it('renders with image in compact layout', () => {
    render(<MocCardCompact title="Compact MOC" imageUrl="/compact.jpg" imageAlt="Compact image" />)
    const image = screen.getByAltText('Compact image')
    expect(image).toBeInTheDocument()
    expect(image).toHaveClass('w-16', 'h-16')
  })
})

describe('DifficultyBadge', () => {
  it('renders Easy badge with correct styling', () => {
    render(<DifficultyBadge difficulty="Easy" />)
    const badge = screen.getByText('Easy')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-success/90')
  })

  it('renders Medium badge with correct styling', () => {
    render(<DifficultyBadge difficulty="Medium" />)
    const badge = screen.getByText('Medium')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-warning/90')
  })

  it('renders Hard badge with correct styling', () => {
    render(<DifficultyBadge difficulty="Hard" />)
    const badge = screen.getByText('Hard')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-destructive/90')
  })

  it('renders Expert badge with correct styling', () => {
    render(<DifficultyBadge difficulty="Expert" />)
    const badge = screen.getByText('Expert')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-primary/90')
  })
})
