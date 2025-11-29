import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ResendCodeButton } from '../ResendCodeButton'

describe('ResendCodeButton', () => {
  const mockOnResend = vi.fn()
  const mockOnSuccess = vi.fn()
  const mockOnError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })

    // Mock sessionStorage
    const sessionStorageMock = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    }
    Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders with default text when not in cooldown', () => {
    render(<ResendCodeButton onResend={mockOnResend} />)

    expect(screen.getByText("Didn't receive a code? Resend")).toBeInTheDocument()
  })

  it('renders with custom active text', () => {
    render(<ResendCodeButton onResend={mockOnResend} activeText="Request new code" />)

    expect(screen.getByText('Request new code')).toBeInTheDocument()
  })

  it('calls onResend when clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockOnResend.mockResolvedValue({ success: true })

    render(<ResendCodeButton onResend={mockOnResend} />)

    const button = screen.getByTestId('resend-code-button')
    await user.click(button)

    expect(mockOnResend).toHaveBeenCalledTimes(1)
  })

  it('shows loading state during request', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockOnResend.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100)),
    )

    render(<ResendCodeButton onResend={mockOnResend} />)

    const button = screen.getByTestId('resend-code-button')
    await user.click(button)

    expect(screen.getByText('Sending...')).toBeInTheDocument()
    expect(button).toBeDisabled()
  })

  it('calls onSuccess callback after successful resend', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockOnResend.mockResolvedValue({ success: true })

    render(
      <ResendCodeButton onResend={mockOnResend} onSuccess={mockOnSuccess} onError={mockOnError} />,
    )

    const button = screen.getByTestId('resend-code-button')
    await user.click(button)

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledTimes(1)
    })
    expect(mockOnError).not.toHaveBeenCalled()
  })

  it('calls onError callback after failed resend', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockOnResend.mockResolvedValue({ success: false, error: 'Rate limit exceeded' })

    render(
      <ResendCodeButton onResend={mockOnResend} onSuccess={mockOnSuccess} onError={mockOnError} />,
    )

    const button = screen.getByTestId('resend-code-button')
    await user.click(button)

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Rate limit exceeded')
    })
    expect(mockOnSuccess).not.toHaveBeenCalled()
  })

  it('shows cooldown timer after successful resend', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockOnResend.mockResolvedValue({ success: true })

    render(<ResendCodeButton onResend={mockOnResend} baseCooldownSeconds={60} />)

    const button = screen.getByTestId('resend-code-button')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByText(/Resend code in \d+s/)).toBeInTheDocument()
    })
  })

  it('disables button during cooldown', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockOnResend.mockResolvedValue({ success: true })

    render(<ResendCodeButton onResend={mockOnResend} baseCooldownSeconds={60} />)

    const button = screen.getByTestId('resend-code-button')
    await user.click(button)

    await waitFor(() => {
      expect(button).toBeDisabled()
    })
  })

  it('re-enables button after cooldown expires', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockOnResend.mockResolvedValue({ success: true })

    render(<ResendCodeButton onResend={mockOnResend} baseCooldownSeconds={5} />)

    const button = screen.getByTestId('resend-code-button')
    await user.click(button)

    // Button should be disabled during cooldown
    await waitFor(() => {
      expect(button).toBeDisabled()
    })

    // Advance time past cooldown
    await act(async () => {
      vi.advanceTimersByTime(6000)
    })

    // Button should be enabled again
    await waitFor(() => {
      expect(button).not.toBeDisabled()
    })
  })

  it('respects disabled prop', () => {
    render(<ResendCodeButton onResend={mockOnResend} disabled={true} />)

    const button = screen.getByTestId('resend-code-button')
    expect(button).toBeDisabled()
  })

  it('does not call onResend when disabled', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(<ResendCodeButton onResend={mockOnResend} disabled={true} />)

    const button = screen.getByTestId('resend-code-button')
    await user.click(button)

    expect(mockOnResend).not.toHaveBeenCalled()
  })

  it('handles exception from onResend', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockOnResend.mockRejectedValue(new Error('Network error'))

    render(
      <ResendCodeButton onResend={mockOnResend} onSuccess={mockOnSuccess} onError={mockOnError} />,
    )

    const button = screen.getByTestId('resend-code-button')
    await user.click(button)

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Network error')
    })
    expect(mockOnSuccess).not.toHaveBeenCalled()
  })

  it('uses custom data-testid', () => {
    render(<ResendCodeButton onResend={mockOnResend} data-testid="custom-resend-button" />)

    expect(screen.getByTestId('custom-resend-button')).toBeInTheDocument()
  })

  it('persists cooldown to sessionStorage', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockOnResend.mockResolvedValue({ success: true })

    render(<ResendCodeButton onResend={mockOnResend} baseCooldownSeconds={60} />)

    const button = screen.getByTestId('resend-code-button')
    await user.click(button)

    await waitFor(() => {
      expect(window.sessionStorage.setItem).toHaveBeenCalled()
    })
  })

  it('restores cooldown from sessionStorage on mount', () => {
    // Mock sessionStorage to return a future expiration time
    const futureExpiration = Date.now() + 30000 // 30 seconds from now
    vi.spyOn(window.sessionStorage, 'getItem').mockReturnValue(futureExpiration.toString())

    render(<ResendCodeButton onResend={mockOnResend} />)

    // Should show cooldown timer
    expect(screen.getByText(/Resend code in \d+s/)).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(<ResendCodeButton onResend={mockOnResend} />)

    const button = screen.getByTestId('resend-code-button')
    expect(button).toHaveAttribute('aria-live', 'polite')
    expect(button).toHaveAttribute('type', 'button')
  })

  it('applies custom className', () => {
    render(<ResendCodeButton onResend={mockOnResend} className="custom-class" />)

    const button = screen.getByTestId('resend-code-button')
    expect(button).toHaveClass('custom-class')
  })

  // Exponential backoff tests
  describe('exponential backoff', () => {
    it('uses base cooldown for first attempt', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      mockOnResend.mockResolvedValue({ success: true })

      // Mock getItem to return null for attempts (first attempt)
      vi.spyOn(window.sessionStorage, 'getItem').mockReturnValue(null)

      render(<ResendCodeButton onResend={mockOnResend} baseCooldownSeconds={60} />)

      const button = screen.getByTestId('resend-code-button')
      await user.click(button)

      // Check that setItem was called with cooldown expiration ~60s from now
      await waitFor(() => {
        const setItemCalls = vi.mocked(window.sessionStorage.setItem).mock.calls
        const cooldownCall = setItemCalls.find(call => call[0] === 'auth_resend_cooldown')
        expect(cooldownCall).toBeDefined()

        if (cooldownCall) {
          const expiresAt = parseInt(cooldownCall[1], 10)
          const expectedExpiry = Date.now() + 60 * 1000
          // Allow 1 second tolerance
          expect(Math.abs(expiresAt - expectedExpiry)).toBeLessThan(1000)
        }
      })
    })

    it('increments attempt count on successful resend', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      mockOnResend.mockResolvedValue({ success: true })

      render(<ResendCodeButton onResend={mockOnResend} />)

      const button = screen.getByTestId('resend-code-button')
      await user.click(button)

      await waitFor(() => {
        const setItemCalls = vi.mocked(window.sessionStorage.setItem).mock.calls
        const attemptCall = setItemCalls.find(call => call[0] === 'auth_resend_attempts')
        expect(attemptCall).toBeDefined()
        expect(attemptCall?.[1]).toBe('1')
      })
    })

    it('stores attempt reset time on successful resend', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      mockOnResend.mockResolvedValue({ success: true })

      render(<ResendCodeButton onResend={mockOnResend} />)

      const button = screen.getByTestId('resend-code-button')
      await user.click(button)

      await waitFor(() => {
        const setItemCalls = vi.mocked(window.sessionStorage.setItem).mock.calls
        const resetCall = setItemCalls.find(call => call[0] === 'auth_resend_attempt_reset')
        expect(resetCall).toBeDefined()
      })
    })

    it('formats long cooldowns as minutes:seconds', async () => {
      // Mock sessionStorage to simulate a long cooldown (2 minutes remaining)
      const futureExpiration = Date.now() + 120000 // 120 seconds from now
      vi.spyOn(window.sessionStorage, 'getItem').mockImplementation((key: string) => {
        if (key === 'auth_resend_cooldown') return futureExpiration.toString()
        return null
      })

      render(<ResendCodeButton onResend={mockOnResend} />)

      // Should show in minutes:seconds format
      expect(screen.getByText(/Resend code in 2:00/)).toBeInTheDocument()
    })

    it('caps cooldown at maximum value', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      mockOnResend.mockResolvedValue({ success: true })

      // Simulate 10th attempt (would be 60 * 2^9 = 30720s without cap)
      vi.spyOn(window.sessionStorage, 'getItem').mockImplementation((key: string) => {
        if (key === 'auth_resend_attempts') return '9'
        if (key === 'auth_resend_attempt_reset') return (Date.now() + 1000000).toString()
        return null
      })

      render(
        <ResendCodeButton
          onResend={mockOnResend}
          baseCooldownSeconds={60}
          maxCooldownSeconds={600}
        />,
      )

      const button = screen.getByTestId('resend-code-button')
      await user.click(button)

      await waitFor(() => {
        const setItemCalls = vi.mocked(window.sessionStorage.setItem).mock.calls
        const cooldownCall = setItemCalls.find(call => call[0] === 'auth_resend_cooldown')
        expect(cooldownCall).toBeDefined()

        if (cooldownCall) {
          const expiresAt = parseInt(cooldownCall[1], 10)
          const expectedMaxExpiry = Date.now() + 600 * 1000
          // Should be capped at 600 seconds
          expect(Math.abs(expiresAt - expectedMaxExpiry)).toBeLessThan(1000)
        }
      })
    })

    it('uses custom base and max cooldown values', () => {
      render(
        <ResendCodeButton
          onResend={mockOnResend}
          baseCooldownSeconds={30}
          maxCooldownSeconds={300}
        />,
      )

      // Component should render without errors
      expect(screen.getByTestId('resend-code-button')).toBeInTheDocument()
    })
  })
})
