import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { minifigsApi } from '@repo/api-client/rtk/minifigs-api'
import { MinifigDetailPage } from '../minifig-detail-page'

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

describe('MinifigDetailPage', () => {
  it('renders minifig name after loading', async () => {
    renderWithStore(<MinifigDetailPage />)
    await waitFor(() => {
      expect(screen.getByText('Forestman - Green Hat')).toBeInTheDocument()
    })
  })

  it('shows variant lego number', async () => {
    renderWithStore(<MinifigDetailPage />)
    await waitFor(() => {
      expect(screen.getByText('cas002')).toBeInTheDocument()
    })
  })

  it('shows status and condition', async () => {
    renderWithStore(<MinifigDetailPage />)
    await waitFor(() => {
      expect(screen.getByText('Owned')).toBeInTheDocument()
      expect(screen.getByText('Built')).toBeInTheDocument()
    })
  })

  it('shows source type', async () => {
    renderWithStore(<MinifigDetailPage />)
    await waitFor(() => {
      expect(screen.getByText('From Set')).toBeInTheDocument()
    })
  })

  it('shows theme from variant', async () => {
    renderWithStore(<MinifigDetailPage />)
    await waitFor(() => {
      expect(screen.getByText('Castle')).toBeInTheDocument()
    })
  })

  it('shows year from variant', async () => {
    renderWithStore(<MinifigDetailPage />)
    await waitFor(() => {
      expect(screen.getByText('1990')).toBeInTheDocument()
    })
  })

  it('shows tags', async () => {
    renderWithStore(<MinifigDetailPage />)
    await waitFor(() => {
      expect(screen.getByText('forestmen')).toBeInTheDocument()
      expect(screen.getByText('castle')).toBeInTheDocument()
    })
  })

  it('shows purchase price', async () => {
    renderWithStore(<MinifigDetailPage />)
    await waitFor(() => {
      expect(screen.getAllByText('$12.99').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows purpose and planned use', async () => {
    renderWithStore(<MinifigDetailPage />)
    await waitFor(() => {
      expect(screen.getByText('Castle MOC')).toBeInTheDocument()
      expect(screen.getByText('Display')).toBeInTheDocument()
    })
  })

  it('shows notes', async () => {
    renderWithStore(<MinifigDetailPage />)
    await waitFor(() => {
      expect(screen.getByText('Good condition')).toBeInTheDocument()
    })
  })

  it('shows parts list from variant', async () => {
    renderWithStore(<MinifigDetailPage />)
    await waitFor(() => {
      expect(screen.getByText('Head')).toBeInTheDocument()
      expect(screen.getByText('Torso')).toBeInTheDocument()
      expect(screen.getByText('3626')).toBeInTheDocument()
    })
  })

  it('shows delete button', async () => {
    renderWithStore(<MinifigDetailPage />)
    await waitFor(() => {
      expect(screen.getByTestId('minifig-delete-button')).toBeInTheDocument()
    })
  })

  it('shows back button', async () => {
    renderWithStore(<MinifigDetailPage />)
    await waitFor(() => {
      expect(screen.getByText('Back')).toBeInTheDocument()
    })
  })
})
