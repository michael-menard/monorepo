import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

// Mock the config
vi.mock('./config/environment.js', () => ({
  config: {
    app: {
      name: 'LEGO MOC Instructions',
    },
  },
}))

// Mock UI components
vi.mock('@repo/ui', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

// Mock TanStack Router Link
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

describe('App', () => {
  it('renders the main heading', () => {
    render(<App />)
    expect(screen.getByText('LEGO MOC Instructions')).toBeInTheDocument()
  })

  it('renders the welcome message', () => {
    render(<App />)
    expect(screen.getByText('Welcome to the LEGO MOC Instructions application')).toBeInTheDocument()
  })

  it('renders navigation button to home', () => {
    render(<App />)
    expect(screen.getByText('Go to Home')).toBeInTheDocument()
  })

  it('has proper navigation link to home', () => {
    render(<App />)
    const homeLink = screen.getByRole('link', { name: /go to home/i })
    expect(homeLink).toHaveAttribute('href', '/')
  })
})
