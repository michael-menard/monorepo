/**
 * Test Utilities
 *
 * Provides a custom render function that wraps components
 * with necessary providers (Redux, Theme, etc.)
 */

import { ReactElement, PropsWithChildren } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { inspirationApi } from '@repo/api-client/rtk/inspiration-api'
import { ThemeProvider } from '@repo/app-component-library'

/**
 * Create a test store with the inspiration API
 */
function createTestStore() {
  return configureStore({
    reducer: {
      [inspirationApi.reducerPath]: inspirationApi.reducer,
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware().concat(inspirationApi.middleware),
  })
}

/**
 * Wrapper component that provides all necessary context
 */
function AllTheProviders({ children }: PropsWithChildren) {
  const store = createTestStore()
  return (
    <Provider store={store}>
      <ThemeProvider defaultTheme="light" storageKey="test-theme">
        {children}
      </ThemeProvider>
    </Provider>
  )
}

/**
 * Custom render function that wraps components with providers
 */
function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllTheProviders, ...options })
}

// Re-export everything from testing-library
export * from '@testing-library/react'

// Override the render function
export { customRender as render }
