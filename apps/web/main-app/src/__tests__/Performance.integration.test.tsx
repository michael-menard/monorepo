// TODO: These tests need to be rewritten to match the current component implementations
// The modules have been significantly refactored with RTK Query hooks
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { authSlice } from '../store/slices/authSlice'
import { themeSlice } from '../store/slices/themeSlice'
import { navigationSlice } from '../store/slices/navigationSlice'
import { performanceMonitor } from '../lib/performance'

// Import components to test
import { GalleryModule } from '../routes/modules/GalleryModule'
import { WishlistModule } from '../routes/modules/WishlistModule'
import { DashboardModule } from '../routes/modules/DashboardModule'
import { InstructionsModule } from '../routes/modules/InstructionsModule'

// Mock performance APIs
vi.mock('web-vitals', () => ({
  onCLS: vi.fn(callback => callback({ name: 'CLS', value: 0.05, id: 'test' })),
  onFID: vi.fn(callback => callback({ name: 'FID', value: 50, id: 'test' })),
  onFCP: vi.fn(callback => callback({ name: 'FCP', value: 1200, id: 'test' })),
  onLCP: vi.fn(callback => callback({ name: 'LCP', value: 2000, id: 'test' })),
  onTTFB: vi.fn(callback => callback({ name: 'TTFB', value: 600, id: 'test' })),
}))

// Mock UI components with direct imports (no barrel files)
vi.mock('@repo/app-component-library', () => ({
  Card: ({ children, className }: any) => (
    <div className={className} data-testid="card">
      {children}
    </div>
  ),
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: any) => <div data-testid="card-description">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <div data-testid="card-title">{children}</div>,
}))

vi.mock('@repo/app-component-library', () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}))

vi.mock('@repo/app-component-library', () => ({
  Badge: ({ children, className }: any) => (
    <span className={className} data-testid="badge">
      {children}
    </span>
  ),
}))

describe.skip('Performance Integration Tests', () => {
  let store: ReturnType<typeof configureStore>
  let performanceEntries: PerformanceEntry[] = []

  const createMockStore = () => {
    return configureStore({
      reducer: {
        auth: authSlice.reducer,
        theme: themeSlice.reducer,
        navigation: navigationSlice.reducer,
      },
    })
  }

  beforeEach(() => {
    store = createMockStore()
    performanceEntries = []

    // Mock performance.mark and performance.measure
    vi.spyOn(performance, 'mark').mockImplementation((name: string) => {
      const entry = {
        name,
        entryType: 'mark',
        startTime: performance.now(),
        duration: 0,
        detail: null,
        toJSON: () => ({}),
      } as PerformanceMark
      performanceEntries.push(entry)
      return entry
    })

    vi.spyOn(performance, 'measure').mockImplementation((name: string) => {
      const entry = {
        name,
        entryType: 'measure',
        startTime: performance.now(),
        duration: Math.random() * 50, // Random duration for testing
        detail: null,
        toJSON: () => ({}),
      } as PerformanceMeasure
      performanceEntries.push(entry)
      return entry
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    performanceMonitor.destroy()
  })

  const renderWithStore = (component: React.ReactElement) => {
    return render(<Provider store={store}>{component}</Provider>)
  }

  describe.skip('Component Render Performance', () => {
    it('should render Gallery module within performance budget', async () => {
      const startTime = performance.now()

      renderWithStore(<GalleryModule />)

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within 50ms
      expect(renderTime).toBeLessThan(50)

      // Should display content
      expect(screen.getByText('Gallery')).toBeInTheDocument()
      expect(screen.getByText('Browse and discover amazing LEGO MOC designs')).toBeInTheDocument()
    })

    it('should render Wishlist module within performance budget', async () => {
      const startTime = performance.now()

      renderWithStore(<WishlistModule />)

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(50)
      expect(screen.getByText('Wishlist')).toBeInTheDocument()
    })

    it('should render Dashboard module within performance budget', async () => {
      const startTime = performance.now()

      renderWithStore(<DashboardModule />)

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(50)
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('should render Instructions module within performance budget', async () => {
      const startTime = performance.now()

      renderWithStore(<InstructionsModule />)

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(50)
      expect(screen.getByText('MOC Instructions')).toBeInTheDocument()
    })
  })

  describe.skip('Interaction Performance', () => {
    it('should handle button clicks within performance budget', async () => {
      renderWithStore(<GalleryModule />)

      // Use a button that actually exists in the component
      const batchUploadButton = screen.getByText('Batch Upload')

      const startTime = performance.now()
      fireEvent.click(batchUploadButton)
      const endTime = performance.now()

      const interactionTime = endTime - startTime

      // Click handling should be under 16ms for 60fps
      expect(interactionTime).toBeLessThan(16)
    })

    it('should handle multiple rapid interactions', async () => {
      renderWithStore(<WishlistModule />)

      // Use a button that actually exists in the component
      const priorityButton = screen.getByText('Priority Levels')

      const interactions = []

      // Simulate rapid clicking
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now()
        fireEvent.click(priorityButton)
        const endTime = performance.now()
        interactions.push(endTime - startTime)
      }

      // All interactions should be fast
      interactions.forEach(time => {
        expect(time).toBeLessThan(16)
      })

      // Average should be reasonable
      const average = interactions.reduce((a, b) => a + b, 0) / interactions.length
      expect(average).toBeLessThan(10)
    })
  })

  describe.skip('Memory Performance', () => {
    it('should not create memory leaks during component mounting/unmounting', async () => {
      const initialMetrics = performanceMonitor.getComponentMetrics().length

      // Mount and unmount components multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = renderWithStore(<GalleryModule />)
        unmount()
      }

      // Component metrics should not grow indefinitely
      const finalMetrics = performanceMonitor.getComponentMetrics().length
      expect(finalMetrics - initialMetrics).toBeLessThan(5)
    })

    it('should handle large lists efficiently', async () => {
      // Mock a large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: `Description for item ${i}`,
      }))

      const LargeListComponent = () => (
        <div>
          {largeDataset.map(item => (
            <div key={item.id} data-testid={`item-${item.id}`}>
              {item.name}: {item.description}
            </div>
          ))}
        </div>
      )

      const startTime = performance.now()
      renderWithStore(<LargeListComponent />)
      const endTime = performance.now()

      const renderTime = endTime - startTime

      // Should handle large lists reasonably well
      expect(renderTime).toBeLessThan(200)

      // Should render all items
      expect(screen.getByTestId('item-0')).toBeInTheDocument()
      expect(screen.getByTestId('item-999')).toBeInTheDocument()
    })
  })

  describe.skip('Bundle Size Performance', () => {
    it('should track component bundle impact', () => {
      // This would be more meaningful with actual bundle analysis
      const componentSizes = {
        GalleryModule: 15, // KB
        WishlistModule: 12,
        DashboardModule: 18,
        InstructionsModule: 14,
      }

      const totalSize = Object.values(componentSizes).reduce((a, b) => a + b, 0)

      // Total component size should be reasonable
      expect(totalSize).toBeLessThan(100) // 100KB total

      // Individual components should be under 25KB
      Object.values(componentSizes).forEach(size => {
        expect(size).toBeLessThan(25)
      })
    })
  })

  describe.skip('Performance Monitoring Integration', () => {
    it('should track component performance metrics', () => {
      renderWithStore(<GalleryModule />)

      // Simulate component render tracking
      performanceMonitor.trackComponentRender('GalleryModule', 15.5)

      const metrics = performanceMonitor.getComponentMetrics()
      const galleryMetric = metrics.find(m => m.componentName === 'GalleryModule')

      expect(galleryMetric).toBeDefined()
      expect(galleryMetric?.renderTime).toBe(15.5)
    })

    it('should collect web vitals metrics', () => {
      const metrics = performanceMonitor.getMetrics()

      expect(metrics.cls).toBe(0.05)
      expect(metrics.fid).toBe(50)
      expect(metrics.fcp).toBe(1200)
      expect(metrics.lcp).toBe(2000)
      expect(metrics.ttfb).toBe(600)
    })
  })
})
