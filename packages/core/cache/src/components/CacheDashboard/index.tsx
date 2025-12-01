/**
 * Cache Performance Dashboard
 *
 * Real-time visualization of cache performance and analytics:
 * - Cache hit/miss rates and trends
 * - Performance metrics and alerts
 * - Usage patterns and insights
 * - Predictive analytics visualization
 * - Cache management controls
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Progress,
} from '@repo/app-component-library'
import {
  BarChart3,
  TrendingUp,
  Zap,
  AlertTriangle,
  RefreshCw,
  Database,
  Clock,
  Target,
  Brain,
  Activity,
} from 'lucide-react'
import { useCacheStatistics, useCacheManager } from '../../hooks/useIntelligentCache'

/**
 * Main Cache Dashboard Component
 */
export function CacheDashboard() {
  const { statistics, insights, performance } = useCacheStatistics()
  const { invalidatePattern, warmCache } = useCacheManager()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            Intelligent Cache Dashboard
          </h2>
          <p className="text-muted-foreground">
            Real-time cache performance monitoring and optimization
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => warmCache(['gallery', 'wishlist'])}>
            <Zap className="h-4 w-4 mr-2" />
            Warm Cache
          </Button>
          <Button variant="outline" size="sm" onClick={() => invalidatePattern('stale')}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Performance Overview */}
      <PerformanceCards performance={performance} />

      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="patterns">
            <Activity className="h-4 w-4 mr-2" />
            Patterns
          </TabsTrigger>
          <TabsTrigger value="insights">
            <Brain className="h-4 w-4 mr-2" />
            AI Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <CacheOverview statistics={statistics} />
        </TabsContent>

        <TabsContent value="patterns">
          <UsagePatterns patterns={statistics?.usagePatterns || []} />
        </TabsContent>

        <TabsContent value="insights">
          <AIInsights insights={insights || []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/** Performance Cards */
function PerformanceCards({
  performance,
}: {
  performance: { hitRate: number; totalRequests: number; averageResponseTime: number }
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Hit Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-green-500" />
            <span className="text-2xl font-bold">{(performance.hitRate * 100).toFixed(1)}%</span>
          </div>
          <Progress value={performance.hitRate * 100} className="mt-2" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-500" />
            <span className="text-2xl font-bold">{performance.totalRequests.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            <span className="text-2xl font-bold">
              {performance.averageResponseTime.toFixed(0)}ms
            </span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <Badge variant={performance.hitRate > 0.8 ? 'default' : 'secondary'}>
              {performance.hitRate > 0.8 ? 'Optimal' : 'Improving'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/** Cache Overview */
function CacheOverview({
  statistics,
}: {
  statistics: ReturnType<typeof useCacheStatistics>['statistics']
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cache Overview</CardTitle>
        <CardDescription>Current state of the intelligent cache system</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 border rounded-lg">
            <div className="text-2xl font-bold">{statistics?.usagePatterns?.length || 0}</div>
            <div className="text-sm text-muted-foreground">Cached Keys</div>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-2xl font-bold">{statistics?.predictiveInsights?.length || 0}</div>
            <div className="text-sm text-muted-foreground">Active Insights</div>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-2xl font-bold">
              {((statistics?.cacheMetrics?.hitRate || 0) * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-muted-foreground">Hit Rate</div>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-2xl font-bold">{statistics?.cacheMetrics?.totalRequests || 0}</div>
            <div className="text-sm text-muted-foreground">Total Requests</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface UsagePattern {
  key: string
  hitRate: number
  accessCount: number
  lastAccessed: number | null
}

/** Usage Patterns */
function UsagePatterns({ patterns }: { patterns: UsagePattern[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage Patterns</CardTitle>
        <CardDescription>Most frequently accessed cache entries</CardDescription>
      </CardHeader>
      <CardContent>
        {patterns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No usage patterns recorded yet
          </div>
        ) : (
          <div className="space-y-3">
            {patterns.slice(0, 10).map(pattern => (
              <div
                key={pattern.key}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <div className="font-medium">{pattern.key}</div>
                  <div className="text-sm text-muted-foreground">
                    {pattern.accessCount} accesses
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={pattern.hitRate > 0.8 ? 'default' : 'secondary'}>
                    {(pattern.hitRate * 100).toFixed(0)}% hit rate
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface PredictiveInsight {
  key: string
  recommendedAction: 'prefetch' | 'extend-ttl' | 'invalidate' | 'ignore'
  reasoning: string
  confidence: number
  predictedNextAccess: number
}

/** AI Insights */
function AIInsights({ insights }: { insights: PredictiveInsight[] }) {
  // Determine priority based on confidence and action
  const getPriority = (insight: PredictiveInsight): 'high' | 'medium' | 'low' => {
    if (insight.confidence > 0.8 && insight.recommendedAction === 'prefetch') return 'high'
    if (insight.confidence > 0.6) return 'medium'
    return 'low'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI-Powered Insights
        </CardTitle>
        <CardDescription>Intelligent recommendations for cache optimization</CardDescription>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No insights available yet</p>
            <p className="text-sm">Insights will appear as usage patterns are analyzed</p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight, index) => {
              const priority = getPriority(insight)
              return (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  {priority === 'high' ? (
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  ) : priority === 'medium' ? (
                    <TrendingUp className="h-5 w-5 text-yellow-500 mt-0.5" />
                  ) : (
                    <Zap className="h-5 w-5 text-blue-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{insight.key}</div>
                    <div className="text-sm text-muted-foreground">{insight.reasoning}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{insight.recommendedAction}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {(insight.confidence * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default CacheDashboard
