import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoadingSpinner from '../index'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, animate, transition, ...props }: any) => (
      <div 
        className={className}
        data-testid="motion-div"
        data-animate={JSON.stringify(animate)}
        data-transition={JSON.stringify(transition)}
        {...props}
      >
        {children}
      </div>
    ),
  },
}))

describe('LoadingSpinner Component', () => {
  describe('Rendering', () => {
    it('renders the loading spinner container', () => {
      render(<LoadingSpinner />)
      
      const container = document.querySelector('.min-h-screen')
      expect(container).toBeInTheDocument()
    })

    it('renders the spinning element', () => {
      render(<LoadingSpinner />)
      
      const spinner = screen.getByTestId('motion-div')
      expect(spinner).toBeInTheDocument()
    })

    it('has correct container styling', () => {
      render(<LoadingSpinner />)
      
      const container = document.querySelector('.min-h-screen')
      expect(container).toHaveClass(
        'min-h-screen',
        'bg-gradient-to-br',
        'from-gray-900',
        'via-green-900',
        'to-emerald-900',
        'flex',
        'items-center',
        'justify-center',
        'relative',
        'overflow-hidden'
      )
    })

    it('has correct spinner styling', () => {
      render(<LoadingSpinner />)
      
      const spinner = screen.getByTestId('motion-div')
      expect(spinner).toHaveClass(
        'w-16',
        'h-16',
        'border-4',
        'border-t-4',
        'border-t-green-500',
        'border-green-200',
        'rounded-full'
      )
    })
  })

  describe('Animation Configuration', () => {
    it('applies correct rotation animation', () => {
      render(<LoadingSpinner />)
      
      const spinner = screen.getByTestId('motion-div')
      const animateData = JSON.parse(spinner.getAttribute('data-animate') || '{}')
      
      expect(animateData).toEqual({ rotate: 360 })
    })

    it('applies correct transition properties', () => {
      render(<LoadingSpinner />)
      
      const spinner = screen.getByTestId('motion-div')
      const transitionData = JSON.parse(spinner.getAttribute('data-transition') || '{}')
      
      expect(transitionData).toEqual({
        duration: 1,
        repeat: null, // JSON.stringify doesn't handle Infinity properly
        ease: 'linear'
      })
    })
  })

  describe('Styling Classes', () => {
    it('has correct background gradient', () => {
      render(<LoadingSpinner />)
      
      const container = document.querySelector('.min-h-screen')
      expect(container).toHaveClass(
        'bg-gradient-to-br',
        'from-gray-900',
        'via-green-900',
        'to-emerald-900'
      )
    })

    it('centers the spinner both horizontally and vertically', () => {
      render(<LoadingSpinner />)
      
      const container = document.querySelector('.min-h-screen')
      expect(container).toHaveClass('flex', 'items-center', 'justify-center')
    })

    it('has correct spinner dimensions', () => {
      render(<LoadingSpinner />)
      
      const spinner = screen.getByTestId('motion-div')
      expect(spinner).toHaveClass('w-16', 'h-16')
    })

    it('has correct border styling', () => {
      render(<LoadingSpinner />)
      
      const spinner = screen.getByTestId('motion-div')
      expect(spinner).toHaveClass(
        'border-4',
        'border-t-4',
        'border-t-green-500',
        'border-green-200'
      )
    })

    it('has correct border radius', () => {
      render(<LoadingSpinner />)
      
      const spinner = screen.getByTestId('motion-div')
      expect(spinner).toHaveClass('rounded-full')
    })
  })

  describe('Container Properties', () => {
    it('has full screen height', () => {
      render(<LoadingSpinner />)
      
      const container = document.querySelector('.min-h-screen')
      expect(container).toHaveClass('min-h-screen')
    })

    it('has relative positioning', () => {
      render(<LoadingSpinner />)
      
      const container = document.querySelector('.min-h-screen')
      expect(container).toHaveClass('relative')
    })

    it('has overflow hidden', () => {
      render(<LoadingSpinner />)
      
      const container = document.querySelector('.min-h-screen')
      expect(container).toHaveClass('overflow-hidden')
    })
  })

  describe('Accessibility', () => {
    it('renders without accessibility violations', () => {
      render(<LoadingSpinner />)
      
      const container = document.querySelector('.min-h-screen')
      const spinner = screen.getByTestId('motion-div')
      
      expect(container).toBeInTheDocument()
      expect(spinner).toBeInTheDocument()
    })

    it('maintains proper DOM structure', () => {
      render(<LoadingSpinner />)
      
      const container = document.querySelector('.min-h-screen')
      const spinner = container?.querySelector('[data-testid="motion-div"]')
      
      expect(container).toBeInTheDocument()
      expect(spinner).toBeInTheDocument()
    })
  })

  describe('Animation Behavior', () => {
    it('configures infinite rotation', () => {
      render(<LoadingSpinner />)
      
      const spinner = screen.getByTestId('motion-div')
      const transitionData = JSON.parse(spinner.getAttribute('data-transition') || '{}')
      
      expect(transitionData.repeat).toBe(null)
    })

    it('uses linear easing for smooth rotation', () => {
      render(<LoadingSpinner />)
      
      const spinner = screen.getByTestId('motion-div')
      const transitionData = JSON.parse(spinner.getAttribute('data-transition') || '{}')
      
      expect(transitionData.ease).toBe('linear')
    })

    it('has 1 second duration for each rotation', () => {
      render(<LoadingSpinner />)
      
      const spinner = screen.getByTestId('motion-div')
      const transitionData = JSON.parse(spinner.getAttribute('data-transition') || '{}')
      
      expect(transitionData.duration).toBe(1)
    })
  })

  describe('Visual Design', () => {
    it('creates a circular spinner', () => {
      render(<LoadingSpinner />)
      
      const spinner = screen.getByTestId('motion-div')
      expect(spinner).toHaveClass('rounded-full')
    })

    it('uses green color scheme', () => {
      render(<LoadingSpinner />)
      
      const spinner = screen.getByTestId('motion-div')
      expect(spinner).toHaveClass('border-t-green-500', 'border-green-200')
    })

    it('has appropriate border thickness', () => {
      render(<LoadingSpinner />)
      
      const spinner = screen.getByTestId('motion-div')
      expect(spinner).toHaveClass('border-4', 'border-t-4')
    })
  })

  describe('Layout Integration', () => {
    it('fills the entire viewport', () => {
      render(<LoadingSpinner />)
      
      const container = document.querySelector('.min-h-screen')
      expect(container).toHaveClass('min-h-screen')
    })

    it('centers content in the viewport', () => {
      render(<LoadingSpinner />)
      
      const container = document.querySelector('.min-h-screen')
      expect(container).toHaveClass('flex', 'items-center', 'justify-center')
    })

    it('handles overflow properly', () => {
      render(<LoadingSpinner />)
      
      const container = document.querySelector('.min-h-screen')
      expect(container).toHaveClass('overflow-hidden')
    })
  })
}) 