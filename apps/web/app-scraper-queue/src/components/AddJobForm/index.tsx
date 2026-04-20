import { useState, useCallback } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { Button, Badge, cn } from '@repo/app-component-library'
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
  const [addJob, { isLoading }] = useAddScrapeJobMutation()

  const detectedType = input.trim() ? detectType(input.trim()) : null

  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed) return

    // Support comma-separated URLs
    const urls = trimmed
      .split(',')
      .map(u => u.trim())
      .filter(Boolean)

    for (const url of urls) {
      await addJob({ url, wishlist })
    }

    setInput('')
  }, [input, wishlist, addJob])

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
          onClick={() =>
            addJob({
              url: 'rebrickable-mocs',
              type: 'rebrickable-mocs',
            })
          }
          disabled={isLoading}
        >
          Run MOC Pipeline
        </Button>
      </div>
    </div>
  )
}
