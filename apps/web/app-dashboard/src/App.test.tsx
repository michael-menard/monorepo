import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { App } from './App'

vi.mock('@repo/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  createLogger: vi.fn().mockReturnValue({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}))

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

describe('App Dashboard Module', () => {
  it('renders the page heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /Dashboard/i })).toBeInTheDocument()
  })

  it('displays the collection subtitle', () => {
    render(<App />)
    expect(screen.getByText(/Your LEGO MOC collection at a glance/i)).toBeInTheDocument()
  })

  it('shows the quick actions', () => {
    render(<App />)
    expect(screen.getByText(/Add MOC/i)).toBeInTheDocument()
  })
})
