import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PasswordStrengthIndicator } from '../index'
import { getPasswordStrength } from '../utils/getPasswordStrength'

describe('getPasswordStrength', () => {
  it('returns Weak for empty password', () => {
    const result = getPasswordStrength('')
    expect(result.score).toBe(0)
    expect(result.label).toBe('Weak')
    expect(result.color).toBe('red')
  })

  it('returns Weak for short password', () => {
    const result = getPasswordStrength('abc')
    expect(result.score).toBe(0)
    expect(result.label).toBe('Weak')
  })

  it('returns Fair for password >= 8 chars', () => {
    const result = getPasswordStrength('abcdefgh')
    expect(result.score).toBe(1)
    expect(result.label).toBe('Fair')
    expect(result.color).toBe('orange')
  })

  it('returns Good for password with length and mixed case', () => {
    const result = getPasswordStrength('Abcdefgh')
    expect(result.score).toBe(2)
    expect(result.label).toBe('Good')
    expect(result.color).toBe('yellow')
  })

  it('returns Strong for password with length, mixed case, and numbers', () => {
    const result = getPasswordStrength('Abcdefgh1')
    expect(result.score).toBe(3)
    expect(result.label).toBe('Strong')
    expect(result.color).toBe('lime')
  })

  it('returns Very Strong for password with all criteria', () => {
    const result = getPasswordStrength('Abcdefgh123!')
    expect(result.score).toBe(4)
    expect(result.label).toBe('Very Strong')
    expect(result.color).toBe('green')
  })

  it('caps score at 4', () => {
    const result = getPasswordStrength('VeryLongPassword123!@#$%')
    expect(result.score).toBe(4)
    expect(result.label).toBe('Very Strong')
  })
})

describe('PasswordStrengthIndicator', () => {
  it('renders null for empty password', () => {
    const { container } = render(<PasswordStrengthIndicator password="" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders 5 bars', () => {
    const { container } = render(<PasswordStrengthIndicator password="test123" />)
    const bars = container.querySelectorAll('[class*="h-1"]')
    expect(bars).toHaveLength(5)
  })

  it('shows password strength label by default', () => {
    render(<PasswordStrengthIndicator password="Abcdefgh1!" />)
    expect(screen.getByText(/Password strength:/)).toBeInTheDocument()
  })

  it('hides label when showLabel is false', () => {
    render(<PasswordStrengthIndicator password="Abcdefgh1!" showLabel={false} />)
    expect(screen.queryByText(/Password strength:/)).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <PasswordStrengthIndicator password="test123" className="custom-class" />,
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
