import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RefreshCountdown } from '..'

describe('RefreshCountdown', () => {
  it('renders with last checked time', () => {
    render(
      <RefreshCountdown
        intervalMs={10000}
        lastCheckedAt={new Date().toISOString()}
        isFetching={false}
      />,
    )
    expect(screen.getByText(/Last checked:/)).toBeInTheDocument()
  })

  it('shows refreshing state when fetching', () => {
    render(
      <RefreshCountdown
        intervalMs={10000}
        lastCheckedAt={new Date().toISOString()}
        isFetching={true}
      />,
    )
    expect(screen.getByText(/Refreshing/)).toBeInTheDocument()
  })

  it('renders SVG progress ring', () => {
    render(
      <RefreshCountdown
        intervalMs={10000}
        lastCheckedAt={new Date().toISOString()}
        isFetching={false}
      />,
    )
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('does not show time when lastCheckedAt is undefined', () => {
    const { container } = render(
      <RefreshCountdown intervalMs={10000} isFetching={false} />,
    )
    expect(container.querySelector('span')).toBeNull()
  })
})
