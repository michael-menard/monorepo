import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { instructionsApi } from '@repo/api-client'
import { BuildStatusBadge, BUILD_STATUS_CONFIG, ALL_STATUSES } from '../index'

function createTestStore() {
  return configureStore({
    reducer: {
      [instructionsApi.reducerPath]: instructionsApi.reducer,
    },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(instructionsApi.middleware),
  })
}

function renderWithProviders(ui: React.ReactElement) {
  const store = createTestStore()
  return render(<Provider store={store}>{ui}</Provider>)
}

describe('BuildStatusBadge', () => {
  it('renders the correct label for each status', () => {
    for (const status of ALL_STATUSES) {
      const { unmount } = renderWithProviders(
        <BuildStatusBadge mocId="moc-1" buildStatus={status} />,
      )
      expect(screen.getByText(BUILD_STATUS_CONFIG[status].label)).toBeTruthy()
      unmount()
    }
  })

  it('renders the badge with correct aria label', () => {
    renderWithProviders(
      <BuildStatusBadge mocId="moc-1" buildStatus="building" />,
    )
    expect(
      screen.getByRole('button', { name: /Build status: Building/i }),
    ).toBeTruthy()
  })

  it('badge is clickable', () => {
    renderWithProviders(
      <BuildStatusBadge mocId="moc-1" buildStatus="instructions_added" />,
    )

    const trigger = screen.getByRole('button', { name: /Build status/i })
    expect(trigger).toBeTruthy()
    // Dropdown opens via Radix portal — tested in E2E
    fireEvent.click(trigger)
  })

  it('has 6 distinct statuses', () => {
    expect(ALL_STATUSES).toHaveLength(6)
  })

  it('each status has a unique label', () => {
    const labels = ALL_STATUSES.map(s => BUILD_STATUS_CONFIG[s].label)
    expect(new Set(labels).size).toBe(6)
  })
})
