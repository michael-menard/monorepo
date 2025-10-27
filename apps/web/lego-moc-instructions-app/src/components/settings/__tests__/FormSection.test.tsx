import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FormSection } from '../FormSection'

describe('FormSection', () => {
  it('renders with title and children', () => {
    render(
      <FormSection title="Test Section">
        <div>Test content</div>
      </FormSection>,
    )

    expect(screen.getByText('Test Section')).toBeInTheDocument()
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('renders with title, description, and children', () => {
    render(
      <FormSection title="Test Section" description="Test description">
        <div>Test content</div>
      </FormSection>,
    )

    expect(screen.getByText('Test Section')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('does not render description when not provided', () => {
    render(
      <FormSection title="Test Section">
        <div>Test content</div>
      </FormSection>,
    )

    expect(screen.getByText('Test Section')).toBeInTheDocument()
    expect(screen.queryByText('Test description')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(
      <FormSection title="Test Section" className="custom-class">
        <div>Test content</div>
      </FormSection>,
    )

    const section = screen.getByText('Test Section').closest('.custom-class')
    expect(section).toBeInTheDocument()
  })

  it('renders multiple children', () => {
    render(
      <FormSection title="Test Section">
        <div>First child</div>
        <div>Second child</div>
        <button>Third child</button>
      </FormSection>,
    )

    expect(screen.getByText('First child')).toBeInTheDocument()
    expect(screen.getByText('Second child')).toBeInTheDocument()
    expect(screen.getByText('Third child')).toBeInTheDocument()
  })
})
