import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CacheDashboard } from '../CacheDashboard'

// Mock hooks
const mockStatistics = {
  usagePatterns: [
    {
      key: 'user:123',
      accessCount: 10,
      userSessions: new Set(['session1', 'session2']),
      hitRate: 0.85,
      lastAccessed: Date.now(),
    },
  ],
  strategies: [
    {
      name: 'User Cache',
      priority: 1,
      ttl: 60000,
      prefetchTrigger: 0.8,
      compressionEnabled: true,
      encryptionEnabled: false,
    },
  ],
}

const mockInsights = [
  {
    key: 'user:123',
    recommendedAction: 'prefetch',
    reasoning: 'High access frequency detected',
    confidence: 0.85,
    predictedNextAccess: 5000,
  },
]

const mockPerformance = {
  hitRate: 0.85,
  totalRequests: 1000,
  averageResponseTime: 50,
}

const mockInvalidatePattern = vi.fn()
const mockWarmCache = vi.fn()

vi.mock('@/hooks/useIntelligentCache', () => ({
  useCacheStatistics: () => ({
    statistics: mockStatistics,
    insights: mockInsights,
    performance: mockPerformance,
  }),
  useCacheManager: () => ({
    invalidatePattern: mockInvalidatePattern,
    warmCache: mockWarmCache,
  }),
}))

// Mock @repo/app-component-library
vi.mock('@repo/app-component-library', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardDescription: ({ children, className }: any) => <p className={className}>{children}</p>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>,
  Button: ({ children, onClick, variant, size, className }: any) => (
    <button onClick={onClick} data-variant={variant} data-size={size} className={className}>
      {children}
    </button>
  ),
  Badge: ({ children, variant, className }: any) => (
    <span data-variant={variant} className={className}>
      {children}
    </span>
  ),
  Tabs: ({ children, defaultValue, className }: any) => (
    <div data-default-value={defaultValue} className={className}>
      {children}
    </div>
  ),
  TabsContent: ({ children, value, className }: any) => (
    <div data-value={value} className={className}>
      {children}
    </div>
  ),
  TabsList: ({ children, className }: any) => <div className={className}>{children}</div>,
  TabsTrigger: ({ children, value, className }: any) => (
    <button data-value={value} className={className}>
      {children}
    </button>
  ),
  Progress: ({ value, className }: any) => (
    <div data-testid="progress" data-value={value} className={className}>
      Progress: {value}%
    </div>
  ),
}))

// Mock lucide-react
vi.mock('lucide-react', async () => {
  const React = await import('react')
  return {
    BarChart3: () => React.createElement('svg', { 'data-testid': 'bar-chart-icon' }),
    TrendingUp: () => React.createElement('svg', { 'data-testid': 'trending-up-icon' }),
    Zap: () => React.createElement('svg', { 'data-testid': 'zap-icon' }),
    AlertTriangle: () => React.createElement('svg', { 'data-testid': 'alert-triangle-icon' }),
    RefreshCw: () => React.createElement('svg', { 'data-testid': 'refresh-cw-icon' }),
    Database: () => React.createElement('svg', { 'data-testid': 'database-icon' }),
    Clock: () => React.createElement('svg', { 'data-testid': 'clock-icon' }),
    Target: () => React.createElement('svg', { 'data-testid': 'target-icon' }),
    Brain: () => React.createElement('svg', { 'data-testid': 'brain-icon' }),
    Activity: () => React.createElement('svg', { 'data-testid': 'activity-icon' }),
  }
})

describe('CacheDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render the dashboard title', () => {
      render(<CacheDashboard />)

      expect(screen.getByText('Intelligent Cache Dashboard')).toBeInTheDocument()
    })

    it('should render the dashboard description', () => {
      render(<CacheDashboard />)

      expect(
        screen.getByText('Real-time cache performance monitoring and optimization'),
      ).toBeInTheDocument()
    })

    it('should render with mock statistics data', () => {
      render(<CacheDashboard />)

      // Check for hit rate
      expect(screen.getByText('Hit Rate')).toBeInTheDocument()
      expect(screen.getByText('85.0%')).toBeInTheDocument()

      // Check for total requests
      expect(screen.getByText('Total Requests')).toBeInTheDocument()
      expect(screen.getByText('1,000')).toBeInTheDocument()

      // Check for average response time
      expect(screen.getByText('Avg Response Time')).toBeInTheDocument()
      expect(screen.getByText('50.0ms')).toBeInTheDocument()

      // Check for AI insights (multiple instances, so use getAllByText)
      const aiInsightsElements = screen.getAllByText('AI Insights')
      expect(aiInsightsElements.length).toBeGreaterThan(0)
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('should render action buttons', () => {
      render(<CacheDashboard />)

      expect(screen.getByText('Clear User Cache')).toBeInTheDocument()
      expect(screen.getByText('Warm Cache')).toBeInTheDocument()
    })

    it('should render database icon', () => {
      render(<CacheDashboard />)

      expect(screen.getByTestId('database-icon')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should render performance cards with proper structure', () => {
      render(<CacheDashboard />)

      expect(screen.getByText('Hit Rate')).toBeInTheDocument()
      expect(screen.getByText('Total Requests')).toBeInTheDocument()
      expect(screen.getByText('Avg Response Time')).toBeInTheDocument()
      // AI Insights appears multiple times (card + tab), use getAllByText
      const aiInsightsElements = screen.getAllByText('AI Insights')
      expect(aiInsightsElements.length).toBeGreaterThan(0)
    })

    it('should render progress bars', () => {
      render(<CacheDashboard />)

      const progressBars = screen.getAllByTestId('progress')
      expect(progressBars.length).toBeGreaterThan(0)
    })
  })
})
