import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  useApiPerformance,
  useComponentPerformance,
  useImagePerformance,
  usePerformance,
} from '../hooks/usePerformance'

// Mock the performance service
vi.mock('../services/performance', () => ({
  performanceMonitor: {
    init: vi.fn(),
    getAnalytics: vi.fn(() => ({
      sessionId: 'test-session',
      pageViews: [],
      interactions: [],
      performance: [],
    })),
    trackPerformanceMetric: vi.fn(),
    trackInteraction: vi.fn(),
    trackEvent: vi.fn(),
  },
  trackPerformanceMetric: vi.fn(),
  trackInteraction: vi.fn(),
  trackEvent: vi.fn(),
  getPerformanceSummary: vi.fn(() => ({})),
}))

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => 1000),
}

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true,
})

// Test component for usePerformance hook
const TestComponent = () => {
  const { analytics, trackMetric, trackUserInteraction, trackCustomEvent } = usePerformance()

  return (
    <div>
      <div data-testid="session-id">{analytics?.sessionId}</div>
      <button onClick={() => trackMetric('test_metric', 100)} data-testid="track-metric">
        Track Metric
      </button>
      <button
        onClick={() => trackUserInteraction('click', 'test-button')}
        data-testid="track-interaction"
      >
        Track Interaction
      </button>
      <button
        onClick={() => trackCustomEvent('test_event', { test: true })}
        data-testid="track-event"
      >
        Track Event
      </button>
    </div>
  )
}

// Test component for useComponentPerformance hook
const TestComponentPerformance = () => {
  const { trackInteraction } = useComponentPerformance('TestComponent')

  return (
    <button
      onClick={() => trackInteraction('click', 'component-button')}
      data-testid="component-interaction"
    >
      Component Interaction
    </button>
  )
}

// Test component for useApiPerformance hook
const TestApiPerformance = () => {
  const { trackApiRequest } = useApiPerformance()

  const handleApiCall = async () => {
    await trackApiRequest(() => Promise.resolve({ data: 'success' }), '/api/test')
  }

  return (
    <button onClick={handleApiCall} data-testid="api-call">
      API Call
    </button>
  )
}

// Test component for useImagePerformance hook
const TestImagePerformance = () => {
  const { trackImage } = useImagePerformance()

  const handleImageLoad = () => {
    trackImage('https://example.com/test.jpg')
  }

  return (
    <button onClick={handleImageLoad} data-testid="image-load">
      Load Image
    </button>
  )
}

describe('Performance Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('usePerformance', () => {
    it('should provide performance monitoring functionality', () => {
      render(<TestComponent />)

      expect(screen.getByTestId('session-id')).toHaveTextContent('test-session')
    })

    it('should track metrics when button is clicked', async () => {
      const { trackPerformanceMetric } = await import('../services/performance')

      render(<TestComponent />)

      fireEvent.click(screen.getByTestId('track-metric'))

      expect(trackPerformanceMetric).toHaveBeenCalledWith('test_metric', 100)
    })

    it('should track interactions when button is clicked', async () => {
      const { trackInteraction } = await import('../services/performance')

      render(<TestComponent />)

      fireEvent.click(screen.getByTestId('track-interaction'))

      expect(trackInteraction).toHaveBeenCalledWith('click', 'test-button', undefined)
    })

    it('should track custom events when button is clicked', async () => {
      const { trackEvent } = await import('../services/performance')

      render(<TestComponent />)

      fireEvent.click(screen.getByTestId('track-event'))

      expect(trackEvent).toHaveBeenCalledWith('test_event', { test: true })
    })
  })

  describe('useComponentPerformance', () => {
    it('should track component-specific interactions', async () => {
      const { trackInteraction } = await import('../services/performance')

      render(<TestComponentPerformance />)

      fireEvent.click(screen.getByTestId('component-interaction'))

      expect(trackInteraction).toHaveBeenCalledWith(
        'click',
        'TestComponent:component-button',
        undefined,
      )
    })
  })

  describe('useApiPerformance', () => {
    it('should track API call performance', async () => {
      const { trackPerformanceMetric, trackEvent } = await import('../services/performance')

      render(<TestApiPerformance />)

      fireEvent.click(screen.getByTestId('api-call'))

      await waitFor(() => {
        expect(trackPerformanceMetric).toHaveBeenCalledWith(
          '/api/test_api_call',
          expect.any(Number),
        )
        expect(trackEvent).toHaveBeenCalledWith('api_call', {
          endpoint: '/api/test',
          duration: expect.any(Number),
          status: 200,
        })
      })
    })

    it('should track API call errors', async () => {
      const { trackPerformanceMetric, trackEvent } = await import('../services/performance')

      const TestApiError = () => {
        const { trackApiRequest } = useApiPerformance()

        const handleApiCall = async () => {
          try {
            await trackApiRequest(
              () => Promise.reject(new Response('Error', { status: 500 })),
              '/api/error',
            )
          } catch (error) {
            // Error is expected
          }
        }

        return (
          <button onClick={handleApiCall} data-testid="api-error">
            API Error
          </button>
        )
      }

      render(<TestApiError />)

      fireEvent.click(screen.getByTestId('api-error'))

      await waitFor(() => {
        expect(trackPerformanceMetric).toHaveBeenCalledWith(
          '/api/error_api_call',
          expect.any(Number),
        )
        expect(trackEvent).toHaveBeenCalledWith('api_call', {
          endpoint: '/api/error',
          duration: expect.any(Number),
          status: 500,
        })
      })
    })
  })

  describe('useImagePerformance', () => {
    it('should track image load performance', async () => {
      const { trackPerformanceMetric, trackEvent } = await import('../services/performance')

      // Mock Image constructor
      const mockImage = vi.fn()
      mockImage.mockImplementation(() => ({
        onload: null,
        onerror: null,
        src: '',
      }))

      global.Image = mockImage as any

      render(<TestImagePerformance />)

      fireEvent.click(screen.getByTestId('image-load'))

      // Simulate image load
      const imageInstance = mockImage.mock.results[0].value
      imageInstance.onload()

      await waitFor(() => {
        expect(trackPerformanceMetric).toHaveBeenCalledWith('image_load_time', expect.any(Number))
        expect(trackEvent).toHaveBeenCalledWith('image_load', {
          imageUrl: 'https://example.com/test.jpg',
          loadTime: expect.any(Number),
        })
      })
    })

    it('should track image load errors', async () => {
      const { trackPerformanceMetric, trackEvent } = await import('../services/performance')

      // Mock Image constructor
      const mockImage = vi.fn()
      mockImage.mockImplementation(() => ({
        onload: null,
        onerror: null,
        src: '',
      }))

      global.Image = mockImage as any

      render(<TestImagePerformance />)

      fireEvent.click(screen.getByTestId('image-load'))

      // Simulate image error
      const imageInstance = mockImage.mock.results[0].value
      imageInstance.onerror()

      await waitFor(() => {
        expect(trackPerformanceMetric).toHaveBeenCalledWith('image_load_time', expect.any(Number))
        expect(trackEvent).toHaveBeenCalledWith('image_load', {
          imageUrl: 'https://example.com/test.jpg',
          loadTime: expect.any(Number),
        })
      })
    })
  })
})
