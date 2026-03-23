import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrchestrationProgress } from '..'

describe('OrchestrationProgress', () => {
  it('renders nothing when no events', () => {
    const { container } = render(
      <OrchestrationProgress events={[]} isRunning={false} onClose={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows running state', () => {
    render(
      <OrchestrationProgress
        events={[
          {
            type: 'starting',
            key: 'MAIN_APP_PORT',
            message: 'Starting...',
            timestamp: new Date().toISOString(),
          },
        ]}
        isRunning={true}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('Running...')).toBeInTheDocument()
    expect(screen.getByText('MAIN_APP_PORT')).toBeInTheDocument()
  })

  it('shows close button when complete', () => {
    render(
      <OrchestrationProgress
        events={[
          {
            type: 'started',
            key: 'MAIN_APP_PORT',
            message: 'Done',
            timestamp: new Date().toISOString(),
          },
          {
            type: 'complete',
            key: '',
            message: 'All done',
            timestamp: new Date().toISOString(),
          },
        ]}
        isRunning={false}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('Close')).toBeInTheDocument()
  })
})
