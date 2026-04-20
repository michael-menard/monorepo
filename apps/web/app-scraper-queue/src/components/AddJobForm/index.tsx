import { useState, useCallback } from 'react'
import { Plus, Loader2, Play } from 'lucide-react'
import {
  Button,
  Badge,
  AppDialog,
  AppDialogContent,
  AppDialogHeader,
  AppDialogTitle,
  AppDialogFooter,
  cn,
} from '@repo/app-component-library'
import { useAddScrapeJobMutation } from '@repo/api-client/rtk/scraper-api'

const TYPE_LABELS: Record<string, string> = {
  'bricklink-minifig': 'BrickLink Minifig',
  'bricklink-catalog': 'BrickLink Catalog',
  'bricklink-prices': 'BrickLink Prices',
  'lego-set': 'LEGO.com Set',
  'rebrickable-set': 'Rebrickable Set',
  'rebrickable-mocs': 'Rebrickable MOCs',
}

function detectType(input: string): string | null {
  const lower = input.toLowerCase()
  if (lower.includes('bricklink.com') && lower.includes('cataloglist')) return 'bricklink-catalog'
  if (lower.includes('bricklink.com') && (lower.includes('m=') || lower.includes('s=')))
    return 'bricklink-minifig'
  if (lower.includes('lego.com') && lower.includes('product')) return 'lego-set'
  if (lower.includes('rebrickable.com') && lower.includes('/sets/')) return 'rebrickable-set'
  if (/^[a-z]{2,}[\d-]+$/i.test(input)) return 'bricklink-minifig'
  return null
}

export function AddJobForm() {
  const [input, setInput] = useState('')
  const [wishlist, setWishlist] = useState(false)
  const [showMocDialog, setShowMocDialog] = useState(false)
  const [mocOptions, setMocOptions] = useState({
    resume: false,
    force: false,
    retryFailed: false,
    retryMissing: false,
    likedMocs: false,
  })
  const [addJob, { isLoading }] = useAddScrapeJobMutation()

  const detectedType = input.trim() ? detectType(input.trim()) : null

  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed) return

    const urls = trimmed
      .split(',')
      .map(u => u.trim())
      .filter(Boolean)

    for (const url of urls) {
      await addJob({ url, wishlist })
    }

    setInput('')
  }, [input, wishlist, addJob])

  const handleRunMocPipeline = useCallback(async () => {
    await addJob({
      url: 'rebrickable-mocs',
      type: 'rebrickable-mocs',
      ...mocOptions,
    })
    setShowMocDialog(false)
    setMocOptions({
      resume: false,
      force: false,
      retryFailed: false,
      retryMissing: false,
      likedMocs: false,
    })
  }, [addJob, mocOptions])

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Paste URL, item number, or comma-separated list..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {detectedType && (
            <Badge variant="secondary" className="absolute right-2 top-2 text-xs">
              {TYPE_LABELS[detectedType] ?? detectedType}
            </Badge>
          )}
        </div>
        <Button onClick={handleSubmit} disabled={isLoading || !input.trim()}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-1" />
          )}
          Add
        </Button>
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={wishlist}
            onChange={e => setWishlist(e.target.checked)}
            className="rounded border-input"
          />
          Add to wishlist
        </label>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMocDialog(true)}
          disabled={isLoading}
        >
          <Play className="h-3 w-3 mr-1" />
          Run MOC Pipeline
        </Button>
      </div>

      {/* MOC Pipeline Options Dialog */}
      <AppDialog open={showMocDialog} onOpenChange={setShowMocDialog}>
        <AppDialogContent>
          <AppDialogHeader>
            <AppDialogTitle>Run Rebrickable MOC Pipeline</AppDialogTitle>
          </AppDialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select which pipeline mode to run. Options can be combined.
            </p>
            {[
              {
                key: 'resume' as const,
                label: 'Resume',
                description: 'Continue from where the last run left off',
              },
              {
                key: 'retryMissing' as const,
                label: 'Retry Missing',
                description: 'Re-scrape MOCs with missing parts or images',
              },
              {
                key: 'retryFailed' as const,
                label: 'Retry Failed',
                description: 'Re-try MOCs where downloads previously failed',
              },
              {
                key: 'likedMocs' as const,
                label: 'Liked MOCs',
                description: 'Scrape liked MOCs instead of purchased',
              },
              {
                key: 'force' as const,
                label: 'Force Re-scrape',
                description: 'Re-scrape everything, even already completed MOCs',
              },
            ].map(option => (
              <label
                key={option.key}
                className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={mocOptions[option.key]}
                  onChange={e =>
                    setMocOptions(prev => ({ ...prev, [option.key]: e.target.checked }))
                  }
                  className="mt-0.5 rounded border-input"
                />
                <div>
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                </div>
              </label>
            ))}
          </div>
          <AppDialogFooter>
            <Button variant="outline" onClick={() => setShowMocDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRunMocPipeline} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Start Pipeline
            </Button>
          </AppDialogFooter>
        </AppDialogContent>
      </AppDialog>
    </div>
  )
}
