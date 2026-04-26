import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { scraperApi } from '@repo/api-client/rtk/scraper-api'
import { http, HttpResponse } from 'msw'
import { server } from '../../../test/mocks/server'
import { ScrapeButton } from '../ScrapeButton'

vi.mock('@repo/auth-hooks', () => ({
  useIsAdmin: vi.fn(() => true),
}))

function createTestStore() {
  return configureStore({
    reducer: {
      [scraperApi.reducerPath]: scraperApi.reducer,
    },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(scraperApi.middleware),
  })
}

function renderWithProviders(ui: React.ReactElement) {
  const store = createTestStore()
  return render(<Provider store={store}>{ui}</Provider>)
}

describe('ScrapeButton', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the scrape button with correct text', () => {
    renderWithProviders(<ScrapeButton mocNumber="MOC-243400" source="rebrickable" />)

    const button = screen.getByTestId('scrape-button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent('Scrape from Rebrickable')
  })

  it('hides the button for non-admin users', async () => {
    const authHooks = await import('@repo/auth-hooks')
    const mockedUseIsAdmin = vi.mocked(authHooks.useIsAdmin)
    mockedUseIsAdmin.mockReturnValue(false)

    renderWithProviders(<ScrapeButton mocNumber="MOC-243400" source="rebrickable" />)
    expect(screen.queryByTestId('scrape-button')).not.toBeInTheDocument()

    // Restore for other tests
    mockedUseIsAdmin.mockReturnValue(true)
  })

  it('disables the button during throttle period after click', async () => {
    renderWithProviders(<ScrapeButton mocNumber="MOC-243400" source="rebrickable" />)

    const button = screen.getByTestId('scrape-button')

    fireEvent.click(button)

    // Advance past debounce delay (500ms)
    await act(async () => {
      vi.advanceTimersByTime(600)
    })

    // Button should be disabled during throttle period
    await waitFor(() => {
      expect(button).toBeDisabled()
    })
  })

  it('calls the add scrape job mutation with correct payload', async () => {
    let capturedBody: unknown = null
    server.use(
      http.post('*/scraper/jobs', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(
          { id: 'job-456', type: 'rebrickable-moc-single', status: 'waiting', data: {} },
          { status: 201 },
        )
      }),
    )

    renderWithProviders(<ScrapeButton mocNumber="MOC-243400" source="rebrickable" />)

    fireEvent.click(screen.getByTestId('scrape-button'))

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(600)
    })

    await waitFor(() => {
      expect(capturedBody).toEqual({
        url: 'MOC-243400',
        type: 'rebrickable-moc-single',
      })
    })
  })

  it('debounces rapid clicks', async () => {
    let callCount = 0
    server.use(
      http.post('*/scraper/jobs', () => {
        callCount++
        return HttpResponse.json(
          { id: 'job-789', type: 'rebrickable-moc-single', status: 'waiting', data: {} },
          { status: 201 },
        )
      }),
    )

    renderWithProviders(<ScrapeButton mocNumber="MOC-100000" source="rebrickable" />)

    const button = screen.getByTestId('scrape-button')

    // Rapid clicks within debounce window
    fireEvent.click(button)
    await act(async () => vi.advanceTimersByTime(100))
    fireEvent.click(button)
    await act(async () => vi.advanceTimersByTime(100))
    fireEvent.click(button)

    // Advance past debounce
    await act(async () => vi.advanceTimersByTime(600))

    // Should only send one request
    await waitFor(() => {
      expect(callCount).toBe(1)
    })
  })

  it('returns null for unsupported source', () => {
    renderWithProviders(<ScrapeButton mocNumber="MOC-243400" source="unknown-source" />)
    expect(screen.queryByTestId('scrape-button')).not.toBeInTheDocument()
  })
})
