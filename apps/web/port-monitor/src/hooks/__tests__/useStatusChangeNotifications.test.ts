import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { ServiceHealth } from '../../store/__types__'

const mockSuccess = vi.fn()
const mockError = vi.fn()

vi.mock('@repo/app-component-library', () => ({
  useToast: () => ({ success: mockSuccess, error: mockError }),
}))

const { useStatusChangeNotifications } = await import('../useStatusChangeNotifications')

function makeService(overrides: Partial<ServiceHealth> = {}): ServiceHealth {
  return {
    key: 'MAIN_APP_PORT',
    name: 'Main App',
    port: 8000,
    kind: 'frontend',
    status: 'healthy',
    responseTimeMs: 10,
    error: null,
    checkedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('useStatusChangeNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips initial load', () => {
    const services = [makeService()]
    renderHook(() => useStatusChangeNotifications(services))
    expect(mockSuccess).not.toHaveBeenCalled()
    expect(mockError).not.toHaveBeenCalled()
  })

  it('toasts success when unhealthy → healthy', () => {
    const { rerender } = renderHook(
      ({ services }) => useStatusChangeNotifications(services),
      { initialProps: { services: [makeService({ status: 'unhealthy' })] } },
    )

    rerender({ services: [makeService({ status: 'healthy' })] })

    expect(mockSuccess).toHaveBeenCalledWith('Main App is healthy', 'Port 8000 recovered')
  })

  it('toasts error when healthy → unhealthy', () => {
    const { rerender } = renderHook(
      ({ services }) => useStatusChangeNotifications(services),
      { initialProps: { services: [makeService({ status: 'healthy' })] } },
    )

    rerender({ services: [makeService({ status: 'unhealthy' })] })

    expect(mockError).toHaveBeenCalledWith('Main App is unhealthy', 'Port 8000 went down')
  })

  it('does not toast when status stays the same', () => {
    const { rerender } = renderHook(
      ({ services }) => useStatusChangeNotifications(services),
      { initialProps: { services: [makeService({ status: 'healthy' })] } },
    )

    rerender({ services: [makeService({ status: 'healthy' })] })

    expect(mockSuccess).not.toHaveBeenCalled()
    expect(mockError).not.toHaveBeenCalled()
  })

  it('handles undefined services', () => {
    renderHook(() => useStatusChangeNotifications(undefined))
    expect(mockSuccess).not.toHaveBeenCalled()
  })
})
