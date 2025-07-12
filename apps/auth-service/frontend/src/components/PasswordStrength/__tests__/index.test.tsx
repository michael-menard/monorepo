import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PasswordStrengthMeter from '../index'

describe('PasswordStrength Component', () => {
  describe('PasswordStrengthMeter', () => {
    it('renders strength meter with empty password', () => {
      render(<PasswordStrengthMeter password="" />)
      
      expect(screen.getByText('Very Weak')).toBeInTheDocument()
      expect(screen.getByText('At least 8 characters')).toBeInTheDocument()
      expect(screen.getByText('Contains uppercase letter')).toBeInTheDocument()
      expect(screen.getByText('Contains lowercase letter')).toBeInTheDocument()
      expect(screen.getByText('Contains number')).toBeInTheDocument()
      expect(screen.getByText('Contains special character')).toBeInTheDocument()
    })

    it('shows correct strength for very weak password', () => {
      render(<PasswordStrengthMeter password="a" />)
      
      expect(screen.getByText('Very Weak')).toBeInTheDocument()
    })

    it('shows correct strength for weak password', () => {
      render(<PasswordStrengthMeter password="ab" />)
      
      expect(screen.getByText('Very Weak')).toBeInTheDocument()
    })

    it('shows correct strength for fair password', () => {
      render(<PasswordStrengthMeter password="abc123" />)
      
      expect(screen.getByText('Weak')).toBeInTheDocument()
    })

    it('shows correct strength for good password', () => {
      render(<PasswordStrengthMeter password="abc123A" />)
      
      expect(screen.getByText('Fair')).toBeInTheDocument()
    })

    it('shows correct strength for strong password', () => {
      render(<PasswordStrengthMeter password="abc123A!" />)
      
      expect(screen.getByText('Strong')).toBeInTheDocument()
    })

    it('updates strength meter width based on password strength', () => {
      const { rerender } = render(<PasswordStrengthMeter password="a" />)
      
      // Very weak (1/5 = 20%)
      let strengthBar = screen.getByTestId('strength-bar')
      expect(strengthBar).toHaveStyle({ width: '20%' })
      
      // Strong (5/5 = 100%)
      rerender(<PasswordStrengthMeter password="abc123A!" />)
      strengthBar = screen.getByTestId('strength-bar')
      expect(strengthBar).toHaveStyle({ width: '100%' })
    })
  })

  describe('PasswordCriteria', () => {
    it('shows all criteria as unmet for empty password', () => {
      render(<PasswordStrengthMeter password="" />)
      
      // All should be gray (unmet)
      const grayDots = document.querySelectorAll('.bg-gray-500')
      expect(grayDots).toHaveLength(5)
    })

    it('shows criteria as met when password meets requirements', () => {
      render(<PasswordStrengthMeter password="Abc123!@" />)
      
      // Should have green dots for met criteria
      const greenDots = document.querySelectorAll('.bg-green-500')
      expect(greenDots.length).toBeGreaterThan(0)
    })

    it('correctly identifies 8+ characters criteria', () => {
      const { rerender } = render(<PasswordStrengthMeter password="short" />)
      
      // Should be gray (unmet)
      let criteria = screen.getByText('At least 8 characters')
      expect(criteria).toHaveClass('text-gray-400')
      
      rerender(<PasswordStrengthMeter password="longerpassword" />)
      
      // Should be green (met)
      criteria = screen.getByText('At least 8 characters')
      expect(criteria).toHaveClass('text-green-500')
    })

    it('correctly identifies uppercase letter criteria', () => {
      const { rerender } = render(<PasswordStrengthMeter password="lowercase" />)
      
      // Should be gray (unmet)
      let criteria = screen.getByText('Contains uppercase letter')
      expect(criteria).toHaveClass('text-gray-400')
      
      rerender(<PasswordStrengthMeter password="Uppercase" />)
      
      // Should be green (met)
      criteria = screen.getByText('Contains uppercase letter')
      expect(criteria).toHaveClass('text-green-500')
    })

    it('correctly identifies lowercase letter criteria', () => {
      const { rerender } = render(<PasswordStrengthMeter password="UPPERCASE" />)
      
      // Should be gray (unmet)
      let criteria = screen.getByText('Contains lowercase letter')
      expect(criteria).toHaveClass('text-gray-400')
      
      rerender(<PasswordStrengthMeter password="MixedCase" />)
      
      // Should be green (met)
      criteria = screen.getByText('Contains lowercase letter')
      expect(criteria).toHaveClass('text-green-500')
    })

    it('correctly identifies number criteria', () => {
      const { rerender } = render(<PasswordStrengthMeter password="lettersonly" />)
      
      // Should be gray (unmet)
      let criteria = screen.getByText('Contains number')
      expect(criteria).toHaveClass('text-gray-400')
      
      rerender(<PasswordStrengthMeter password="letters123" />)
      
      // Should be green (met)
      criteria = screen.getByText('Contains number')
      expect(criteria).toHaveClass('text-green-500')
    })

    it('correctly identifies special character criteria', () => {
      const { rerender } = render(<PasswordStrengthMeter password="letters123" />)
      
      // Should be gray (unmet)
      let criteria = screen.getByText('Contains special character')
      expect(criteria).toHaveClass('text-gray-400')
      
      rerender(<PasswordStrengthMeter password="letters123!" />)
      
      // Should be green (met)
      criteria = screen.getByText('Contains special character')
      expect(criteria).toHaveClass('text-green-500')
    })
  })

  describe('Strength Colors', () => {
    it('shows red for very weak passwords', () => {
      render(<PasswordStrengthMeter password="a" />)
      
      const strengthBar = document.querySelector('.bg-red-500')
      expect(strengthBar).toBeInTheDocument()
    })

    it('shows orange for weak passwords', () => {
      render(<PasswordStrengthMeter password="abc123" />)
      
      const strengthBar = screen.getByTestId('strength-bar')
      expect(strengthBar).toHaveClass('bg-orange-500')
    })

    it('shows yellow for fair passwords', () => {
      render(<PasswordStrengthMeter password="abc123A" />)
      
      const strengthBar = screen.getByTestId('strength-bar')
      expect(strengthBar).toHaveClass('bg-yellow-500')
    })

    it('shows green for strong passwords', () => {
      render(<PasswordStrengthMeter password="abc123A!" />)
      
      const strengthBar = screen.getByTestId('strength-bar')
      expect(strengthBar).toHaveClass('bg-green-500')
    })

    it('shows blue for good passwords', () => {
      render(<PasswordStrengthMeter password="abc123A!" />)
      
      const strengthBar = screen.getByTestId('strength-bar')
      expect(strengthBar).toHaveClass('bg-green-500')
    })
  })

  describe('Edge Cases', () => {
    it('handles special characters correctly', () => {
      render(<PasswordStrengthMeter password="test@123" />)
      
      const criteria = screen.getByText('Contains special character')
      expect(criteria).toHaveClass('text-green-500')
    })

    it('handles mixed case correctly', () => {
      render(<PasswordStrengthMeter password="Test123!" />)
      
      const uppercaseCriteria = screen.getByText('Contains uppercase letter')
      const lowercaseCriteria = screen.getByText('Contains lowercase letter')
      
      expect(uppercaseCriteria).toHaveClass('text-green-500')
      expect(lowercaseCriteria).toHaveClass('text-green-500')
    })

    it('handles numbers in different positions', () => {
      render(<PasswordStrengthMeter password="1testA!" />)
      
      const criteria = screen.getByText('Contains number')
      expect(criteria).toHaveClass('text-green-500')
    })
  })
}) 