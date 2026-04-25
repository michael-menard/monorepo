import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Radar,
  Wifi,
  WifiOff,
  AlertTriangle,
  Pause,
  Play,
  CirclePause,
  BarChart3,
} from 'lucide-react'
import {
  Badge,
  Button,
  AppTabs,
  AppTabsList,
  AppTabsTrigger,
  AppTabsContent,
} from '@repo/app-component-library'
import {
  scraperApi,
  useGetQueueHealthQuery,
  usePauseAllQueuesMutation,
  useResumeAllQueuesMutation,
} from '@repo/api-client/rtk/scraper-api'
import { useDispatch } from 'react-redux'
import { UrlJobForm, MocPipelineForm } from '../components/AddJobForm'
import { JobBoard } from '../components/JobBoard'
import { useScraperEvents } from '../hooks/useScraperEvents'

const TABS = [
  {
    key: 'bricklink-minifig',
    label: 'BL Minifig',
    form: (
      <UrlJobForm
        scraperType="bricklink-minifig"
        placeholder="Minifig number or BrickLink URL (e.g., cas002, col25-1)"
      />
    ),
  },
  {
    key: 'bricklink-catalog',
    label: 'BL Catalog',
    form: <UrlJobForm scraperType="bricklink-catalog" placeholder="BrickLink catalog list URL" />,
  },
  {
    key: 'bricklink-prices',
    label: 'BL Prices',
    form: (
      <UrlJobForm
        scraperType="bricklink-prices"
        placeholder="Minifig number to fetch prices for"
        showWishlist={false}
      />
    ),
  },
  {
    key: 'lego-set',
    label: 'LEGO Set',
    form: <UrlJobForm scraperType="lego-set" placeholder="LEGO.com product URL" />,
  },
  {
    key: 'rebrickable-set',
    label: 'RB Set',
    form: <UrlJobForm scraperType="rebrickable-set" placeholder="Rebrickable set URL" />,
  },
  {
    key: 'rebrickable-mocs',
    label: 'RB MOCs',
    form: <MocPipelineForm />,
  },
]

function TabLabel({ name, label }: { name: string; label: string }) {
  const { data } = useGetQueueHealthQuery(undefined, { pollingInterval: 10000 })
  const queue = data?.queues.find(q => q.name === name)

  const pending = (queue?.waiting ?? 0) + (queue?.active ?? 0)
  const isBroken = queue?.circuitBreaker.isOpen ?? false
  const isPaused = queue?.isPaused ?? false

  return (
    <span className="flex items-center gap-1.5">
      {isBroken && <AlertTriangle className="h-3 w-3 text-red-500" />}
      {isPaused && <CirclePause className="h-3 w-3 text-yellow-500" />}
      {label}
      {pending > 0 && (
        <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] leading-none">
          {pending}
        </Badge>
      )}
    </span>
  )
}

export function MainPage() {
  const [activeTab, setActiveTab] = useState('bricklink-minifig')
  const { events, isConnected } = useScraperEvents()
  const dispatch = useDispatch()
  const { data: healthData } = useGetQueueHealthQuery(undefined, { pollingInterval: 10000 })
  const [pauseAll, { isLoading: isPausingAll }] = usePauseAllQueuesMutation()
  const [resumeAll, { isLoading: isResumingAll }] = useResumeAllQueuesMutation()

  const allPaused = healthData?.queues.every(q => q.isPaused) ?? false
  const somePaused = healthData?.queues.some(q => q.isPaused) ?? false

  // Invalidate RTK caches on WebSocket events
  useEffect(() => {
    if (events.length === 0) return
    const latest = events[0]

    if (
      [
        'job_started',
        'job_completed',
        'job_failed',
        'catalog_expanded',
        'moc_discovery_expanded',
        'circuit_breaker_tripped',
        'circuit_breaker_reset',
        'queue_paused',
        'queue_resumed',
      ].includes(latest.type)
    ) {
      dispatch(scraperApi.util.invalidateTags(['ScraperJobs', 'ScraperQueues']))
    }
  }, [events, dispatch])

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radar className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Scrape Queue</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
            <a
              href={`${window.location.protocol}//${window.location.hostname}:3003/d/scraper-queue/scraper-queue?orgId=1&from=now-2d&to=now&refresh=30s`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <BarChart3 className="h-3 w-3 mr-1" />
              Grafana
            </a>
          </Button>
          <Button
            variant={allPaused || somePaused ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => (allPaused ? resumeAll() : pauseAll())}
            disabled={isPausingAll || isResumingAll}
          >
            {allPaused ? (
              <>
                <Play className="h-3 w-3 mr-1" />
                Resume All
              </>
            ) : (
              <>
                <Pause className="h-3 w-3 mr-1" />
                Pause All
              </>
            )}
          </Button>
          <Badge
            variant="outline"
            className={isConnected ? 'text-green-600 border-green-600/30' : 'text-muted-foreground'}
          >
            {isConnected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
            {isConnected ? 'Live' : 'Offline'}
          </Badge>
        </div>
      </div>

      {/* Tabbed scraper queues */}
      <AppTabs defaultValue="bricklink-minifig" onValueChange={setActiveTab} className="shrink-0">
        <AppTabsList variant="default" className="flex-wrap">
          {TABS.map(tab => (
            <AppTabsTrigger key={tab.key} value={tab.key} variant="default">
              <TabLabel name={tab.key} label={tab.label} />
            </AppTabsTrigger>
          ))}
        </AppTabsList>

        <div className="mt-4 relative">
          <AnimatePresence mode="wait">
            {TABS.map(
              tab =>
                tab.key === activeTab && (
                  <motion.div
                    key={tab.key}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15, ease: 'easeInOut' }}
                  >
                    <AppTabsContent value={tab.key} forceMount className="mt-0">
                      <div className="bg-card border border-border rounded-lg p-4">{tab.form}</div>
                    </AppTabsContent>
                  </motion.div>
                ),
            )}
          </AnimatePresence>
        </div>
      </AppTabs>

      {/* Unified job board — all scrapers, fills remaining height */}
      <div className="flex-1 min-h-0">
        <JobBoard />
      </div>
    </div>
  )
}
