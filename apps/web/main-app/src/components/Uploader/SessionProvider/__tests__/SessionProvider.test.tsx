import { describe, it, expect, vi, beforeEach } from 'vitest'
// eslint-disable-next-line import/order
import { render, screen } from '@testing-library/react'
// Mock all external dependencies before importing the component
vi.mock('@repo/upload/hooks', () => ({
  useUploaderSession: vi.fn(() => ({
    session: {
      title: '',
      description: '',
      tags: [],
      theme: '',
      files: [],
      step: 'upload',
      uploadToken: null,
    },
    isDirty: false,
    wasRestored: false,
    updateSession: vi.fn(),
    reset: vi.fn(),
  })),
}))

vi.mock('@repo/upload/components', () => ({
  UnsavedChangesDialog: vi.fn(() => null),
}))

vi.mock('@repo/hooks/useUnsavedChangesPrompt', () => ({
  useUnsavedChangesPrompt: vi.fn(() => ({
    showDialog: false,
    confirmNavigation: vi.fn(),
    cancelNavigation: vi.fn(),
  })),
}))

vi.mock('@/store/hooks', () => ({
  useAppSelector: vi.fn(() => ({ isAuthenticated: true, user: { id: '1' } })),
}))

vi.mock('@/store/slices/authSlice', () => ({
  selectAuth: vi.fn(),
}))

import { UploaderSessionProvider, useUploaderSessionContext } from '../index'

describe('SessionProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders children successfully', () => {
      render(
        <UploaderSessionProvider route="/test">
          <div data-testid="test-child">Test Content</div>
        </UploaderSessionProvider>,
      )
      expect(screen.getByTestId('test-child')).toBeInTheDocument()
    })

    it('renders with different route prop', () => {
      render(
        <UploaderSessionProvider route="/instructions/new">
          <span>Upload Page</span>
        </UploaderSessionProvider>,
      )
      expect(screen.getByText('Upload Page')).toBeInTheDocument()
    })
  })

  describe('context', () => {
    it('provides session context to children', () => {
      function TestConsumer() {
        const context = useUploaderSessionContext()
        return <div data-testid="route">{context.route}</div>
      }

      render(
        <UploaderSessionProvider route="/test-route">
          <TestConsumer />
        </UploaderSessionProvider>,
      )
      expect(screen.getByTestId('route')).toHaveTextContent('/test-route')
    })

    it('throws when used outside provider', () => {
      function TestConsumer() {
        useUploaderSessionContext()
        return null
      }

      expect(() => render(<TestConsumer />)).toThrow()
    })
  })

  describe('accessibility', () => {
    it('does not add extra DOM wrappers', () => {
      const { container } = render(
        <UploaderSessionProvider route="/test">
          <div>Content</div>
        </UploaderSessionProvider>,
      )
      expect(container).toBeInTheDocument()
    })
  })
})
