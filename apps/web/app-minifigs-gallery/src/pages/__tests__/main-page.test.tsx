import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { minifigsApi } from '@repo/api-client/rtk/minifigs-api'
import { MainPage } from '../main-page'

function createTestStore() {
  return configureStore({
    reducer: {
      [minifigsApi.reducerPath]: minifigsApi.reducer,
    },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(minifigsApi.middleware),
  })
}

function renderWithStore(ui: React.ReactElement) {
  const store = createTestStore()
  return render(<Provider store={store}>{ui}</Provider>)
}

describe('MainPage', () => {
  it('renders gallery heading', async () => {
    renderWithStore(<MainPage />)
    expect(screen.getByText('Minifig Collection')).toBeInTheDocument()
  })

  it('renders minifig cards after loading', async () => {
    renderWithStore(<MainPage />)
    await waitFor(() => {
      expect(screen.getByText('Forestman - Green Hat')).toBeInTheDocument()
    })
    expect(screen.getByText('Stormtrooper')).toBeInTheDocument()
  })

  it('renders status filter buttons', () => {
    renderWithStore(<MainPage />)
    expect(screen.getByTestId('minifig-filter-all')).toBeInTheDocument()
    expect(screen.getByTestId('minifig-filter-owned')).toBeInTheDocument()
    expect(screen.getByTestId('minifig-filter-wanted')).toBeInTheDocument()
  })

  it('renders search input', () => {
    renderWithStore(<MainPage />)
    expect(screen.getByTestId('minifig-search-input')).toBeInTheDocument()
  })

  it('filters by owned status', async () => {
    const user = userEvent.setup()
    renderWithStore(<MainPage />)

    await waitFor(() => {
      expect(screen.getByText('Forestman - Green Hat')).toBeInTheDocument()
    })

    await user.click(screen.getByTestId('minifig-filter-owned'))

    await waitFor(() => {
      expect(screen.getByText('Forestman - Green Hat')).toBeInTheDocument()
      expect(screen.queryByText('Stormtrooper')).not.toBeInTheDocument()
    })
  })

  it('filters by search text', async () => {
    const user = userEvent.setup()
    renderWithStore(<MainPage />)

    await waitFor(() => {
      expect(screen.getByText('Forestman - Green Hat')).toBeInTheDocument()
    })

    await user.type(screen.getByTestId('minifig-search-input'), 'storm')

    await waitFor(() => {
      expect(screen.getByText('Stormtrooper')).toBeInTheDocument()
      expect(screen.queryByText('Forestman - Green Hat')).not.toBeInTheDocument()
    })
  })

  it('shows condition badges on cards', async () => {
    renderWithStore(<MainPage />)
    await waitFor(() => {
      expect(screen.getByText('Built')).toBeInTheDocument()
    })
  })

  it('shows status badges on cards', async () => {
    renderWithStore(<MainPage />)
    await waitFor(() => {
      expect(screen.getByText('Owned')).toBeInTheDocument()
      expect(screen.getByText('Wanted')).toBeInTheDocument()
    })
  })

  it('shows variant lego number on cards', async () => {
    renderWithStore(<MainPage />)
    await waitFor(() => {
      expect(screen.getAllByText('cas002').length).toBeGreaterThanOrEqual(1)
    })
  })
})
