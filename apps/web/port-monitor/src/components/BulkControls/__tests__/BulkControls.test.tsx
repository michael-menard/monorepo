import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BulkControls } from '..'

describe('BulkControls', () => {
  it('renders Start All and Stop All buttons', () => {
    render(
      <BulkControls onStartAll={vi.fn()} onStopAll={vi.fn()} isRunning={false} />,
    )
    expect(screen.getByText('Start All')).toBeInTheDocument()
    expect(screen.getByText('Stop All')).toBeInTheDocument()
  })

  it('disables buttons while running', () => {
    render(
      <BulkControls onStartAll={vi.fn()} onStopAll={vi.fn()} isRunning={true} />,
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toBeDisabled()
    expect(buttons[1]).toBeDisabled()
  })

  it('shows confirmation on Start All click', async () => {
    render(
      <BulkControls onStartAll={vi.fn()} onStopAll={vi.fn()} isRunning={false} />,
    )
    await userEvent.click(screen.getByText('Start All'))
    expect(screen.getByText('Start Services')).toBeInTheDocument()
    expect(screen.getByText('All Services')).toBeInTheDocument()
    expect(screen.getByText('Backends Only')).toBeInTheDocument()
    expect(screen.getByText('Frontends Only')).toBeInTheDocument()
  })

  it('calls onStartAll with backend filter', async () => {
    const onStartAll = vi.fn()
    render(
      <BulkControls onStartAll={onStartAll} onStopAll={vi.fn()} isRunning={false} />,
    )
    await userEvent.click(screen.getByText('Start All'))
    await userEvent.click(screen.getByText('Backends Only'))
    expect(onStartAll).toHaveBeenCalledWith('backend')
  })
})
