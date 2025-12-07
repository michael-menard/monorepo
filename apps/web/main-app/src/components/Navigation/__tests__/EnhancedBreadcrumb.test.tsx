import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter } from 'react-router-dom'
import { EnhancedBreadcrumb, CompactBreadcrumb } from '../EnhancedBreadcrumb'
import { NavigationProvider } from '../NavigationProvider'
import { navigationSlice, setBreadcrumbs } from '@/store/slices/navigationSlice'

// Mock react-router-dom Link
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Link: ({ to, children, onClick, ...props }: any) => (
      <a href={to} onClick={onClick} {...props}>
        {children}
      </a>
    ),
    useLocation: () => ({ pathname: '/gallery/featured' }),
  }
})

describe.skip('EnhancedBreadcrumb', () => {
  let store: ReturnType<typeof configureStore>
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    store = configureStore({
      reducer: {
        navigation: navigationSlice.reducer,
      },
    })

    user = userEvent.setup()

    // Mock window.history.back
    Object.defineProperty(window, 'history', {
      value: { back: vi.fn() },
      writable: true,
    })
  })

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <Provider store={store}>
        <MemoryRouter>
          <NavigationProvider>{component}</NavigationProvider>
        </MemoryRouter>
      </Provider>,
    )
  }

  it('should not render when no breadcrumbs', () => {
    const { container } = renderWithProviders(<EnhancedBreadcrumb />)
    expect(container.firstChild).toBeNull()
  })

  it('should render breadcrumbs', () => {
    // Set up breadcrumbs
    store.dispatch(
      setBreadcrumbs([
        { label: 'Home', href: '/', isClickable: true, icon: 'Home' },
        { label: 'Gallery', href: '/gallery', isClickable: true },
        { label: 'Featured', isClickable: false },
      ]),
    )

    renderWithProviders(<EnhancedBreadcrumb />)

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Gallery')).toBeInTheDocument()
    expect(screen.getByText('Featured')).toBeInTheDocument()
  })

  it('should show back button when enabled and has multiple breadcrumbs', () => {
    store.dispatch(
      setBreadcrumbs([
        { label: 'Home', href: '/', isClickable: true },
        { label: 'Gallery', href: '/gallery', isClickable: true },
      ]),
    )

    renderWithProviders(<EnhancedBreadcrumb showBackButton={true} />)

    const backButton = screen.getByLabelText('Go back')
    expect(backButton).toBeInTheDocument()
  })

  it('should hide back button when disabled', () => {
    store.dispatch(
      setBreadcrumbs([
        { label: 'Home', href: '/', isClickable: true },
        { label: 'Gallery', href: '/gallery', isClickable: true },
      ]),
    )

    renderWithProviders(<EnhancedBreadcrumb showBackButton={false} />)

    const backButton = screen.queryByLabelText('Go back')
    expect(backButton).not.toBeInTheDocument()
  })

  it('should handle back button click', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    store.dispatch(
      setBreadcrumbs([
        { label: 'Home', href: '/', isClickable: true },
        { label: 'Gallery', href: '/gallery', isClickable: true },
      ]),
    )

    renderWithProviders(<EnhancedBreadcrumb showBackButton={true} />)

    const backButton = screen.getByLabelText('Go back')
    await user.click(backButton)

    expect(window.history.back).toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith(
      'Navigation Analytics:',
      expect.objectContaining({
        itemId: 'breadcrumb_back',
        source: 'breadcrumb',
      }),
    )

    consoleSpy.mockRestore()
  })

  it('should render clickable breadcrumb links', () => {
    store.dispatch(
      setBreadcrumbs([
        { label: 'Home', href: '/', isClickable: true },
        { label: 'Gallery', href: '/gallery', isClickable: true },
        { label: 'Featured', isClickable: false },
      ]),
    )

    renderWithProviders(<EnhancedBreadcrumb />)

    const homeLink = screen.getByRole('link', { name: /home/i })
    const galleryLink = screen.getByRole('link', { name: /gallery/i })

    expect(homeLink).toHaveAttribute('href', '/')
    expect(galleryLink).toHaveAttribute('href', '/gallery')

    // Featured should not be a link
    const featuredText = screen.getByText('Featured')
    expect(featuredText.tagName).not.toBe('A')
  })

  it('should handle breadcrumb click tracking', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    store.dispatch(
      setBreadcrumbs([
        { label: 'Home', href: '/', isClickable: true },
        { label: 'Gallery', href: '/gallery', isClickable: true },
      ]),
    )

    renderWithProviders(<EnhancedBreadcrumb />)

    const galleryLink = screen.getByRole('link', { name: /gallery/i })
    await user.click(galleryLink)

    expect(consoleSpy).toHaveBeenCalledWith(
      'Navigation Analytics:',
      expect.objectContaining({
        itemId: 'breadcrumb_click',
        source: 'breadcrumb',
        itemLabel: 'Gallery',
        itemHref: '/gallery',
        position: 1,
      }),
    )

    consoleSpy.mockRestore()
  })

  it('should truncate breadcrumbs when exceeding maxItems', () => {
    const longBreadcrumbs = [
      { label: 'Home', href: '/', isClickable: true },
      { label: 'Level 1', href: '/level1', isClickable: true },
      { label: 'Level 2', href: '/level2', isClickable: true },
      { label: 'Level 3', href: '/level3', isClickable: true },
      { label: 'Level 4', href: '/level4', isClickable: true },
      { label: 'Level 5', href: '/level5', isClickable: true },
      { label: 'Current', isClickable: false },
    ]

    store.dispatch(setBreadcrumbs(longBreadcrumbs))

    renderWithProviders(<EnhancedBreadcrumb maxItems={5} />)

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('...')).toBeInTheDocument()
    expect(screen.getByText('Current')).toBeInTheDocument()

    // Should not show middle items
    expect(screen.queryByText('Level 2')).not.toBeInTheDocument()
  })

  it('should show home icon when enabled', () => {
    store.dispatch(setBreadcrumbs([{ label: 'Home', href: '/', isClickable: true, icon: 'Home' }]))

    renderWithProviders(<EnhancedBreadcrumb showHomeIcon={true} />)

    // Home icon should be rendered (mocked as div with bg-muted)
    const homeIcon = screen.getByText('Home').previousElementSibling
    expect(homeIcon).toHaveClass('bg-muted')
  })
})

describe.skip('CompactBreadcrumb', () => {
  let store: ReturnType<typeof configureStore>
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    store = configureStore({
      reducer: {
        navigation: navigationSlice.reducer,
      },
    })

    user = userEvent.setup()

    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    })
  })

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <Provider store={store}>
        <MemoryRouter>
          <NavigationProvider>{component}</NavigationProvider>
        </MemoryRouter>
      </Provider>,
    )
  }

  it('should not render when no breadcrumbs', () => {
    const { container } = renderWithProviders(<CompactBreadcrumb />)
    expect(container.firstChild).toBeNull()
  })

  it('should render compact breadcrumb with parent and current', () => {
    store.dispatch(
      setBreadcrumbs([
        { label: 'Home', href: '/', isClickable: true },
        { label: 'Gallery', href: '/gallery', isClickable: true },
        { label: 'Featured', isClickable: false },
      ]),
    )

    renderWithProviders(<CompactBreadcrumb />)

    expect(screen.getByText('Gallery')).toBeInTheDocument()
    expect(screen.getByText('Featured')).toBeInTheDocument()
  })

  it('should handle back navigation', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    store.dispatch(
      setBreadcrumbs([
        { label: 'Home', href: '/', isClickable: true },
        { label: 'Gallery', href: '/gallery', isClickable: true },
        { label: 'Featured', isClickable: false },
      ]),
    )

    renderWithProviders(<CompactBreadcrumb />)

    const backButton = screen.getByText('Gallery')
    await user.click(backButton)

    expect(consoleSpy).toHaveBeenCalledWith(
      'Navigation Analytics:',
      expect.objectContaining({
        itemId: 'compact_breadcrumb_back',
        source: 'compact_breadcrumb',
      }),
    )

    consoleSpy.mockRestore()
  })
})
