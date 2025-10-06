import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Settings } from 'lucide-react'
import { SettingsCard } from '../SettingsCard'

describe('SettingsCard', () => {
  const defaultProps = {
    title: 'Test Settings',
    description: 'Test description',
    icon: Settings,
    children: <div>Test content</div>
  }

  it('renders with required props', () => {
    render(<SettingsCard {...defaultProps} />)
    
    expect(screen.getByText('Test Settings')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('applies custom icon color', () => {
    render(<SettingsCard {...defaultProps} iconColor="text-red-500" />)
    
    const icon = screen.getByText('Test Settings').parentElement?.querySelector('svg')
    expect(icon).toHaveClass('text-red-500')
  })

  it('applies default icon color when not specified', () => {
    render(<SettingsCard {...defaultProps} />)
    
    const icon = screen.getByText('Test Settings').parentElement?.querySelector('svg')
    expect(icon).toHaveClass('text-primary')
  })

  it('applies custom className', () => {
    render(<SettingsCard {...defaultProps} className="custom-class" />)
    
    const card = screen.getByText('Test Settings').closest('.custom-class')
    expect(card).toBeInTheDocument()
  })

  it('renders children content', () => {
    const customChildren = (
      <div>
        <p>Custom content</p>
        <button>Custom button</button>
      </div>
    )
    
    render(<SettingsCard {...defaultProps}>{customChildren}</SettingsCard>)
    
    expect(screen.getByText('Custom content')).toBeInTheDocument()
    expect(screen.getByText('Custom button')).toBeInTheDocument()
  })
})
