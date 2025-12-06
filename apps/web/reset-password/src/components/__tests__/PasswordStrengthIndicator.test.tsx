import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PasswordStrengthIndicator, getPasswordStrength } from '../PasswordStrengthIndicator'

describe('PasswordStrengthIndicator', () => {
  describe('getPasswordStrength', () => {
    it('should return weak for empty password', () => {
      const result = getPasswordStrength('')
      expect(result.score).toBe(0)
      expect(result.label).toBe('Weak')
      expect(result.color).toBe('red')
    })

    it('should return weak for short password', () => {
      const result = getPasswordStrength('abc')
      expect(result.score).toBe(0)
      expect(result.label).toBe('Weak')
    })

    it('should increase score for length >= 8', () => {
      const result = getPasswordStrength('abcdefgh')
      expect(result.score).toBeGreaterThanOrEqual(1)
    })

    it('should increase score for length >= 12', () => {
      const result = getPasswordStrength('abcdefghijkl')
      expect(result.score).toBeGreaterThanOrEqual(2)
    })

    it('should increase score for mixed case', () => {
      const result = getPasswordStrength('abcdEFGH')
      expect(result.score).toBeGreaterThanOrEqual(2)
    })

    it('should increase score for numbers', () => {
      const result = getPasswordStrength('abcdEFGH123')
      expect(result.score).toBeGreaterThanOrEqual(3)
    })

    it('should increase score for special characters', () => {
      const result = getPasswordStrength('abcdEFGH123!')
      expect(result.score).toBe(4)
      expect(result.label).toBe('Very Strong')
      expect(result.color).toBe('green')
    })

    it('should cap score at 4', () => {
      const result = getPasswordStrength('ABCdefg12345!@#$%')
      expect(result.score).toBe(4)
    })
  })

  describe('Component rendering', () => {
    it('should render nothing when password is empty', () => {
      const { container } = render(<PasswordStrengthIndicator password="" />)
      expect(container.firstChild).toBeNull()
    })

    it('should render strength indicator when password is provided', () => {
      render(<PasswordStrengthIndicator password="test" />)
      expect(screen.getByTestId('password-strength')).toBeInTheDocument()
    })

    it('should render the strength label', () => {
      render(<PasswordStrengthIndicator password="test" />)
      expect(screen.getByTestId('password-strength-label')).toBeInTheDocument()
      expect(screen.getByText(/Password strength:/)).toBeInTheDocument()
    })

    it('should render 5 progress bars', () => {
      render(<PasswordStrengthIndicator password="test" />)
      for (let i = 0; i <= 4; i++) {
        expect(screen.getByTestId(`password-strength-bar-${i}`)).toBeInTheDocument()
      }
    })

    it('should have proper aria attributes', () => {
      render(<PasswordStrengthIndicator password="StrongPass123!" />)
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuemin', '0')
      expect(progressbar).toHaveAttribute('aria-valuemax', '4')
      expect(progressbar).toHaveAttribute('aria-label')
    })

    it('should use custom testId when provided', () => {
      render(<PasswordStrengthIndicator password="test" data-testid="custom-strength" />)
      expect(screen.getByTestId('custom-strength')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      render(<PasswordStrengthIndicator password="test" className="custom-class" />)
      expect(screen.getByTestId('password-strength')).toHaveClass('custom-class')
    })
  })
})
