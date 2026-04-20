import { useState, useCallback } from 'react'
import { Plus, Loader2, Play } from 'lucide-react'
import { Button } from '@repo/app-component-library'
import { useAddScrapeJobMutation } from '@repo/api-client/rtk/scraper-api'

// ─────────────────────────────────────────────────────────────────────────
// URL-based form (BL Minifig, BL Catalog, BL Prices, LEGO Set, RB Set)
// ─────────────────────────────────────────────────────────────────────────

export function UrlJobForm({
  scraperType,
  placeholder,
  showWishlist = true,
}: {
  scraperType: string
  placeholder: string
  showWishlist?: boolean
}) {
  const [input, setInput] = useState('')
  const [wishlist, setWishlist] = useState(false)
  const [addJob, { isLoading }] = useAddScrapeJobMutation()

  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed) return

    const urls = trimmed
      .split(',')
      .map(u => u.trim())
      .filter(Boolean)

    for (const url of urls) {
      await addJob({ url, type: scraperType as any, wishlist })
    }

    setInput('')
  }, [input, wishlist, scraperType, addJob])

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={placeholder}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <Button size="sm" onClick={handleSubmit} disabled={isLoading || !input.trim()}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-1" />
          )}
          Add
        </Button>
      </div>
      {showWishlist && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={wishlist}
            onChange={e => setWishlist(e.target.checked)}
            className="rounded border-input"
          />
          Add to wishlist
        </label>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// MOC Pipeline form (Rebrickable MOCs)
// ─────────────────────────────────────────────────────────────────────────

const MOC_OPTIONS = [
  { key: 'resume' as const, label: 'Resume', desc: 'Continue from where the last run left off' },
  {
    key: 'retryMissing' as const,
    label: 'Retry Missing',
    desc: 'Re-scrape MOCs with missing parts or images',
  },
  {
    key: 'retryFailed' as const,
    label: 'Retry Failed',
    desc: 'Re-try MOCs where downloads previously failed',
  },
  {
    key: 'likedMocs' as const,
    label: 'Liked MOCs',
    desc: 'Scrape liked MOCs instead of purchased',
  },
  {
    key: 'force' as const,
    label: 'Force Re-scrape',
    desc: 'Re-scrape everything, even already completed MOCs',
  },
]

export function MocPipelineForm() {
  const [options, setOptions] = useState({
    resume: false,
    force: false,
    retryFailed: false,
    retryMissing: false,
    likedMocs: false,
  })
  const [addJob, { isLoading }] = useAddScrapeJobMutation()

  const handleStart = useCallback(async () => {
    await addJob({
      url: 'rebrickable-mocs',
      type: 'rebrickable-mocs',
      ...options,
    })
  }, [addJob, options])

  return (
    <div className="space-y-3">
      {MOC_OPTIONS.map(opt => (
        <label
          key={opt.key}
          className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={options[opt.key]}
            onChange={e => setOptions(prev => ({ ...prev, [opt.key]: e.target.checked }))}
            className="mt-0.5 rounded border-input"
          />
          <div>
            <div className="text-sm font-medium">{opt.label}</div>
            <div className="text-xs text-muted-foreground">{opt.desc}</div>
          </div>
        </label>
      ))}
      <Button size="sm" onClick={handleStart} disabled={isLoading}>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-1" />
        ) : (
          <Play className="h-3 w-3 mr-1" />
        )}
        Start Pipeline
      </Button>
    </div>
  )
}
