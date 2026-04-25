import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ActivityList } from '../ActivityList'
import type { StepperItem } from '../__types__'

vi.mock('lucide-react', () => ({
  Clock: (props: Record<string, unknown>) => <svg data-testid="clock-icon" {...props} />,
  ArrowUpRight: (props: Record<string, unknown>) => <svg data-testid="arrow-icon" {...props} />,
  RefreshCw: (props: Record<string, unknown>) => <svg data-testid="refresh-icon" {...props} />,
  Check: (props: Record<string, unknown>) => <svg data-testid="check-icon" {...props} />,
  Loader2: (props: Record<string, unknown>) => <svg data-testid="loader-icon" {...props} />,
  SkipForward: (props: Record<string, unknown>) => <svg data-testid="skip-icon" {...props} />,
  AlertCircle: (props: Record<string, unknown>) => <svg data-testid="alert-icon" {...props} />,
  Circle: (props: Record<string, unknown>) => <svg data-testid="circle-icon" {...props} />,
}))

const steps: StepperItem[] = [
  { id: 'step1', label: 'Launch browser', status: 'completed', elapsed: '2s' },
  { id: 'step2', label: 'Scrape metadata', status: 'running' },
  { id: 'step3', label: 'Download images', status: 'pending' },
  { id: 'step4', label: 'Upload files', status: 'skipped' },
  { id: 'step5', label: 'Save to DB', status: 'failed', error: 'Connection refused' },
]

describe('ActivityList stepper variant', () => {
  it('renders all steps', () => {
    render(<ActivityList variant="stepper" steps={steps} />)

    expect(screen.getByText('Launch browser')).toBeInTheDocument()
    expect(screen.getByText('Scrape metadata')).toBeInTheDocument()
    expect(screen.getByText('Download images')).toBeInTheDocument()
    expect(screen.getByText('Upload files')).toBeInTheDocument()
    expect(screen.getByText('Save to DB')).toBeInTheDocument()
  })

  it('shows elapsed time for completed steps', () => {
    render(<ActivityList variant="stepper" steps={steps} />)
    expect(screen.getByText('2s')).toBeInTheDocument()
  })

  it('shows error message for failed steps', () => {
    render(<ActivityList variant="stepper" steps={steps} />)
    expect(screen.getByText('Connection refused')).toBeInTheDocument()
  })

  it('shows detail text when provided', () => {
    const stepsWithDetail: StepperItem[] = [
      { id: 'step1', label: 'Scrape images', status: 'completed', detail: 'Found 5 images' },
    ]
    render(<ActivityList variant="stepper" steps={stepsWithDetail} />)
    expect(screen.getByText('Found 5 images')).toBeInTheDocument()
  })

  it('renders data-slot attribute', () => {
    render(<ActivityList variant="stepper" steps={steps} />)
    const stepElements = screen.getByText('Launch browser').closest('[data-slot="stepper-step"]')
    expect(stepElements).toBeInTheDocument()
  })
})
