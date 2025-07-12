import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Layout from '../index'

// Mock FloatingShape component
vi.mock('../FloatingShape', () => ({
  default: ({ color, size, top, left, delay, speed }: any) => (
    <div 
      data-testid="motion-div"
      data-color={color}
      data-size={size}
      data-top={top}
      data-left={left}
      data-delay={delay}
      data-speed={speed}
    />
  ),
}))

describe('Layout Component', () => {
  const defaultChildren = <div data-testid="test-content">Test Content</div>

  describe('Rendering', () => {
    it('renders children correctly', () => {
      render(<Layout>{defaultChildren}</Layout>)
      
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
      expect(screen.getByText('Test Content')).toBeInTheDocument()
    })

    it('renders with correct container styling', () => {
      render(<Layout>{defaultChildren}</Layout>)
      
      const container = screen.getByTestId('test-content').parentElement?.parentElement
      expect(container).toHaveClass(
        'min-h-screen',
        'bg-gradient-to-br',
        'from-gray-900',
        'via-green-900',
        'to-emerald-500',
        'flex',
        'justify-center',
        'items-center',
        'relative',
        'overflow-hidden'
      )
    })

    it('renders content area with correct styling', () => {
      render(<Layout>{defaultChildren}</Layout>)
      
      const contentArea = screen.getByTestId('test-content').parentElement
      expect(contentArea).toHaveClass('z-10', 'flex', 'justify-center', 'items-center', 'w-full')
    })
  })

  describe('Floating Shapes', () => {
    it('renders three floating shapes with correct props', () => {
      render(<Layout>{defaultChildren}</Layout>)
      
      const shapes = screen.getAllByTestId('motion-div')
      expect(shapes).toHaveLength(3)
    })

    it('renders first floating shape with correct props', () => {
      render(<Layout>{defaultChildren}</Layout>)
      
      const shapes = screen.getAllByTestId('motion-div')
      const firstShape = shapes[0]
      
      expect(firstShape).toHaveAttribute('data-color', 'bg-green-500')
      expect(firstShape).toHaveAttribute('data-size', 'w-64 h-64')
      expect(firstShape).toHaveAttribute('data-top', '-5%')
      expect(firstShape).toHaveAttribute('data-left', '10%')
      expect(firstShape).toHaveAttribute('data-delay', '0')
      expect(firstShape).toHaveAttribute('data-speed', 'slow')
    })

    it('renders second floating shape with correct props', () => {
      render(<Layout>{defaultChildren}</Layout>)
      
      const shapes = screen.getAllByTestId('motion-div')
      const secondShape = shapes[1]
      
      expect(secondShape).toHaveAttribute('data-color', 'bg-emerald-500')
      expect(secondShape).toHaveAttribute('data-size', 'w-48 h-48')
      expect(secondShape).toHaveAttribute('data-top', '70%')
      expect(secondShape).toHaveAttribute('data-left', '80%')
      expect(secondShape).toHaveAttribute('data-delay', '5')
      expect(secondShape).toHaveAttribute('data-speed', 'medium')
    })

    it('renders third floating shape with correct props', () => {
      render(<Layout>{defaultChildren}</Layout>)
      
      const shapes = screen.getAllByTestId('motion-div')
      const thirdShape = shapes[2]
      
      expect(thirdShape).toHaveAttribute('data-color', 'bg-lime-500')
      expect(thirdShape).toHaveAttribute('data-size', 'w-32 h-32')
      expect(thirdShape).toHaveAttribute('data-top', '40%')
      expect(thirdShape).toHaveAttribute('data-left', '-10%')
      expect(thirdShape).toHaveAttribute('data-delay', '2')
      expect(thirdShape).toHaveAttribute('data-speed', 'fast')
    })
  })

  describe('Content Positioning', () => {
    it('positions content in front of background shapes', () => {
      render(<Layout>{defaultChildren}</Layout>)
      
      const contentArea = screen.getByTestId('test-content').parentElement
      expect(contentArea).toHaveClass('z-10')
    })

    it('centers content both horizontally and vertically', () => {
      render(<Layout>{defaultChildren}</Layout>)
      
      const contentArea = screen.getByTestId('test-content').parentElement
      expect(contentArea).toHaveClass('flex', 'justify-center', 'items-center')
    })

    it('makes content area full width', () => {
      render(<Layout>{defaultChildren}</Layout>)
      
      const contentArea = screen.getByTestId('test-content').parentElement
      expect(contentArea).toHaveClass('w-full')
    })
  })

  describe('Background Styling', () => {
    it('has correct background gradient', () => {
      render(<Layout>{defaultChildren}</Layout>)
      
      const container = screen.getByTestId('test-content').parentElement?.parentElement
      expect(container).toHaveClass(
        'bg-gradient-to-br',
        'from-gray-900',
        'via-green-900',
        'to-emerald-500'
      )
    })

    it('has correct container dimensions and positioning', () => {
      render(<Layout>{defaultChildren}</Layout>)
      
      const container = screen.getByTestId('test-content').parentElement?.parentElement
      expect(container).toHaveClass('min-h-screen', 'relative', 'overflow-hidden')
    })

    it('centers the entire layout', () => {
      render(<Layout>{defaultChildren}</Layout>)
      
      const container = screen.getByTestId('test-content').parentElement?.parentElement
      expect(container).toHaveClass('flex', 'justify-center', 'items-center')
    })
  })

  describe('Children Handling', () => {
    it('renders complex children correctly', () => {
      const complexChildren = (
        <div>
          <h1>Title</h1>
          <p>Paragraph</p>
          <button>Click me</button>
        </div>
      )
      
      render(<Layout>{complexChildren}</Layout>)
      
      expect(screen.getByText('Title')).toBeInTheDocument()
      expect(screen.getByText('Paragraph')).toBeInTheDocument()
      expect(screen.getByText('Click me')).toBeInTheDocument()
    })

    it('renders multiple children correctly', () => {
      render(
        <Layout>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <div data-testid="child-3">Child 3</div>
        </Layout>
      )
      
      expect(screen.getByTestId('child-1')).toBeInTheDocument()
      expect(screen.getByTestId('child-2')).toBeInTheDocument()
      expect(screen.getByTestId('child-3')).toBeInTheDocument()
    })

    it('renders empty children gracefully', () => {
      render(<Layout>{null}</Layout>)
      
      const contentArea = document.querySelector('.z-10')
      expect(contentArea).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('maintains proper document structure', () => {
      render(<Layout>{defaultChildren}</Layout>)
      
      const container = screen.getByTestId('test-content').parentElement?.parentElement
      expect(container).toBeInTheDocument()
    })

    it('preserves children accessibility attributes', () => {
      const accessibleChildren = (
        <button aria-label="Test button" role="button">
          Accessible Button
        </button>
      )
      
      render(<Layout>{accessibleChildren}</Layout>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Test button')
    })
  })

  describe('Edge Cases', () => {
    it('handles undefined children', () => {
      render(<Layout>{undefined}</Layout>)
      
      const contentArea = document.querySelector('.z-10')
      expect(contentArea).toBeInTheDocument()
    })

    it('handles boolean children', () => {
      render(<Layout>{true}</Layout>)
      
      const contentArea = document.querySelector('.z-10')
      expect(contentArea).toBeInTheDocument()
    })

    it('handles number children', () => {
      render(<Layout>{42}</Layout>)
      
      expect(screen.getByText('42')).toBeInTheDocument()
    })

    it('handles string children', () => {
      render(<Layout>String content</Layout>)
      
      expect(screen.getByText('String content')).toBeInTheDocument()
    })
  })
}) 