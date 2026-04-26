import { render, type RenderOptions, type RenderResult } from '@testing-library/react'
import { configureStore, type EnhancedStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { scraperApi } from '@repo/api-client/rtk/scraper-api'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createTestStore(): EnhancedStore<any> {
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
): RenderResult & { store: EnhancedStore } {
  const store = createTestStore()

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    store,
  }
}
