import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LogPanel } from '..'

vi.mock('../../../hooks/useLogStream', () => ({
  useLogStream: () => ({
    lines: [
      { timestamp: '2026-01-01T00:00:00.000Z', stream: 'stdout', text: 'Hello world' },
      { timestamp: '2026-01-01T00:00:01.000Z', stream: 'stderr', text: 'Error!' },
    ],
  }),
}))

describe('LogPanel', () => {
  it('renders nothing when serviceKey is null', () => {
    const { container } = render(<LogPanel serviceKey={null} onClose={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders log lines', () => {
    render(<LogPanel serviceKey="MAIN_APP_PORT" onClose={vi.fn()} />)
    expect(screen.getByText('Hello world')).toBeInTheDocument()
    expect(screen.getByText('Error!')).toBeInTheDocument()
  })

  it('shows service key in header', () => {
    render(<LogPanel serviceKey="MAIN_APP_PORT" onClose={vi.fn()} />)
    expect(screen.getByText('MAIN_APP_PORT')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', async () => {
    const onClose = vi.fn()
    render(<LogPanel serviceKey="MAIN_APP_PORT" onClose={onClose} />)
    await userEvent.click(screen.getByLabelText('Close log panel'))
    expect(onClose).toHaveBeenCalled()
  })
})
