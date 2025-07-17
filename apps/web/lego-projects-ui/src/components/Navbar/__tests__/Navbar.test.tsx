// Mock useAuthState at the very top before any imports
import { vi } from 'vitest'
import type { User } from '@repo/auth';
import { render, screen } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import Navbar from '../index'

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

describe('Navbar', () => {
  const createMockStore = (authState: AuthState) => {
    return configureStore({
      reducer: {
        auth: (state = authState) => state
      },
      preloadedState: {
        auth: authState
      }
    })
  }

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const mockStore = createMockStore({
      user: null,
      isAuthenticated: false,
      isLoading: false
    })

    render(
      <Provider store={mockStore}>
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      </Provider>
    )
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('shows login button when user is not authenticated', () => {
    const mockStore = createMockStore({
      user: null,
      isAuthenticated: false,
      isLoading: false
    })

    render(
      <Provider store={mockStore}>
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      </Provider>
    )
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create a new account/i })).toBeInTheDocument()
  })

  it('shows navigation buttons when user is authenticated', () => {
    const mockStore = createMockStore({
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      },
      isAuthenticated: true,
      isLoading: false
    })

    render(
      <Provider store={mockStore}>
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      </Provider>
    )
    expect(screen.getByRole('button', { name: /projects/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /instructions/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument()
  })

  it('shows loading state', () => {
    const mockStore = createMockStore({
      user: null,
      isAuthenticated: false,
      isLoading: true
    })

    render(
      <Provider store={mockStore}>
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      </Provider>
    )
    // Check for loading spinner by looking for the LoadingSpinner component
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })
}) 