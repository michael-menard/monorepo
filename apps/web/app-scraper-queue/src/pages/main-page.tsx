import { useEffect } from 'react'
import { Radar, Wifi, WifiOff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@repo/app-component-library'
import { scraperApi } from '@repo/api-client/rtk/scraper-api'
import { useDispatch } from 'react-redux'
import { AddJobForm } from '../components/AddJobForm'
import { JobList } from '../components/JobList'
import { QueueHealth } from '../components/QueueHealth'
import { useScraperEvents } from '../hooks/useScraperEvents'

export function MainPage() {
  const { events, isConnected } = useScraperEvents()
  const dispatch = useDispatch()

  // Invalidate RTK Query caches when WebSocket events arrive
  useEffect(() => {
    if (events.length === 0) return
    const latest = events[0]

    // Refresh job list and queue health on any job lifecycle event
    if (
      latest.type === 'job_started' ||
      latest.type === 'job_completed' ||
      latest.type === 'job_failed' ||
      latest.type === 'catalog_expanded' ||
      latest.type === 'circuit_breaker_tripped' ||
      latest.type === 'circuit_breaker_reset'
    ) {
      dispatch(scraperApi.util.invalidateTags(['ScraperJobs', 'ScraperQueues']))
    }
  }, [events, dispatch])

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radar className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Scrape Queue</h1>
        </div>
        <Badge
          variant="outline"
          className={isConnected ? 'text-green-600 border-green-600/30' : 'text-muted-foreground'}
        >
          {isConnected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
          {isConnected ? 'Live' : 'Offline'}
        </Badge>
      </div>

      {/* Queue Health */}
      <QueueHealth />

      {/* Add Job */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add to Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <AddJobForm />
        </CardContent>
      </Card>

      {/* Job List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <JobList />
        </CardContent>
      </Card>
    </div>
  )
}
