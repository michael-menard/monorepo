import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdminModule } from '../AdminModule'

vi.mock('@tanstack/react-router', () => ({
  useParams: vi.fn(),
}))

vi.mock('../pages/AdminUsersPage', () => ({
  AdminUsersPage: vi.fn(() => <div data-testid="admin-users-page">Admin Users Page</div>),
}))

vi.mock('../pages/AdminUserDetailPage', () => ({
  AdminUserDetailPage: vi.fn(({ userId }: { userId: string }) => (
    <div data-testid="admin-user-detail-page">User Detail: {userId}</div>
  )),
}))

vi.mock('lucide-react', async () => {
  const React = await import('react')
  return {
    Loader2: vi.fn(props => React.createElement('svg', { 'data-testid': 'loader-icon', ...props })),
  }
})

describe('AdminModule', () => {
  let useParams: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()
    const router = await import('@tanstack/react-router')
    useParams = vi.mocked(router.useParams)
  })

  describe('rendering', () => {
    it('renders AdminUsersPage when no userId param', async () => {
      useParams.mockReturnValue({})
      render(<AdminModule />)
      expect(await screen.findByTestId('admin-users-page')).toBeInTheDocument()
    })

    it('renders AdminUserDetailPage when userId param provided', async () => {
      useParams.mockReturnValue({ userId: 'user-123' })
      render(<AdminModule />)
      const detailPage = await screen.findByTestId('admin-user-detail-page')
      expect(detailPage).toBeInTheDocument()
      expect(detailPage).toHaveTextContent('User Detail: user-123')
    })
  })

  describe('accessibility', () => {
    it('renders content within a landmark container', () => {
      useParams.mockReturnValue({})
      const { container } = render(<AdminModule />)
      const mainContainer = container.querySelector('.container')
      expect(mainContainer).toBeInTheDocument()
    })
  })
})
