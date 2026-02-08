import React, { act } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { configureStore, EnhancedStore } from '@reduxjs/toolkit'
import { render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MobileSidebar } from '../MobileSidebar'
import { authSlice } from '@/store/slices/authSlice'
import { navigationSlice } from '@/store/slices/navigationSlice'
import { themeSlice } from '@/store/slices/themeSlice'
import { globalUISlice, setSidebarOpen } from '@/store/slices/globalUISlice'

// Store the current mock pathname for useLocation
let mockPathname = '/initial'

// Mock TanStack Router - useLocation returns current pathname
vi.mock('@tanstack/react-router', () => ({
  useLocation: () => ({ pathname: mockPathname }),
  Link: ({ children, to, ...props }: any) =>
    React.createElement('a', { href: to, ...props }, children),
}))

// Mock the Sidebar component to avoid complex dependencies
vi.mock('../Sidebar', () => ({
  Sidebar: ({ className }: { className?: string }) =>
    React.createElement('div', { 'data-testid': 'sidebar', className }, 'Mock Sidebar'),
}))

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      className,
      onClick,
      'aria-hidden': ariaHidden,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & { 'aria-hidden'?: string }) =>
      React.createElement(
        'div',
        { className, onClick, 'aria-hidden': ariaHidden, ...props },
        children,
      ),
    aside: ({
      children,
      className,
      role,
      'aria-modal': ariaModal,
      'aria-label': ariaLabel,
      ...props
    }: React.HTMLAttributes<HTMLElement> & {
      role?: string
      'aria-modal'?: string
      'aria-label'?: string
    }) =>
      React.createElement(
        'aside',
        { className, role, 'aria-modal': ariaModal, 'aria-label': ariaLabel, ...props },
        children,
      ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}))

// Store type for tests
interface TestState {
  auth: ReturnType<typeof authSlice.getInitialState>
  navigation: ReturnType<typeof navigationSlice.getInitialState>
  theme: ReturnType<typeof themeSlice.getInitialState>
  globalUI: ReturnType<typeof globalUISlice.getInitialState>
}

const createTestStore = (preloadedState?: Partial<TestState>) =>
  configureStore({
    reducer: {
      auth: authSlice.reducer,
      navigation: navigationSlice.reducer,
      theme: themeSlice.reducer,
      globalUI: globalUISlice.reducer,
    },
    preloadedState: preloadedState as TestState,
  })

const renderWithStore = (store: EnhancedStore<TestState>, openSidebar = false) => {
  const result = render(
    <Provider store={store}>
      <MobileSidebar />
    </Provider>,
  )

  // If we want the sidebar open, dispatch after mount to bypass the close-on-navigation effect
  if (openSidebar) {
    act(() => {
      store.dispatch(setSidebarOpen(true))
    })
  }

  return result
}

describe('MobileSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset body overflow style
    document.body.style.overflow = ''
    // Reset mock pathname to prevent close-on-navigation triggering
    mockPathname = '/initial'
  })

  describe('visibility', () => {
    it('should not render when sidebar is closed', () => {
      const store = createTestStore({
        globalUI: {
          sidebar: { isOpen: false, isCollapsed: false },
          loading: { isNavigating: false, isPageLoading: false },
          modal: { activeModal: null, modalProps: {} },
        },
      })
      renderWithStore(store)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should render when sidebar is open', () => {
      const store = createTestStore()
      renderWithStore(store, true)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should have aria-modal and aria-label attributes', () => {
      const store = createTestStore()
      renderWithStore(store, true)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-label', 'Navigation menu')
    })
  })

  describe('backdrop behavior (AC: 4, 6)', () => {
    it('should render backdrop when sidebar is open', () => {
      const store = createTestStore()
      const { container } = renderWithStore(store, true)

      // Backdrop should have bg-black/60 class
      const backdrop = container.querySelector('.bg-black\\/60')
      expect(backdrop).toBeInTheDocument()
    })

    it('should close sidebar when backdrop is clicked (AC: 6)', () => {
      const store = createTestStore()
      const { container } = renderWithStore(store, true)

      const backdrop = container.querySelector('.bg-black\\/60')
      expect(backdrop).toBeInTheDocument()

      fireEvent.click(backdrop!)

      const state = store.getState()
      expect(state.globalUI.sidebar.isOpen).toBe(false)
    })
  })

  describe('close button', () => {
    it('should render close button', () => {
      const store = createTestStore()
      renderWithStore(store, true)

      const closeButton = screen.getByLabelText('Close navigation menu')
      expect(closeButton).toBeInTheDocument()
    })

    it('should close sidebar when close button is clicked', () => {
      const store = createTestStore()
      renderWithStore(store, true)

      const closeButton = screen.getByLabelText('Close navigation menu')
      fireEvent.click(closeButton)

      const state = store.getState()
      expect(state.globalUI.sidebar.isOpen).toBe(false)
    })
  })

  describe('escape key behavior (AC: 7)', () => {
    it('should close sidebar when Escape key is pressed', () => {
      const store = createTestStore()
      renderWithStore(store, true)

      fireEvent.keyDown(document, { key: 'Escape' })

      const state = store.getState()
      expect(state.globalUI.sidebar.isOpen).toBe(false)
    })

    it('should not close when other keys are pressed', () => {
      const store = createTestStore()
      renderWithStore(store, true)

      fireEvent.keyDown(document, { key: 'Enter' })

      const state = store.getState()
      expect(state.globalUI.sidebar.isOpen).toBe(true)
    })
  })

  describe('body scroll lock', () => {
    it('should lock body scroll when sidebar is open', () => {
      const store = createTestStore()
      renderWithStore(store, true)

      expect(document.body.style.overflow).toBe('hidden')
    })

    it('should unlock body scroll when sidebar is closed', () => {
      const store = createTestStore()
      renderWithStore(store, true)

      // Close the sidebar
      act(() => {
        store.dispatch(setSidebarOpen(false))
      })

      // Body scroll should be unlocked
      expect(document.body.style.overflow).toBe('')
    })
  })

  describe('responsive visibility (AC: 8)', () => {
    it('should have md:hidden class on backdrop', () => {
      const store = createTestStore()
      const { container } = renderWithStore(store, true)

      const backdrop = container.querySelector('.md\\:hidden.bg-black\\/60')
      expect(backdrop).toBeInTheDocument()
    })

    it('should have md:hidden class on drawer', () => {
      const store = createTestStore()
      renderWithStore(store, true)

      const dialog = screen.getByRole('dialog')
      expect(dialog.className).toContain('md:hidden')
    })
  })

  describe('drawer styling', () => {
    it('should have fixed positioning', () => {
      const store = createTestStore()
      renderWithStore(store, true)

      const dialog = screen.getByRole('dialog')
      expect(dialog.className).toContain('fixed')
      expect(dialog.className).toContain('left-0')
      expect(dialog.className).toContain('top-0')
      expect(dialog.className).toContain('bottom-0')
    })

    it('should have correct width', () => {
      const store = createTestStore()
      renderWithStore(store, true)

      const dialog = screen.getByRole('dialog')
      expect(dialog.className).toContain('w-72')
    })

    it('should have proper z-index', () => {
      const store = createTestStore()
      renderWithStore(store, true)

      const dialog = screen.getByRole('dialog')
      expect(dialog.className).toContain('z-50')
    })
  })
})
