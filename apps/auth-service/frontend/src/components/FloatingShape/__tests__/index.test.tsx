import { describe, it, expect } from 'vitest'
import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import FloatingShape from '../index'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, animate, transition, ...props }: any) => (
      <div 
        className={className} 
        style={style} 
        data-testid="floating-shape"
        data-animate={JSON.stringify(animate)}
        data-transition={JSON.stringify(transition)}
        {...props}
      >
        {children}
      </div>
    ),
  },
}))

describe('FloatingShape Component', () => {
  const defaultProps = {
    color: 'bg-blue-500',
    size: 'w-32 h-32',
    top: '10%',
    left: '20%',
    delay: 0,
  }

  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<FloatingShape {...defaultProps} />)
      
      const shape = screen.getByTestId('floating-shape')
      expect(shape).toBeInTheDocument()
      expect(shape).toHaveClass('absolute', 'rounded-full', 'bg-blue-500', 'w-32', 'h-32', 'opacity-20', 'blur-xl')
    })

    it('renders with custom color and size', () => {
      render(
        <FloatingShape
          color="bg-red-500"
          size="w-64 h-64"
          top="50%"
          left="75%"
          delay={2}
        />
      )
      
      const shape = screen.getByTestId('floating-shape')
      expect(shape).toHaveClass('bg-red-500', 'w-64', 'h-64')
    })

    it('applies correct positioning styles', () => {
      render(<FloatingShape {...defaultProps} />)
      
      const shape = screen.getByTestId('floating-shape')
      expect(shape).toHaveStyle({ top: '10%', left: '20%' })
    })

    it('has correct accessibility attributes', () => {
      render(<FloatingShape {...defaultProps} />)
      
      const shape = screen.getByTestId('floating-shape')
      expect(shape).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Animation Configuration', () => {
    it('applies correct animation properties', () => {
      render(<FloatingShape {...defaultProps} />)
      
      const shape = screen.getByTestId('floating-shape')
      const animateData = JSON.parse(shape.getAttribute('data-animate') || '{}')
      
      expect(animateData).toEqual({
        y: ['-20vh', '120vh', '-20vh'],
        x: ['-20vw', '120vw', '-20vw'],
        rotate: [0, 360, 720],
      })
    })

    it('applies correct transition properties with default speed', () => {
      render(<FloatingShape {...defaultProps} />)
      
      const shape = screen.getByTestId('floating-shape')
      const transitionData = JSON.parse(shape.getAttribute('data-transition') || '{}')
      
      expect(transitionData).toEqual({
        duration: 30, // medium speed
        ease: 'linear',
        repeat: null, // JSON.stringify doesn't handle Infinity properly
        delay: 0,
      })
    })

    it('applies slow speed correctly', () => {
      render(<FloatingShape {...defaultProps} speed="slow" />)
      
      const shape = screen.getByTestId('floating-shape')
      const transitionData = JSON.parse(shape.getAttribute('data-transition') || '{}')
      
      expect(transitionData.duration).toBe(70)
    })

    it('applies fast speed correctly', () => {
      render(<FloatingShape {...defaultProps} speed="fast" />)
      
      const shape = screen.getByTestId('floating-shape')
      const transitionData = JSON.parse(shape.getAttribute('data-transition') || '{}')
      
      expect(transitionData.duration).toBe(15)
    })

    it('applies medium speed correctly', () => {
      render(<FloatingShape {...defaultProps} speed="medium" />)
      
      const shape = screen.getByTestId('floating-shape')
      const transitionData = JSON.parse(shape.getAttribute('data-transition') || '{}')
      
      expect(transitionData.duration).toBe(30)
    })
  })

  describe('Props Handling', () => {
    it('handles different color classes', () => {
      const colors = ['bg-red-500', 'bg-green-500', 'bg-blue-500', 'bg-yellow-500']
      
      colors.forEach(color => {
        const { unmount } = render(<FloatingShape {...defaultProps} color={color} />)
        const shape = screen.getByTestId('floating-shape')
        expect(shape).toHaveClass(color)
        unmount()
      })
    })

    it('handles different size classes', () => {
      const sizes = ['w-16 h-16', 'w-32 h-32', 'w-64 h-64', 'w-96 h-96']
      
      sizes.forEach(size => {
        const { unmount } = render(<FloatingShape {...defaultProps} size={size} />)
        const shape = screen.getByTestId('floating-shape')
        expect(shape).toHaveClass(...size.split(' '))
        unmount()
      })
    })

    it('handles different positioning values', () => {
      const positions = [
        { top: '0%', left: '0%' },
        { top: '50%', left: '50%' },
        { top: '100%', left: '100%' },
        { top: '25%', left: '75%' },
      ]
      
      positions.forEach(({ top, left }) => {
        const { unmount } = render(<FloatingShape {...defaultProps} top={top} left={left} />)
        const shape = screen.getByTestId('floating-shape')
        expect(shape).toHaveStyle({ top, left })
        unmount()
      })
    })

    it('handles different delay values', () => {
      const delays = [0, 1, 2, 5, 10]
      
      delays.forEach(delay => {
        const { unmount } = render(<FloatingShape {...defaultProps} delay={delay} />)
        const shape = screen.getByTestId('floating-shape')
        const transitionData = JSON.parse(shape.getAttribute('data-transition') || '{}')
        expect(transitionData.delay).toBe(delay)
        unmount()
      })
    })
  })

  describe('Styling Classes', () => {
    it('has correct base styling classes', () => {
      render(<FloatingShape {...defaultProps} />)
      
      const shape = screen.getByTestId('floating-shape')
      expect(shape).toHaveClass(
        'absolute',
        'rounded-full',
        'opacity-20',
        'blur-xl'
      )
    })

    it('combines custom classes with base classes', () => {
      render(
        <FloatingShape
          color="bg-purple-600"
          size="w-48 h-48"
          top="30%"
          left="60%"
          delay={1}
        />
      )
      
      const shape = screen.getByTestId('floating-shape')
      expect(shape).toHaveClass(
        'absolute',
        'rounded-full',
        'bg-purple-600',
        'w-48',
        'h-48',
        'opacity-20',
        'blur-xl'
      )
    })
  })

  describe('Edge Cases', () => {
    it('handles empty string values gracefully', () => {
      render(
        <FloatingShape
          color=""
          size=""
          top=""
          left=""
          delay={0}
        />
      )
      
      const shape = screen.getByTestId('floating-shape')
      expect(shape).toBeInTheDocument()
    })

    it('handles very large delay values', () => {
      render(<FloatingShape {...defaultProps} delay={100} />)
      
      const shape = screen.getByTestId('floating-shape')
      const transitionData = JSON.parse(shape.getAttribute('data-transition') || '{}')
      expect(transitionData.delay).toBe(100)
    })

    it('handles negative delay values', () => {
      render(<FloatingShape {...defaultProps} delay={-5} />)
      
      const shape = screen.getByTestId('floating-shape')
      const transitionData = JSON.parse(shape.getAttribute('data-transition') || '{}')
      expect(transitionData.delay).toBe(-5)
    })
  })
}) 