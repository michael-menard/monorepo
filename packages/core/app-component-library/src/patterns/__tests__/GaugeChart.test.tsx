import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GaugeChart } from '../GaugeChart'

const ARC_LENGTH = 126

describe('GaugeChart', () => {
  it('renders without crashing', () => {
    const { container } = render(<GaugeChart value={75} label="Completion" />)
    expect(container.querySelector('[data-slot="gauge-chart"]')).toBeInTheDocument()
  })

  it('displays the value as percentage text', () => {
    render(<GaugeChart value={75} label="Completion" />)
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('displays the label when no status is provided', () => {
    render(<GaugeChart value={50} label="Progress" />)
    expect(screen.getByText('Progress')).toBeInTheDocument()
  })

  it('displays status badge instead of label when status is provided', () => {
    render(<GaugeChart value={80} label="Progress" status="On Track" />)
    expect(screen.getByText('On Track')).toBeInTheDocument()
    // Label should not appear when status is set
    expect(screen.queryByText('Progress')).not.toBeInTheDocument()
  })

  describe('SVG strokeDasharray', () => {
    it('calculates correct strokeDasharray for 0%', () => {
      const { container } = render(<GaugeChart value={0} label="Empty" />)
      const paths = container.querySelectorAll('path')
      const valuePath = paths[1]
      expect(valuePath).toHaveAttribute('stroke-dasharray', `0 ${ARC_LENGTH}`)
    })

    it('calculates correct strokeDasharray for 50%', () => {
      const { container } = render(<GaugeChart value={50} label="Half" />)
      const paths = container.querySelectorAll('path')
      const valuePath = paths[1]
      const expected = (50 / 100) * ARC_LENGTH
      expect(valuePath).toHaveAttribute('stroke-dasharray', `${expected} ${ARC_LENGTH}`)
    })

    it('calculates correct strokeDasharray for 100%', () => {
      const { container } = render(<GaugeChart value={100} label="Full" />)
      const paths = container.querySelectorAll('path')
      const valuePath = paths[1]
      expect(valuePath).toHaveAttribute('stroke-dasharray', `${ARC_LENGTH} ${ARC_LENGTH}`)
    })

    it('calculates correct strokeDasharray for 75%', () => {
      const { container } = render(<GaugeChart value={75} label="Most" />)
      const paths = container.querySelectorAll('path')
      const valuePath = paths[1]
      const expected = (75 / 100) * ARC_LENGTH
      expect(valuePath).toHaveAttribute('stroke-dasharray', `${expected} ${ARC_LENGTH}`)
    })
  })

  describe('sizes', () => {
    it('renders sm size', () => {
      const { container } = render(<GaugeChart value={50} label="Small" size="sm" />)
      const gauge = container.querySelector('[data-slot="gauge-chart"]')
      expect(gauge).toBeInTheDocument()
      // sm uses text-lg for the value
      const valueText = screen.getByText('50%')
      expect(valueText.className).toContain('text-lg')
    })

    it('renders md size (default)', () => {
      const { container } = render(<GaugeChart value={50} label="Medium" />)
      const gauge = container.querySelector('[data-slot="gauge-chart"]')
      expect(gauge).toBeInTheDocument()
      const valueText = screen.getByText('50%')
      expect(valueText.className).toContain('text-2xl')
    })

    it('renders lg size', () => {
      const { container } = render(<GaugeChart value={50} label="Large" size="lg" />)
      const gauge = container.querySelector('[data-slot="gauge-chart"]')
      expect(gauge).toBeInTheDocument()
      const valueText = screen.getByText('50%')
      expect(valueText.className).toContain('text-3xl')
    })
  })

  describe('color', () => {
    it('uses primary color by default', () => {
      const { container } = render(<GaugeChart value={50} label="Default" />)
      const paths = container.querySelectorAll('path')
      const valuePath = paths[1]
      expect(valuePath).toHaveAttribute('stroke', 'var(--primary)')
    })

    it('uses custom color when provided', () => {
      const { container } = render(
        <GaugeChart value={50} label="Custom" color="var(--destructive)" />,
      )
      const paths = container.querySelectorAll('path')
      const valuePath = paths[1]
      expect(valuePath).toHaveAttribute('stroke', 'var(--destructive)')
    })
  })
})
