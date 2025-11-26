import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DashboardModule } from '../DashboardModule'

// Mock Redux for this component test
vi.mock('react-redux', () => ({
  useSelector: vi.fn(),
  useDispatch: () => vi.fn(),
  Provider: ({ children }: any) => children,
}))

describe('DashboardModule', () => {
  it('renders the dashboard module title and description', () => {
    render(<DashboardModule />)

    expect(screen.getByRole('heading', { level: 1, name: /dashboard/i })).toBeInTheDocument()
    expect(screen.getByText(/your personal overview and account management/i)).toBeInTheDocument()
  })

  it('displays the dashboard icon in the title', () => {
    render(<DashboardModule />)

    const title = screen.getByRole('heading', { level: 1, name: /dashboard/i })
    expect(title).toBeInTheDocument()
    // The LayoutDashboard icon should be present in the title
    expect(title.querySelector('svg')).toBeInTheDocument()
  })

  it('shows the module loading placeholder', () => {
    render(<DashboardModule />)

    expect(screen.getByText(/dashboard module loading/i)).toBeInTheDocument()
    expect(screen.getByText(/user overview, statistics, recent activity/i)).toBeInTheDocument()
  })

  it('displays feature cards for dashboard functionality', () => {
    render(<DashboardModule />)

    // Use role selectors to target the h4 elements specifically
    expect(screen.getByRole('heading', { name: /usage analytics/i, level: 4 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /recent activity/i, level: 4 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /account settings/i, level: 4 })).toBeInTheDocument()
  })

  it('has proper semantic structure', () => {
    render(<DashboardModule />)

    // Should have main heading
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()

    // Should have feature card titles (using role selectors for h4 elements)
    expect(screen.getByRole('heading', { name: /usage analytics/i, level: 4 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /recent activity/i, level: 4 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /account settings/i, level: 4 })).toBeInTheDocument()
  })

  it('displays the large dashboard icon in the placeholder area', () => {
    render(<DashboardModule />)

    // The placeholder area should contain a large LayoutDashboard icon
    const placeholderArea = screen.getByText(/dashboard module loading/i).closest('div')
    expect(placeholderArea).toBeInTheDocument()
    expect(placeholderArea?.querySelector('svg')).toBeInTheDocument()
  })
})
