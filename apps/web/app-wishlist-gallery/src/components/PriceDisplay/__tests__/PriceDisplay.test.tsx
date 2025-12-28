/**
 * PriceDisplay Component Tests
 *
 * Story wish-2003: Detail & Edit Pages
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PriceDisplay } from '../index'

describe('PriceDisplay', () => {
  it('renders formatted USD price', () => {
    render(<PriceDisplay price="849.99" currency="USD" />)
    expect(screen.getByTestId('price-display')).toHaveTextContent('$849.99')
  })

  it('renders formatted EUR price', () => {
    render(<PriceDisplay price="749.99" currency="EUR" />)
    expect(screen.getByTestId('price-display')).toHaveTextContent('749.99')
  })

  it('renders formatted GBP price', () => {
    render(<PriceDisplay price="599.99" currency="GBP" />)
    expect(screen.getByTestId('price-display')).toHaveTextContent('599.99')
  })

  it('renders nothing when price is null', () => {
    const { container } = render(<PriceDisplay price={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when price is undefined', () => {
    const { container } = render(<PriceDisplay price={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when price is invalid', () => {
    const { container } = render(<PriceDisplay price="not-a-number" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('applies size variants correctly', () => {
    const { rerender } = render(<PriceDisplay price="100" size="sm" />)
    expect(screen.getByTestId('price-display')).toHaveClass('text-sm')

    rerender(<PriceDisplay price="100" size="md" />)
    expect(screen.getByTestId('price-display')).toHaveClass('text-lg')

    rerender(<PriceDisplay price="100" size="lg" />)
    expect(screen.getByTestId('price-display')).toHaveClass('text-2xl')
  })

  it('applies custom className', () => {
    render(<PriceDisplay price="100" className="custom-class" />)
    expect(screen.getByTestId('price-display')).toHaveClass('custom-class')
  })

  it('formats whole numbers without decimals', () => {
    render(<PriceDisplay price="100" currency="USD" />)
    expect(screen.getByTestId('price-display')).toHaveTextContent('$100')
  })

  it('handles prices with one decimal place', () => {
    render(<PriceDisplay price="99.9" currency="USD" />)
    expect(screen.getByTestId('price-display')).toHaveTextContent('$99.9')
  })

  it('defaults to USD currency', () => {
    render(<PriceDisplay price="50" />)
    expect(screen.getByTestId('price-display')).toHaveTextContent('$50')
  })
})
