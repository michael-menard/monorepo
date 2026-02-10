import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BuildStatusToggle } from '../index'

// Mock RTK Query hook
const mockUpdateBuildStatus = vi.fn()
const mockUnwrap = vi.fn()

let mockIsLoading = false

vi.mock('@repo/api-client/rtk/wishlist-gallery-api', () => ({
  useUpdateBuildStatusMutation: () => [
    (...args: unknown[]) => {
      mockUpdateBuildStatus(...args)
      return { unwrap: mockUnwrap }
    },
    { isLoading: mockIsLoading },
  ],
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

import { toast } from 'sonner'

describe('BuildStatusToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUnwrap.mockResolvedValue({})
    mockIsLoading = false
  })

  // AC2, AC5: Not Started state
  it('renders Not Started state with package icon', () => {
    render(
      <BuildStatusToggle
        itemId="test-id"
        currentStatus="not_started"
        itemTitle="Test Set"
      />,
    )
    expect(screen.getByText('Not Started')).toBeInTheDocument()
    expect(screen.getByRole('switch')).toBeInTheDocument()
  })

  // AC2: Building state
  it('renders Building state', () => {
    render(
      <BuildStatusToggle
        itemId="test-id"
        currentStatus="in_progress"
        itemTitle="Test Set"
      />,
    )
    expect(screen.getByText('Building')).toBeInTheDocument()
  })

  // AC2, AC4: Completed/Built state
  it('renders Built state', () => {
    render(
      <BuildStatusToggle
        itemId="test-id"
        currentStatus="completed"
        itemTitle="Test Set"
      />,
    )
    expect(screen.getByText('Built')).toBeInTheDocument()
  })

  // AC8: ARIA attributes
  it('has ARIA role=switch and aria-checked', () => {
    render(
      <BuildStatusToggle
        itemId="test-id"
        currentStatus="completed"
        itemTitle="Test Set"
      />,
    )
    const toggle = screen.getByRole('switch')
    expect(toggle).toHaveAttribute('aria-checked', 'true')
  })

  it('has aria-checked=false when not completed', () => {
    render(
      <BuildStatusToggle
        itemId="test-id"
        currentStatus="not_started"
        itemTitle="Test Set"
      />,
    )
    const toggle = screen.getByRole('switch')
    expect(toggle).toHaveAttribute('aria-checked', 'false')
  })

  // AC6: Click toggles
  it('calls mutation on click', async () => {
    render(
      <BuildStatusToggle
        itemId="test-id"
        currentStatus="not_started"
        itemTitle="Test Set"
      />,
    )
    await userEvent.click(screen.getByRole('switch'))
    expect(mockUpdateBuildStatus).toHaveBeenCalledWith({
      itemId: 'test-id',
      buildStatus: 'in_progress',
    })
  })

  // AC7: Keyboard
  it('toggles on Enter key', async () => {
    render(
      <BuildStatusToggle
        itemId="test-id"
        currentStatus="not_started"
        itemTitle="Test Set"
      />,
    )
    fireEvent.keyDown(screen.getByRole('switch'), { key: 'Enter' })
    expect(mockUpdateBuildStatus).toHaveBeenCalled()
  })

  it('toggles on Space key', async () => {
    render(
      <BuildStatusToggle
        itemId="test-id"
        currentStatus="not_started"
        itemTitle="Test Set"
      />,
    )
    fireEvent.keyDown(screen.getByRole('switch'), { key: ' ' })
    expect(mockUpdateBuildStatus).toHaveBeenCalled()
  })

  // AC32: Disabled during loading
  it('is disabled when disabled prop is true', () => {
    render(
      <BuildStatusToggle
        itemId="test-id"
        currentStatus="not_started"
        itemTitle="Test Set"
        disabled={true}
      />,
    )
    expect(screen.getByRole('switch')).toBeDisabled()
  })

  // AC18-19: Success toast with undo
  it('shows success toast with undo on successful toggle', async () => {
    mockUnwrap.mockResolvedValue({})
    render(
      <BuildStatusToggle
        itemId="test-id"
        currentStatus="not_started"
        itemTitle="Test Set"
      />,
    )
    await userEvent.click(screen.getByRole('switch'))
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Marked as Building',
        expect.objectContaining({
          duration: 5000,
          action: expect.objectContaining({ label: 'Undo' }),
        }),
      )
    })
  })

  // AC14: Error toast
  it('shows error toast on API failure', async () => {
    mockUnwrap.mockRejectedValue(new Error('API error'))
    render(
      <BuildStatusToggle
        itemId="test-id"
        currentStatus="not_started"
        itemTitle="Test Set"
      />,
    )
    await userEvent.click(screen.getByRole('switch'))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Couldn't update build status",
        expect.objectContaining({ duration: 7000 }),
      )
    })
  })

  // AC3: Cycles through statuses correctly
  it('cycles not_started -> in_progress -> completed -> not_started', async () => {
    const { rerender } = render(
      <BuildStatusToggle
        itemId="test-id"
        currentStatus="not_started"
        itemTitle="Test Set"
      />,
    )
    await userEvent.click(screen.getByRole('switch'))
    expect(mockUpdateBuildStatus).toHaveBeenCalledWith(
      expect.objectContaining({ buildStatus: 'in_progress' }),
    )

    vi.clearAllMocks()
    rerender(
      <BuildStatusToggle
        itemId="test-id"
        currentStatus="in_progress"
        itemTitle="Test Set"
      />,
    )
    await userEvent.click(screen.getByRole('switch'))
    expect(mockUpdateBuildStatus).toHaveBeenCalledWith(
      expect.objectContaining({ buildStatus: 'completed' }),
    )

    vi.clearAllMocks()
    rerender(
      <BuildStatusToggle
        itemId="test-id"
        currentStatus="completed"
        itemTitle="Test Set"
      />,
    )
    await userEvent.click(screen.getByRole('switch'))
    expect(mockUpdateBuildStatus).toHaveBeenCalledWith(
      expect.objectContaining({ buildStatus: 'not_started' }),
    )
  })

  // Null status defaults to not_started
  it('defaults to not_started when currentStatus is null', () => {
    render(
      <BuildStatusToggle
        itemId="test-id"
        currentStatus={null}
        itemTitle="Test Set"
      />,
    )
    expect(screen.getByText('Not Started')).toBeInTheDocument()
  })
})
