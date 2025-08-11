import { useState } from 'react'
import { Button } from '@repo/ui'
import { usePerformance } from '../../hooks/usePerformance'
import { shouldShowMonitor } from '../../config/performance'

interface PerformanceMonitorProps {
  show?: boolean
}

export const PerformanceMonitor = ({ show = shouldShowMonitor() }: PerformanceMonitorProps) => {
  const [isVisible, setIsVisible] = useState(show)
  const { analytics, performanceSummary } = usePerformance()

  if (!isVisible) return null

  const formatMetric = (value: number, unit = 'ms') => {
    if (value < 1000) return `${value.toFixed(2)}${unit}`
    return `${(value / 1000).toFixed(2)}s`
  }

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good': return 'text-green-600'
      case 'needs-improvement': return 'text-yellow-600'
      case 'poor': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Performance Monitor</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ×
        </Button>
      </div>

      <div className="space-y-3 text-xs">
        {/* Session Info */}
        {analytics && (
          <div className="border-b pb-2">
            <div className="font-medium text-gray-700 mb-1">Session</div>
            <div className="text-gray-600">
              ID: {analytics.sessionId.slice(-8)}...
            </div>
            <div className="text-gray-600">
              Page Views: {analytics.pageViews.length}
            </div>
            <div className="text-gray-600">
              Interactions: {analytics.interactions.length}
            </div>
          </div>
        )}

        {/* Performance Summary */}
        {performanceSummary && (
          <div className="border-b pb-2">
            <div className="font-medium text-gray-700 mb-1">Performance Metrics</div>
            {Object.entries(performanceSummary).map(([metric, stats]) => (
              <div key={metric} className="flex justify-between items-center py-1">
                <span className="text-gray-600">{metric}:</span>
                <span className="text-gray-900 font-mono">
                  {formatMetric(stats.avg)} avg
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Recent Performance Metrics */}
        {analytics?.performance.slice(-5).map((metric, index) => (
          <div key={index} className="flex justify-between items-center">
            <span className="text-gray-600">{metric.name}:</span>
            <div className="flex items-center space-x-2">
              <span className="text-gray-900 font-mono">
                {formatMetric(metric.value)}
              </span>
              <span className={`text-xs ${getRatingColor(metric.rating)}`}>
                {metric.rating}
              </span>
            </div>
          </div>
        ))}

        {/* Quick Actions */}
        <div className="pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log('Analytics Data:', analytics)
              console.log('Performance Summary:', performanceSummary)
            }}
            className="w-full text-xs"
          >
            Log to Console
          </Button>
        </div>
      </div>
    </div>
  )
}

export default PerformanceMonitor 