import { useState, useEffect, useCallback } from 'react'
import { ShoppingCart, Package, AlertTriangle, RefreshCw, Hammer } from 'lucide-react'
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  cn,
} from '@repo/app-component-library'

function useFetchJson<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [_error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    fetch(url, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (!cancelled) {
          setData(d)
          setIsLoading(false)
        }
      })
      .catch(e => {
        if (!cancelled) {
          setError(e.message)
          setIsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [url])

  return { data, isLoading }
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: typeof ShoppingCart
  variant?: 'default' | 'success' | 'warning'
}) {
  return (
    <Card
      className={cn(
        variant === 'success' && 'border-emerald-500/30 bg-emerald-500/5',
        variant === 'warning' && 'border-amber-500/30 bg-amber-500/5',
      )}
    >
      <CardContent className="flex items-center gap-4 p-6">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg',
            variant === 'default' && 'bg-primary/10 text-primary',
            variant === 'success' && 'bg-emerald-500/10 text-emerald-600',
            variant === 'warning' && 'bg-amber-500/10 text-amber-600',
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

export function ProcurementPage() {
  const { data: summary, isLoading: summaryLoading } = useFetchJson<any>('/api/procurement/summary')
  const { data: partsRaw } = useFetchJson<any>('/api/procurement/parts-needed')
  const { data: pricedRaw } = useFetchJson<any>('/api/procurement/prices')
  const [fetchingPrices, setFetchingPrices] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const fetchPrices = useCallback(async () => {
    setFetchingPrices(true)
    try {
      await fetch('/api/procurement/fetch-prices', {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      setFetchingPrices(false)
    }
  }, [])

  const partsData = partsRaw ? { parts: partsRaw.parts ?? [] } : null
  const pricedData = pricedRaw ? { parts: pricedRaw.parts ?? [] } : null

  const parts = partsData?.parts ?? []
  const pricedParts = pricedData?.parts ?? []
  const displayParts = pricedParts.length > 0 ? pricedParts : parts
  const visibleParts = showAll ? displayParts : displayParts.slice(0, 50)

  if (summaryLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!summary || summary.mocsSelected === 0) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <h1 className="mb-8 text-3xl font-bold">Build Planner</h1>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <Hammer className="h-16 w-16 text-muted-foreground/40" />
            <h2 className="text-xl font-semibold text-muted-foreground">No MOCs selected</h2>
            <p className="max-w-md text-center text-muted-foreground">
              Mark MOCs with the hammer icon to start planning your build. Go to the Instructions
              page and hover over any MOC card to see the build planner toggle.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Build Planner</h1>
          <p className="text-muted-foreground">
            Parts needed across {summary.mocsSelected} selected MOC
            {summary.mocsSelected !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          onClick={fetchPrices}
          disabled={fetchingPrices || summary.partsToBuy === 0}
          variant="default"
        >
          <RefreshCw className={cn('mr-2 h-4 w-4', fetchingPrices && 'animate-spin')} />
          {fetchingPrices ? 'Fetching...' : 'Fetch Prices'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="MOCs Selected"
          value={summary.mocsSelected}
          subtitle={
            summary.mocsMissingParts > 0
              ? `${summary.mocsMissingParts} missing parts lists`
              : undefined
          }
          icon={Hammer}
          variant={summary.mocsMissingParts > 0 ? 'warning' : 'default'}
        />
        <StatCard
          title="Total Parts Needed"
          value={summary.totalPartsNeeded.toLocaleString()}
          subtitle={`${summary.uniquePartsNeeded} unique`}
          icon={Package}
        />
        <StatCard
          title="Parts in Inventory"
          value={summary.partsInInventory.toLocaleString()}
          icon={Package}
          variant="success"
        />
        <StatCard
          title="Parts to Buy"
          value={summary.partsToBuy.toLocaleString()}
          subtitle={
            summary.estimatedCostUsd ? `Est. $${summary.estimatedCostUsd}` : 'No pricing yet'
          }
          icon={ShoppingCart}
          variant={summary.partsToBuy > 0 ? 'warning' : 'success'}
        />
      </div>

      {/* Warnings */}
      {summary.mocsMissingParts > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-amber-700">
              {summary.mocsMissingParts} MOC{summary.mocsMissingParts !== 1 ? 's are' : ' is'}{' '}
              missing parts lists. Upload a parts list CSV to include them in the plan.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Parts Table */}
      {displayParts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Parts Needed ({displayParts.length})</span>
              {summary.pricingCoverage > 0 && (
                <Badge variant="secondary">
                  {Math.round(summary.pricingCoverage * 100)}% priced
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Part</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Color</th>
                    <th className="pb-3 pr-4 text-right font-medium text-muted-foreground">Need</th>
                    <th className="pb-3 pr-4 text-right font-medium text-muted-foreground">Own</th>
                    <th className="pb-3 pr-4 text-right font-medium text-muted-foreground">Buy</th>
                    {'cheapestPriceUsd' in (displayParts[0] ?? {}) && (
                      <>
                        <th className="pb-3 pr-4 text-right font-medium text-muted-foreground">
                          Price
                        </th>
                        <th className="pb-3 font-medium text-muted-foreground">Source</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {visibleParts.map(part => (
                    <tr
                      key={`${part.partNumber}-${part.color}`}
                      className={cn(
                        'border-b border-border/50 last:border-0',
                        part.quantityToBuy === 0 && 'opacity-50',
                      )}
                    >
                      <td className="py-2.5 pr-4">
                        <div>
                          <span className="font-mono text-xs text-muted-foreground">
                            {part.partNumber}
                          </span>
                          <p className="text-sm">{part.partName}</p>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4">{part.color}</td>
                      <td className="py-2.5 pr-4 text-right">{part.quantityNeeded}</td>
                      <td className="py-2.5 pr-4 text-right">
                        {part.quantityOwned > 0 ? (
                          <span className="text-emerald-600">{part.quantityOwned}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-medium">
                        {part.quantityToBuy > 0 ? (
                          part.quantityToBuy
                        ) : (
                          <Badge variant="outline" className="text-emerald-600">
                            owned
                          </Badge>
                        )}
                      </td>
                      {'cheapestPriceUsd' in part && (
                        <>
                          <td className="py-2.5 pr-4 text-right">
                            {(part as any).cheapestPriceUsd ? (
                              <span className="font-mono">${(part as any).cheapestPriceUsd}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-2.5">
                            {(part as any).cheapestStoreName ? (
                              <span className="text-xs text-muted-foreground">
                                {(part as any).cheapestStoreName}
                              </span>
                            ) : (
                              <Badge
                                variant="outline"
                                className={cn(
                                  (part as any).status === 'not_fetched' && 'text-muted-foreground',
                                  (part as any).status === 'unavailable' && 'text-red-500',
                                )}
                              >
                                {(part as any).status === 'not_fetched'
                                  ? 'not fetched'
                                  : 'unavailable'}
                              </Badge>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {displayParts.length > 50 && !showAll && (
              <div className="mt-4 text-center">
                <Button variant="ghost" onClick={() => setShowAll(true)}>
                  Show all {displayParts.length} parts
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
