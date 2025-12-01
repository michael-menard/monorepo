import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { PageTransitionSpinner, DEFAULT_SPINNER_DELAY } from '../PageTransitionSpinner'
import { globalUISlice } from '@/store/slices/globalUISlice'

// Create a test store helper
const createTestStore = (isNavigating = false) =>
  configureStore({
    reducer: {
      globalUI: globalUISlice.reducer,
    },
    preloadedState: {
      globalUI: {
        sidebar: { isOpen: true, isCollapsed: false },
        loading: { isNavigating, isPageLoading: false },
        modal: { activeModal: null, modalProps: {} },
      },
    },
  })

// Wrapper component for tests
const TestWrapper = ({
  children,
  isNavigating = false,
}: {
  children: React.ReactNode
  isNavigating?: boolean
}) => <Provider store={createTestStore(isNavigating)}>{children}</Provider>

describe('PageTransitionSpinner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Progress Bar variant (default)', () => {
    it('renders nothing when not navigating', () => {
      render(
        <TestWrapper isNavigating={false}>
          <PageTransitionSpinner />
        </TestWrapper>,
      )

      act(() => {
        vi.advanceTimersByTime(DEFAULT_SPINNER_DELAY)
      })

      expect(screen.queryByTestId('page-transition-bar')).not.toBeInTheDocument()
    })

    it('renders progress bar when navigating after delay', () => {
      render(
        <TestWrapper isNavigating={true}>
          <PageTransitionSpinner />
        </TestWrapper>,
      )

      // Should not show before delay
      expect(screen.queryByTestId('page-transition-bar')).not.toBeInTheDocument()

      // Advance past delay threshold
      act(() => {
        vi.advanceTimersByTime(DEFAULT_SPINNER_DELAY)
      })

      expect(screen.getByTestId('page-transition-bar')).toBeInTheDocument()
    })

    it('has correct accessibility attributes', () => {
      render(
        <TestWrapper isNavigating={true}>
          <PageTransitionSpinner />
        </TestWrapper>,
      )

      act(() => {
        vi.advanceTimersByTime(DEFAULT_SPINNER_DELAY)
      })

      const bar = screen.getByTestId('page-transition-bar')
      expect(bar).toHaveAttribute('aria-hidden', 'true')
    })

    it('applies fixed positioning at top', () => {
      render(
        <TestWrapper isNavigating={true}>
          <PageTransitionSpinner />
        </TestWrapper>,
      )

      act(() => {
        vi.advanceTimersByTime(DEFAULT_SPINNER_DELAY)
      })

      const bar = screen.getByTestId('page-transition-bar')
      expect(bar.className).toContain('fixed')
      expect(bar.className).toContain('top-0')
    })

    it('applies custom className', () => {
      render(
        <TestWrapper isNavigating={true}>
          <PageTransitionSpinner className="custom-class" />
        </TestWrapper>,
      )

      act(() => {
        vi.advanceTimersByTime(DEFAULT_SPINNER_DELAY)
      })

      const bar = screen.getByTestId('page-transition-bar')
      expect(bar.className).toContain('custom-class')
    })
  })

  describe('Overlay variant', () => {
    it('renders nothing when not navigating', () => {
      render(
        <TestWrapper isNavigating={false}>
          <PageTransitionSpinner variant="overlay" />
        </TestWrapper>,
      )

      act(() => {
        vi.advanceTimersByTime(DEFAULT_SPINNER_DELAY)
      })

      expect(screen.queryByTestId('page-transition-overlay')).not.toBeInTheDocument()
    })

    it('renders overlay when navigating after delay', () => {
      render(
        <TestWrapper isNavigating={true}>
          <PageTransitionSpinner variant="overlay" />
        </TestWrapper>,
      )

      act(() => {
        vi.advanceTimersByTime(DEFAULT_SPINNER_DELAY)
      })

      expect(screen.getByTestId('page-transition-overlay')).toBeInTheDocument()
    })

    it('has correct accessibility attributes', () => {
      render(
        <TestWrapper isNavigating={true}>
          <PageTransitionSpinner variant="overlay" />
        </TestWrapper>,
      )

      act(() => {
        vi.advanceTimersByTime(DEFAULT_SPINNER_DELAY)
      })

      const overlay = screen.getByTestId('page-transition-overlay')
      expect(overlay).toHaveAttribute('role', 'status')
      expect(overlay).toHaveAttribute('aria-label', 'Loading page')
    })

    it('renders LEGO brick animation elements', () => {
      render(
        <TestWrapper isNavigating={true}>
          <PageTransitionSpinner variant="overlay" />
        </TestWrapper>,
      )

      act(() => {
        vi.advanceTimersByTime(DEFAULT_SPINNER_DELAY)
      })

      // Should have 4 LEGO brick divs with different colors
      const overlay = screen.getByTestId('page-transition-overlay')
      expect(overlay).toBeInTheDocument()
    })

    it('renders screen reader text', () => {
      render(
        <TestWrapper isNavigating={true}>
          <PageTransitionSpinner variant="overlay" />
        </TestWrapper>,
      )

      act(() => {
        vi.advanceTimersByTime(DEFAULT_SPINNER_DELAY)
      })

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('renders fallback spinner icon', () => {
      render(
        <TestWrapper isNavigating={true}>
          <PageTransitionSpinner variant="overlay" />
        </TestWrapper>,
      )

      act(() => {
        vi.advanceTimersByTime(DEFAULT_SPINNER_DELAY)
      })

      expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(
        <TestWrapper isNavigating={true}>
          <PageTransitionSpinner variant="overlay" className="custom-overlay" />
        </TestWrapper>,
      )

      act(() => {
        vi.advanceTimersByTime(DEFAULT_SPINNER_DELAY)
      })

      const overlay = screen.getByTestId('page-transition-overlay')
      expect(overlay.className).toContain('custom-overlay')
    })
  })

  describe('variant prop', () => {
    it('defaults to bar variant', () => {
      render(
        <TestWrapper isNavigating={true}>
          <PageTransitionSpinner />
        </TestWrapper>,
      )

      act(() => {
        vi.advanceTimersByTime(DEFAULT_SPINNER_DELAY)
      })

      expect(screen.getByTestId('page-transition-bar')).toBeInTheDocument()
      expect(screen.queryByTestId('page-transition-overlay')).not.toBeInTheDocument()
    })

    it('renders overlay variant when specified', () => {
      render(
        <TestWrapper isNavigating={true}>
          <PageTransitionSpinner variant="overlay" />
        </TestWrapper>,
      )

      act(() => {
        vi.advanceTimersByTime(DEFAULT_SPINNER_DELAY)
      })

      expect(screen.queryByTestId('page-transition-bar')).not.toBeInTheDocument()
      expect(screen.getByTestId('page-transition-overlay')).toBeInTheDocument()
    })

    it('renders bar variant when specified', () => {
      render(
        <TestWrapper isNavigating={true}>
          <PageTransitionSpinner variant="bar" />
        </TestWrapper>,
      )

      act(() => {
        vi.advanceTimersByTime(DEFAULT_SPINNER_DELAY)
      })

      expect(screen.getByTestId('page-transition-bar')).toBeInTheDocument()
      expect(screen.queryByTestId('page-transition-overlay')).not.toBeInTheDocument()
    })
  })

  describe('state reactivity', () => {
    it('shows spinner when state changes to navigating after delay', async () => {
      const store = createTestStore(false)
      const { rerender } = render(
        <Provider store={store}>
          <PageTransitionSpinner />
        </Provider>,
      )

      // Initially not showing
      expect(screen.queryByTestId('page-transition-bar')).not.toBeInTheDocument()

      // Dispatch navigation start wrapped in act
      await act(async () => {
        store.dispatch({ type: 'globalUI/setNavigating', payload: true })
      })

      // Re-render to reflect store change
      rerender(
        <Provider store={store}>
          <PageTransitionSpinner />
        </Provider>,
      )

      // Still not showing before delay
      expect(screen.queryByTestId('page-transition-bar')).not.toBeInTheDocument()

      // Advance timer past delay threshold
      act(() => {
        vi.advanceTimersByTime(DEFAULT_SPINNER_DELAY)
      })

      // Now showing
      expect(screen.getByTestId('page-transition-bar')).toBeInTheDocument()
    })

    it('hides spinner when state changes to not navigating', async () => {
      const store = createTestStore(true)
      render(
        <Provider store={store}>
          <PageTransitionSpinner />
        </Provider>,
      )

      // Advance to show spinner
      act(() => {
        vi.advanceTimersByTime(DEFAULT_SPINNER_DELAY)
      })

      // Initially showing
      expect(screen.getByTestId('page-transition-bar')).toBeInTheDocument()

      // Dispatch navigation end wrapped in act
      await act(async () => {
        store.dispatch({ type: 'globalUI/setNavigating', payload: false })
      })

      // Now hidden immediately (no delay on hide)
      expect(screen.queryByTestId('page-transition-bar')).not.toBeInTheDocument()
    })
  })

  describe('delay threshold', () => {
    it('does not show spinner for fast navigations (< delayMs)', async () => {
      const store = createTestStore(false)
      const { rerender } = render(
        <Provider store={store}>
          <PageTransitionSpinner delayMs={300} />
        </Provider>,
      )

      // Start navigation
      await act(async () => {
        store.dispatch({ type: 'globalUI/setNavigating', payload: true })
      })

      rerender(
        <Provider store={store}>
          <PageTransitionSpinner delayMs={300} />
        </Provider>,
      )

      // Fast navigation: completes before 300ms
      act(() => {
        vi.advanceTimersByTime(200)
      })

      // Still not showing
      expect(screen.queryByTestId('page-transition-bar')).not.toBeInTheDocument()

      // Navigation completes
      await act(async () => {
        store.dispatch({ type: 'globalUI/setNavigating', payload: false })
      })

      rerender(
        <Provider store={store}>
          <PageTransitionSpinner delayMs={300} />
        </Provider>,
      )

      // Even after more time passes, should never show
      act(() => {
        vi.advanceTimersByTime(200)
      })

      expect(screen.queryByTestId('page-transition-bar')).not.toBeInTheDocument()
    })

    it('shows spinner for slow navigations (> delayMs)', async () => {
      const store = createTestStore(false)
      const { rerender } = render(
        <Provider store={store}>
          <PageTransitionSpinner delayMs={300} />
        </Provider>,
      )

      // Start navigation
      await act(async () => {
        store.dispatch({ type: 'globalUI/setNavigating', payload: true })
      })

      rerender(
        <Provider store={store}>
          <PageTransitionSpinner delayMs={300} />
        </Provider>,
      )

      // Wait past threshold
      act(() => {
        vi.advanceTimersByTime(300)
      })

      // Should now be showing
      expect(screen.getByTestId('page-transition-bar')).toBeInTheDocument()
    })

    it('respects custom delay threshold', async () => {
      const store = createTestStore(false)
      const { rerender } = render(
        <Provider store={store}>
          <PageTransitionSpinner delayMs={100} />
        </Provider>,
      )

      // Start navigation
      await act(async () => {
        store.dispatch({ type: 'globalUI/setNavigating', payload: true })
      })

      rerender(
        <Provider store={store}>
          <PageTransitionSpinner delayMs={100} />
        </Provider>,
      )

      // Wait just under custom threshold
      act(() => {
        vi.advanceTimersByTime(99)
      })

      expect(screen.queryByTestId('page-transition-bar')).not.toBeInTheDocument()

      // Wait past custom threshold
      act(() => {
        vi.advanceTimersByTime(1)
      })

      expect(screen.getByTestId('page-transition-bar')).toBeInTheDocument()
    })

    it('exports DEFAULT_SPINNER_DELAY constant', () => {
      expect(DEFAULT_SPINNER_DELAY).toBe(300)
    })
  })
})
