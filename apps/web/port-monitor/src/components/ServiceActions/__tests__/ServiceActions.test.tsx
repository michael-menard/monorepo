import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { ServiceActions } from '..'
import { portMonitorApi } from '../../../store/portMonitorApi'

vi.mock('@repo/app-component-library', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

function renderWithStore(ui: React.ReactElement) {
  const store = configureStore({
    reducer: {
      [portMonitorApi.reducerPath]: portMonitorApi.reducer,
    },
    middleware: gDM => gDM().concat(portMonitorApi.middleware),
  })
  return render(<Provider store={store}>{ui}</Provider>)
}

describe('ServiceActions', () => {
  it('renders "self" for ROADMAP_SVC_PORT', () => {
    renderWithStore(<ServiceActions serviceKey="ROADMAP_SVC_PORT" status="healthy" />)
    expect(screen.getByText('self')).toBeInTheDocument()
  })

  it('renders action button for non-self services', () => {
    renderWithStore(<ServiceActions serviceKey="MAIN_APP_PORT" status="healthy" />)
    expect(screen.getByLabelText('Actions for MAIN_APP_PORT')).toBeInTheDocument()
  })
})
