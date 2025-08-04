# Performance Monitoring and Analytics

This document describes the comprehensive performance monitoring and analytics system implemented in the LEGO MOC Instructions application.

## Overview

The performance monitoring system provides:

- **Core Web Vitals tracking** (CLS, FID, FCP, LCP, TTFB, INP)
- **Custom performance metrics** tracking
- **User interaction analytics**
- **Page view and route change tracking**
- **API call performance monitoring**
- **Image load performance tracking**
- **Real-time performance monitoring UI** (development mode)
- **Configurable privacy and sampling settings**

## Architecture

### Core Components

1. **PerformanceMonitor Service** (`src/services/performance.ts`)
   - Singleton service that manages all performance tracking
   - Handles data collection, rating, and analytics sending
   - Uses Performance Observer API for Core Web Vitals

2. **Performance Hooks** (`src/hooks/usePerformance.ts`)
   - React hooks for easy integration with components
   - Provides specialized hooks for different tracking needs
   - Manages component lifecycle and performance data

3. **Performance Provider** (`src/providers/PerformanceProvider.tsx`)
   - React context provider for app-wide performance monitoring
   - Initializes monitoring on app startup
   - Provides performance context to all components

4. **Performance Monitor UI** (`src/components/PerformanceMonitor/index.tsx`)
   - Real-time performance dashboard (development mode)
   - Shows current metrics, session info, and performance summary
   - Toggleable and configurable

5. **Configuration System** (`src/config/performance.ts`)
   - Environment-specific configuration
   - Privacy controls and sampling settings
   - Customizable thresholds and tracking options

## Quick Start

### Basic Usage

The performance monitoring is automatically initialized when the app starts. The `PerformanceProvider` wraps the entire application and begins tracking immediately.

```tsx
// In main.tsx - already implemented
<PerformanceProvider>
  <RouterProvider router={router} />
</PerformanceProvider>
```

### Using Performance Hooks

```tsx
import { usePerformance, useComponentPerformance, useApiPerformance } from '../hooks/usePerformance'

// Basic performance tracking
const MyComponent = () => {
  const { trackMetric, trackUserInteraction, analytics } = usePerformance()
  
  const handleClick = () => {
    trackUserInteraction('click', 'my-button', { customData: 'value' })
  }
  
  return <button onClick={handleClick}>Click me</button>
}

// Component-specific tracking
const MyComponent = () => {
  const { trackInteraction } = useComponentPerformance('MyComponent')
  
  const handleClick = () => {
    trackInteraction('click', 'button', { data: 'value' })
  }
  
  return <button onClick={handleClick}>Click me</button>
}

// API performance tracking
const MyComponent = () => {
  const { trackApiRequest } = useApiPerformance()
  
  const fetchData = async () => {
    const result = await trackApiRequest(
      () => fetch('/api/data'),
      '/api/data'
    )
    return result
  }
  
  return <button onClick={fetchData}>Fetch Data</button>
}
```

### Manual Performance Tracking

```tsx
import { trackPerformanceMetric, trackEvent, trackInteraction } from '../services/performance'

// Track custom performance metric
trackPerformanceMetric('custom_metric', 150)

// Track custom event
trackEvent('user_action', { action: 'save', timestamp: Date.now() })

// Track user interaction
trackInteraction('click', 'save-button', { formId: 'profile' })
```

## Configuration

### Environment Configuration

The system automatically configures itself based on the environment:

- **Development**: Console logging enabled, monitor UI visible, no analytics sending
- **Production**: Analytics sending enabled, no console logging, no monitor UI
- **Test**: All tracking disabled

### Custom Configuration

You can customize the performance monitoring behavior:

```tsx
// In your app initialization
import { getPerformanceConfig } from './config/performance'

const config = getPerformanceConfig()
config.tracking.customMetrics = true
config.thresholds.FCP.good = 1500 // Custom threshold
```

### Privacy Settings

```tsx
// Respect user privacy preferences
config.privacy.respectDNT = true // Respect Do Not Track
config.privacy.excludePII = true // Exclude personally identifiable information
config.privacy.anonymizeUserAgent = false // Keep user agent for debugging
```

### Sampling Configuration

```tsx
// Enable sampling to reduce data volume
config.sampling.enabled = true
config.sampling.rate = 0.1 // 10% of sessions
```

## Metrics and Thresholds

### Core Web Vitals

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| CLS    | ≤ 0.1 | ≤ 0.25 | > 0.25 |
| FID    | ≤ 100ms | ≤ 300ms | > 300ms |
| FCP    | ≤ 1800ms | ≤ 3000ms | > 3000ms |
| LCP    | ≤ 2500ms | ≤ 4000ms | > 4000ms |
| TTFB   | ≤ 800ms | ≤ 1800ms | > 1800ms |
| INP    | ≤ 200ms | ≤ 500ms | > 500ms |

### Custom Metrics

You can track any custom performance metric:

```tsx
// Track component render time
trackPerformanceMetric('component_render_time', 45)

// Track API response time
trackPerformanceMetric('api_response_time', 1200)

// Track image load time
trackPerformanceMetric('image_load_time', 800)
```

## Analytics Data Structure

### Performance Metrics

```typescript
interface PerformanceMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  timestamp: number
  url: string
  userAgent?: string
}
```

### User Analytics

```typescript
interface UserAnalytics {
  sessionId: string
  userId?: string
  pageViews: Array<{
    path: string
    timestamp: number
    loadTime: number
  }>
  interactions: Array<{
    type: string
    target: string
    timestamp: number
  }>
  performance: PerformanceMetric[]
}
```

## Development Tools

### Performance Monitor UI

In development mode, a performance monitor appears in the bottom-right corner showing:

- Current session information
- Real-time performance metrics
- Recent interactions
- Performance summary statistics
- Quick actions (log to console, etc.)

### Console Logging

In development mode, all performance data is logged to the console:

```
[Performance Analytics] performance: {
  type: 'performance',
  sessionId: '1234567890-abc123',
  timestamp: 1234567890,
  url: 'http://localhost:3000/page',
  data: {
    name: 'FCP',
    value: 1200,
    rating: 'good'
  }
}
```

## Production Analytics

### Analytics Endpoint

In production, analytics data is sent to `/api/analytics` with the following structure:

```json
{
  "type": "performance|interaction|custom|pageView",
  "sessionId": "unique-session-id",
  "timestamp": 1234567890,
  "url": "https://example.com/page",
  "userAgent": "Mozilla/5.0...",
  "data": {
    // Metric-specific data
  }
}
```

### Batch Processing

The system supports batch processing to reduce API calls:

```tsx
config.production.batchSize = 10
config.production.flushInterval = 5000 // 5 seconds
```

## Testing

### Unit Tests

Comprehensive test coverage for all performance monitoring functionality:

```bash
# Run performance tests
pnpm vitest run src/__tests__/performance.test.ts
pnpm vitest run src/__tests__/performance-hooks.test.tsx
```

### Integration Testing

The performance monitoring integrates with existing tests and provides performance metrics for test scenarios.

## Best Practices

### 1. Use Appropriate Hooks

- Use `usePerformance` for general tracking
- Use `useComponentPerformance` for component-specific tracking
- Use `useApiPerformance` for API call tracking
- Use `useImagePerformance` for image load tracking

### 2. Respect Privacy

- Always respect user privacy preferences
- Don't track sensitive information
- Use sampling in high-traffic scenarios

### 3. Performance Impact

- Performance monitoring has minimal impact on app performance
- Use sampling for high-frequency events
- Disable component render tracking in production

### 4. Data Management

- Implement data retention policies
- Consider data volume and storage costs
- Use appropriate sampling rates

## Troubleshooting

### Common Issues

1. **Performance monitor not showing**
   - Check if `shouldShowMonitor()` returns true
   - Verify development environment

2. **Analytics not sending**
   - Check network connectivity
   - Verify analytics endpoint configuration
   - Check browser console for errors

3. **Metrics not tracking**
   - Verify performance monitoring is enabled
   - Check sampling configuration
   - Ensure proper hook usage

### Debug Mode

Enable debug logging:

```tsx
// In development console
localStorage.setItem('performance-debug', 'true')
```

## Future Enhancements

- **Real-time dashboard** for production monitoring
- **Performance alerts** and notifications
- **A/B testing** integration
- **Advanced analytics** and reporting
- **Performance budgets** and enforcement
- **Automated performance optimization** suggestions

## API Reference

### PerformanceMonitor Class

```typescript
class PerformanceMonitor {
  init(): void
  trackPerformanceMetric(name: string, value: number): void
  trackInteraction(type: string, target: string, data?: any): void
  trackEvent(eventName: string, data?: any): void
  getAnalytics(): UserAnalytics
  getPerformanceSummary(): PerformanceSummary
}
```

### Performance Hooks

```typescript
// Main performance hook
usePerformance(): {
  analytics: UserAnalytics | null
  performanceSummary: PerformanceSummary | null
  trackMetric: (name: string, value: number) => void
  trackUserInteraction: (type: string, target: string, data?: any) => void
  trackCustomEvent: (eventName: string, data?: any) => void
  // ... other methods
}

// Component performance hook
useComponentPerformance(componentName: string): {
  trackInteraction: (type: string, target: string, data?: any) => void
}

// API performance hook
useApiPerformance(): {
  trackApiRequest: <T>(apiCall: () => Promise<T>, endpoint: string) => Promise<T>
}

// Image performance hook
useImagePerformance(): {
  trackImage: (imageUrl: string) => void
}
```

### Configuration

```typescript
interface PerformanceConfig {
  enabled: boolean
  development: DevelopmentConfig
  production: ProductionConfig
  thresholds: ThresholdsConfig
  tracking: TrackingConfig
  sampling: SamplingConfig
  privacy: PrivacyConfig
}
```

This performance monitoring system provides comprehensive insights into application performance while maintaining user privacy and minimizing performance impact. 