import { useEffect } from 'react'
import { Radar, Wifi, WifiOff, AlertTriangle } from 'lucide-react'
import {
  Badge,
  AppTabs,
  AppTabsList,
  AppTabsTrigger,
  AppTabsContent,
} from '@repo/app-component-library'
import { scraperApi, useGetQueueHealthQuery } from '@repo/api-client/rtk/scraper-api'
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

  return (
    <span className="flex items-center gap-1.5">
      {isBroken && <AlertTriangle className="h-3 w-3 text-red-500" />}
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
  const { events, isConnected } = useScraperEvents()
  const dispatch = useDispatch()

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
        'circuit_breaker_tripped',
        'circuit_breaker_reset',
      ].includes(latest.type)
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

      {/* Tabbed scraper queues */}
      <AppTabs defaultValue="bricklink-minifig">
        <AppTabsList variant="default" className="flex-wrap">
          {TABS.map(tab => (
            <AppTabsTrigger key={tab.key} value={tab.key} variant="default">
              <TabLabel name={tab.key} label={tab.label} />
            </AppTabsTrigger>
          ))}
        </AppTabsList>

        {TABS.map(tab => (
          <AppTabsContent key={tab.key} value={tab.key} className="space-y-4 mt-4">
            {/* Per-tab form */}
            <div className="bg-card border border-border rounded-lg p-4">{tab.form}</div>

            {/* Per-tab job board */}
            <JobBoard scraperType={tab.key} />
          </AppTabsContent>
        ))}
      </AppTabs>
    </div>
  )
}
