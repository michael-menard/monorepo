/**
 * Tests for MonitorPage (MonitorDashboardPage)
 *
 * AC-5: polling status indicator
 * AC-7: panels show loading/error/data states
 * AC-8: page-level ARIA label
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/mocks/server'
import { MonitorPage } from '../monitor-page'

const API_BASE_URL = 'http://localhost:3001'
const MONITOR_URL = `${API_BASE_URL}/monitor/pipeline`

const mockDashboard = {
  pipeline_view: [
    {
      story_id: 'APIP-2020',
      title: 'Test In-Progress Story',
      state: 'in-progress',
      priority: 'p1',
      blocked_by: null,
      updated_at: new Date().toISOString(),
    },
  ],
  cost_summary: [
    {
      story_id: 'APIP-2020',
      phase: 'plan',
      total_tokens: 5000,
      tokens_input: 3000,
      tokens_output: 2000,
    },
  ],
  blocked_queue: [],
  generated_at: new Date().toISOString(),
}

describe('MonitorPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    server.use(
      http.get(MONITOR_URL, () => {
        return HttpResponse.json(mockDashboard)
      }),
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders the pipeline monitor heading', async () => {
    render(<MonitorPage />)

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(screen.getByText('Pipeline Monitor')).toBeInTheDocument()
  })

  it('has page-level aria-label (AC-8)', () => {
    render(<MonitorPage />)

    expect(document.querySelector('[aria-label="Pipeline monitor dashboard"]')).toBeInTheDocument()
  })

  it('shows loading state initially (AC-7)', () => {
    render(<MonitorPage />)

    // Loading indicators present initially
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders all three panel sections (AC-5, AC-7, AC-8)', async () => {
    render(<MonitorPage />)

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    await waitFor(() => {
      expect(screen.queryAllByRole('table').length).toBeGreaterThan(0)
    })

    // All three panels should be present
    expect(document.querySelector('[aria-label="Active pipeline stories"]')).toBeInTheDocument()
    expect(document.querySelector('[aria-label="Token cost summary"]')).toBeInTheDocument()
    expect(document.querySelector('[aria-label="Blocked stories queue"]')).toBeInTheDocument()
  })

  it('shows Live status indicator (AC-5)', async () => {
    render(<MonitorPage />)

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    await waitFor(() => {
      expect(screen.getByText('Live')).toBeInTheDocument()
    })
  })

  it('shows aria-live region for refresh status (AC-5, AC-8)', () => {
    render(<MonitorPage />)

    expect(
      document.querySelector('[aria-label="Data refresh status"][aria-live="polite"]'),
    ).toBeInTheDocument()
  })
})
