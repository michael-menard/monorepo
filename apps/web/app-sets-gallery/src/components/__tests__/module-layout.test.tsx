import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ModuleLayout } from '../module-layout'

describe('ModuleLayout', () => {
  it('renders children within layout wrapper', () => {
    render(
      <ModuleLayout>
        <div data-testid="child-content">Test Content</div>
      </ModuleLayout>,
    )

    expect(screen.getByTestId('child-content')).toBeInTheDocument()
    expect(screen.getByTestId('child-content')).toHaveTextContent('Test Content')
  })

  it('applies min-h-full class by default', () => {
    const { container } = render(
      <ModuleLayout>
        <div>Content</div>
      </ModuleLayout>,
    )

    const layoutDiv = container.firstChild as HTMLElement
    expect(layoutDiv).toHaveClass('min-h-full')
  })

  it('applies custom className when provided', () => {
    const { container } = render(
      <ModuleLayout className="custom-class">
        <div>Content</div>
      </ModuleLayout>,
    )

    const layoutDiv = container.firstChild as HTMLElement
    expect(layoutDiv).toHaveClass('min-h-full')
    expect(layoutDiv).toHaveClass('custom-class')
  })

  it('renders as a div element', () => {
    const { container } = render(
      <ModuleLayout>
        <div>Content</div>
      </ModuleLayout>,
    )

    expect(container.firstChild?.nodeName).toBe('DIV')
  })

  it('merges multiple custom classes correctly', () => {
    const { container } = render(
      <ModuleLayout className="bg-gray-100 p-4">
        <div>Content</div>
      </ModuleLayout>,
    )

    const layoutDiv = container.firstChild as HTMLElement
    expect(layoutDiv).toHaveClass('min-h-full')
    expect(layoutDiv).toHaveClass('bg-gray-100')
    expect(layoutDiv).toHaveClass('p-4')
  })
})
