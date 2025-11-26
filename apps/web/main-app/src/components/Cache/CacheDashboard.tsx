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

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/card'
import { Button } from '@repo/ui/button'
import { Badge } from '@repo/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/tabs'
import { Progress } from '@repo/ui/progress'
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
import { useCacheStatistics, useCacheManager } from '@/hooks/useIntelligentCache'

/**
 * Main Cache Dashboard Component
 */
export function CacheDashboard() {
  const { statistics, insights, performance } = useCacheStatistics()
  const { invalidatePattern, warmCache, getInsights } = useCacheManager()
  const [selectedInsight, setSelectedInsight] = useState<any>(null)

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
          <Button variant="outline" size="sm" onClick={() => invalidatePattern('user')}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Clear User Cache
          </Button>
          <Button variant="outline" size="sm" onClick={() => warmCache(['gallery', 'wishlist'])}>
            <Zap className="h-4 w-4 mr-2" />
            Warm Cache
          </Button>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              Hit Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(performance.hitRate * 100).toFixed(1)}%</div>
            <Progress value={performance.hitRate * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance.totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Since last reset</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Avg Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance.averageResponseTime.toFixed(1)}ms</div>
            <p className="text-xs text-muted-foreground mt-1">Cache operations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Optimization opportunities</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="patterns">Usage Patterns</TabsTrigger>
          <TabsTrigger value="strategies">Cache Strategies</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" />
                Predictive Insights
              </CardTitle>
              <CardDescription>AI-powered recommendations for cache optimization</CardDescription>
            </CardHeader>
            <CardContent>
              {insights.length > 0 ? (
                <div className="space-y-3">
                  {insights.slice(0, 5).map((insight, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent"
                      onClick={() => setSelectedInsight(insight)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              insight.recommendedAction === 'prefetch'
                                ? 'default'
                                : insight.recommendedAction === 'extend-ttl'
                                  ? 'secondary'
                                  : insight.recommendedAction === 'invalidate'
                                    ? 'destructive'
                                    : 'outline'
                            }
                          >
                            {insight.recommendedAction}
                          </Badge>
                          <span className="font-medium">{insight.key}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{insight.reasoning}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {(insight.confidence * 100).toFixed(0)}% confidence
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Next access: {Math.round(insight.predictedNextAccess / 1000)}s
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No insights available yet</p>
                  <p className="text-sm">Use the application to generate AI insights</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Patterns Tab */}
        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Cache Usage Patterns
              </CardTitle>
              <CardDescription>Analysis of cache access patterns and user behavior</CardDescription>
            </CardHeader>
            <CardContent>
              {statistics.usagePatterns.length > 0 ? (
                <div className="space-y-3">
                  {statistics.usagePatterns.slice(0, 10).map((pattern, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{pattern.key}</div>
                        <div className="text-sm text-muted-foreground">
                          {pattern.accessCount} accesses • {pattern.userSessions.size} users
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {(pattern.hitRate * 100).toFixed(1)}% hit rate
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Last: {new Date(pattern.lastAccessed).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No usage patterns recorded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cache Strategies Tab */}
        <TabsContent value="strategies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Active Cache Strategies
              </CardTitle>
              <CardDescription>Current caching strategies and their configurations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {statistics.strategies.map((strategy, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{strategy.name}</h4>
                      <Badge variant="outline">Priority {strategy.priority}</Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>TTL: {Math.round(strategy.ttl / 1000)}s</div>
                      <div>Prefetch: {(strategy.prefetchTrigger * 100).toFixed(0)}% of TTL</div>
                      <div>Compression: {strategy.compressionEnabled ? 'Enabled' : 'Disabled'}</div>
                      <div>Encryption: {strategy.encryptionEnabled ? 'Enabled' : 'Disabled'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-500" />
                Performance Metrics
              </CardTitle>
              <CardDescription>
                Detailed performance analysis and optimization opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Cache Hit Rate</label>
                    <Progress value={performance.hitRate * 100} className="mt-1" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {(performance.hitRate * 100).toFixed(1)}% of requests served from cache
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Response Time</label>
                    <Progress
                      value={Math.min(100 - performance.averageResponseTime / 10, 100)}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {performance.averageResponseTime.toFixed(1)}ms average response time
                    </p>
                  </div>
                </div>

                {/* Performance Alerts */}
                <div className="mt-6">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Performance Alerts
                  </h4>
                  <div className="text-sm text-muted-foreground">
                    {performance.hitRate < 0.7 ? (
                      <div className="flex items-center gap-2 text-orange-600">
                        <AlertTriangle className="h-4 w-4" />
                        Low hit rate detected - consider optimizing cache strategies
                      </div>
                    ) : (
                      <div className="text-green-600">Cache performance is optimal</div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
