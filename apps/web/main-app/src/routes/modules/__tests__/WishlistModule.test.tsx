import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import * as React from 'react'

// Mock @repo/app-component-library with cn for LoadingPage
vi.mock('@repo/app-component-library', async () => {
  const actual = await vi.importActual('@repo/app-component-library')
  return {
    ...actual,
    cn: (...classes: (string | undefined | boolean)[]) => classes.filter(Boolean).join(' '),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
    useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
  }
})

// Mock the lazy-loaded module
vi.mock('@repo/app-wishlist-gallery', () => ({
  default: () =>
    React.createElement('div', null, [
      React.createElement('h1', { key: 'h1' }, 'Wishlist'),
      React.createElement('p', { key: 'p' }, 'Browse your wishlist items'),
    ]),
}))

// Import after mocks
import { WishlistModule } from '../WishlistModule'

describe('WishlistModule', () => {
  it('renders the wishlist gallery page after loading', async () => {
    render(<WishlistModule />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /wishlist/i })).toBeInTheDocument()
      expect(screen.getByText(/browse your wishlist items/i)).toBeInTheDocument()
    })
  })

  it('has proper semantic structure', async () => {
    render(<WishlistModule />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })
  })
})
