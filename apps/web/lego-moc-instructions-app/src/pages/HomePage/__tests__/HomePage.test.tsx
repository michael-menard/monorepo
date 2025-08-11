import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import HomePage from '../index'

// Mock the config
vi.mock('../../../config/environment.js', () => ({
  config: {
    app: {
      name: 'LEGO MOC Instructions'
    }
  }
}))

// Mock UI components
vi.mock('@repo/ui', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardDescription: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}))

// Mock TanStack Router Link
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  )
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  BookOpen: () => <span>BookOpen</span>,
  Download: () => <span>Download</span>,
  Heart: () => <span>Heart</span>,
  Moon: () => <span>Moon</span>,
  Sun: () => <span>Sun</span>,
  Search: () => <span>Search</span>,
  Shield: () => <span>Shield</span>,
  Star: () => <span>Star</span>,
  Upload: () => <span>Upload</span>,
  User: () => <span>User</span>,
  Users: () => <span>Users</span>,
  Zap: () => <span>Zap</span>,
}))

describe('HomePage', () => {
  it('renders the main heading', () => {
    render(<HomePage />)
    expect(screen.getByText('LEGO MOC Instructions')).toBeInTheDocument()
  })

  it('renders the hero description', () => {
    render(<HomePage />)
    expect(screen.getByText(/Discover, build, and share custom LEGO MOC instructions/)).toBeInTheDocument()
  })

  it('renders navigation buttons for unauthenticated users', () => {
    render(<HomePage />)
    expect(screen.getByText('Browse MOCs')).toBeInTheDocument()
    expect(screen.getByText('Sign Up')).toBeInTheDocument()
  })

  it('renders feature cards', () => {
    render(<HomePage />)
    expect(screen.getByText('Browse MOC Instructions')).toBeInTheDocument()
    expect(screen.getByText('Personal Wishlist')).toBeInTheDocument()
    expect(screen.getByText('User Profiles')).toBeInTheDocument()
    expect(screen.getByText('Share Your MOCs')).toBeInTheDocument()
  })

  it('renders stats section', () => {
    render(<HomePage />)
    expect(screen.getByText('10,000+')).toBeInTheDocument()
    expect(screen.getByText('5,000+')).toBeInTheDocument()
    expect(screen.getByText('50,000+')).toBeInTheDocument()
    expect(screen.getByText('4.8★')).toBeInTheDocument()
  })

  it('renders why choose us section', () => {
    render(<HomePage />)
    expect(screen.getByText('Why Choose Our Platform?')).toBeInTheDocument()
    expect(screen.getByText('Secure & Reliable')).toBeInTheDocument()
    expect(screen.getByText('Lightning Fast')).toBeInTheDocument()
    expect(screen.getByText('Community Driven')).toBeInTheDocument()
  })

  it('renders call to action section', () => {
    render(<HomePage />)
    expect(screen.getByText('Ready to Start Building?')).toBeInTheDocument()
    expect(screen.getByText('Start Browsing')).toBeInTheDocument()
  })

  it('shows login required for protected features when not authenticated', () => {
    render(<HomePage />)
    const loginRequiredButtons = screen.getAllByText('Login Required')
    expect(loginRequiredButtons.length).toBeGreaterThan(0)
  })

  it('has proper navigation links', () => {
    render(<HomePage />)
    const browseLink = screen.getByRole('link', { name: /browse mocs/i })
    expect(browseLink).toHaveAttribute('href', '/moc-gallery')
  })
}) 