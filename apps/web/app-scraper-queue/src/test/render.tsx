import { render, type RenderOptions } from '@testing-library/react'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { scraperApi } from '@repo/api-client/rtk/scraper-api'

function createTestStore() {
  return configureStore({
    reducer: {
      [scraperApi.reducerPath]: scraperApi.reducer,
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware().concat(scraperApi.middleware),
  })
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  const store = createTestStore()

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    store,
  }
}
