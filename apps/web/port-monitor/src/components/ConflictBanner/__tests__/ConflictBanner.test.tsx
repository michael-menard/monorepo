import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConflictBanner } from '..'

describe('ConflictBanner', () => {
  it('renders nothing when no conflicts', () => {
    const { container } = render(<ConflictBanner conflicts={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders conflict details', () => {
    render(
      <ConflictBanner
        conflicts={[
          {
            expectedKey: 'MAIN_APP_PORT',
            actualPid: 1234,
            actualProcessName: 'python',
          },
        ]}
      />,
    )

    expect(screen.getByText('Port Conflicts Detected')).toBeInTheDocument()
    expect(screen.getByText('MAIN_APP_PORT')).toBeInTheDocument()
    expect(screen.getByText('python')).toBeInTheDocument()
    expect(screen.getByText(/1234/)).toBeInTheDocument()
  })

  it('renders multiple conflicts', () => {
    render(
      <ConflictBanner
        conflicts={[
          { expectedKey: 'MAIN_APP_PORT', actualPid: 1234, actualProcessName: 'python' },
          { expectedKey: 'LEGO_API_PORT', actualPid: 5678, actualProcessName: 'ruby' },
        ]}
      />,
    )

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})
