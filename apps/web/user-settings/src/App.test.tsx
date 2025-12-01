import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../App'

// Mock the logger to avoid console output in tests
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('User Settings Module', () => {
  it('renders module correctly', () => {
    render(<App />)
    expect(screen.getByText(/User Settings/i)).toBeInTheDocument()
  })

  it('displays module content', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText(/module/i)).toBeInTheDocument()
    })
  })

  it('handles user interactions', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Add interaction tests here
    // Example: clicking buttons, filling forms, etc.
  })
})

// API Integration Tests using MSW
describe('API Integration', () => {
  it('fetches data successfully', async () => {
    // This test will use the MSW handlers automatically
    const response = await fetch('http://localhost:3001/health')
    const data = await response.json()

    expect(response.ok).toBe(true)
    expect(data.status).toBe('ok')
    expect(data.service).toBe('user-settings')
  })

  it('handles API errors gracefully', async () => {
    const response = await fetch('http://localhost:3001/api/error/500')
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error.code).toBe('INTERNAL_SERVER_ERROR')
  })
})
