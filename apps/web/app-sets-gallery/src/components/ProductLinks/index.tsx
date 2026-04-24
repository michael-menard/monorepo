/**
 * ProductLinks
 *
 * Displays product links for a set. Read-only for non-admins.
 * Admins can add, edit, delete, and reorder links.
 */

import { useCallback, useRef, useState } from 'react'
import { ArrowUp, ArrowDown, ExternalLink, Pencil, Plus, Trash2, X } from 'lucide-react'
import { z } from 'zod'
import { Button, Card, CardContent, CardHeader, CardTitle, cn } from '@repo/app-component-library'

const ProductLinkSchema = z.object({
  label: z.string().min(1).max(200),
  url: z.string().url(),
  source: z.enum(['lego.com', 'rebrickable', 'bricklink', 'manual']),
  addedAt: z.string(),
})

type ProductLink = z.infer<typeof ProductLinkSchema>

function sourceIcon(source: string): string {
  switch (source) {
    case 'lego.com':
      return '\uD83E\uDDF1'
    case 'bricklink':
      return '\uD83C\uDFEA'
    case 'rebrickable':
      return '\uD83D\uDD27'
    default:
      return '\uD83D\uDD17'
  }
}

function AddLinkForm({
  onAdd,
  onCancel,
}: {
  onAdd: (label: string, url: string) => void
  onCancel: () => void
}) {
  const labelRef = useRef<HTMLInputElement>(null)
  const urlRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    const label = labelRef.current?.value?.trim()
    const url = urlRef.current?.value?.trim()

    if (!label) {
      setError('Label is required')
      return
    }
    try {
      z.string().url().parse(url)
    } catch {
      setError('Valid URL is required')
      return
    }

    setError(null)
    onAdd(label, url!)
  }

  return (
    <div className="space-y-2 border rounded-md p-3 bg-muted/30">
      <input
        ref={labelRef}
        type="text"
        placeholder="Label (e.g., BrickLink)"
        className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
        onKeyDown={e => {
          if (e.key === 'Enter') urlRef.current?.focus()
          if (e.key === 'Escape') onCancel()
        }}
        autoFocus
      />
      <input
        ref={urlRef}
        type="url"
        placeholder="https://..."
        className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
        onKeyDown={e => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') onCancel()
        }}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-3 w-3 mr-1" />
          Cancel
        </Button>
        <Button size="sm" onClick={handleSubmit}>
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>
    </div>
  )
}

function EditLinkForm({
  link,
  onSave,
  onCancel,
}: {
  link: ProductLink
  onSave: (label: string, url: string) => void
  onCancel: () => void
}) {
  const labelRef = useRef<HTMLInputElement>(null)
  const urlRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    const label = labelRef.current?.value?.trim()
    const url = urlRef.current?.value?.trim()

    if (!label) {
      setError('Label is required')
      return
    }
    try {
      z.string().url().parse(url)
    } catch {
      setError('Valid URL is required')
      return
    }

    setError(null)
    onSave(label, url!)
  }

  return (
    <div className="space-y-2 border rounded-md p-3 bg-muted/30">
      <input
        ref={labelRef}
        type="text"
        defaultValue={link.label}
        className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
        onKeyDown={e => {
          if (e.key === 'Enter') urlRef.current?.focus()
          if (e.key === 'Escape') onCancel()
        }}
        autoFocus
      />
      <input
        ref={urlRef}
        type="url"
        defaultValue={link.url}
        className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
        onKeyDown={e => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') onCancel()
        }}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSubmit}>
          Save
        </Button>
      </div>
    </div>
  )
}

export function ProductLinks({
  sourceUrl,
  lastScrapedSource,
  productLinks = [],
  isAdmin = false,
  onUpdate,
}: {
  sourceUrl: string | null | undefined
  lastScrapedSource: string | null | undefined
  productLinks?: ProductLink[]
  isAdmin?: boolean
  onUpdate?: (links: ProductLink[]) => Promise<void>
}) {
  const [adding, setAdding] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const handleAdd = useCallback(
    async (label: string, url: string) => {
      if (!onUpdate) return
      const newLink: ProductLink = {
        label,
        url,
        source: 'manual',
        addedAt: new Date().toISOString(),
      }
      await onUpdate([...productLinks, newLink])
      setAdding(false)
    },
    [productLinks, onUpdate],
  )

  const handleEdit = useCallback(
    async (index: number, label: string, url: string) => {
      if (!onUpdate) return
      const updated = [...productLinks]
      updated[index] = { ...updated[index], label, url }
      await onUpdate(updated)
      setEditingIndex(null)
    },
    [productLinks, onUpdate],
  )

  const handleDelete = useCallback(
    async (index: number) => {
      if (!onUpdate) return
      const updated = productLinks.filter((_, i) => i !== index)
      await onUpdate(updated)
    },
    [productLinks, onUpdate],
  )

  const handleMoveUp = useCallback(
    async (index: number) => {
      if (!onUpdate || index === 0) return
      const updated = [...productLinks]
      ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
      await onUpdate(updated)
    },
    [productLinks, onUpdate],
  )

  const handleMoveDown = useCallback(
    async (index: number) => {
      if (!onUpdate || index === productLinks.length - 1) return
      const updated = [...productLinks]
      ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
      await onUpdate(updated)
    },
    [productLinks, onUpdate],
  )

  const hasLinks = sourceUrl || productLinks.length > 0

  return (
    <Card data-testid="product-links-section">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Product Links</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Source URL — always first, read-only */}
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm py-1.5 px-2 -mx-2 rounded hover:bg-muted/50 transition-colors group"
          >
            <span>{sourceIcon(lastScrapedSource ?? 'manual')}</span>
            <span className="flex-1 truncate font-medium">
              {lastScrapedSource ?? 'Product Page'}
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </a>
        )}

        {/* Product links */}
        {productLinks.map((link, index) =>
          editingIndex === index ? (
            <EditLinkForm
              key={`edit-${index}`}
              link={link}
              onSave={(label, url) => handleEdit(index, label, url)}
              onCancel={() => setEditingIndex(null)}
            />
          ) : (
            <div
              key={`${link.url}-${index}`}
              className={cn(
                'flex items-center gap-2 text-sm py-1.5 px-2 -mx-2 rounded group',
                isAdmin ? 'hover:bg-muted/50' : '',
              )}
            >
              <span>{sourceIcon(link.source)}</span>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate font-medium hover:underline"
              >
                {link.label}
              </a>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />

              {isAdmin && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    className="p-1 hover:bg-muted rounded"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className="p-1 hover:bg-muted rounded"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === productLinks.length - 1}
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className="p-1 hover:bg-muted rounded"
                    onClick={() => setEditingIndex(index)}
                    aria-label="Edit link"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className="p-1 hover:bg-destructive/10 hover:text-destructive rounded"
                    onClick={() => handleDelete(index)}
                    aria-label="Delete link"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          ),
        )}

        {/* Empty state */}
        {!hasLinks && (
          <p className="text-sm text-muted-foreground py-2">No product links available</p>
        )}

        {/* Add link form / button */}
        {isAdmin &&
          (adding ? (
            <AddLinkForm onAdd={handleAdd} onCancel={() => setAdding(false)} />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-1"
              onClick={() => setAdding(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Link
            </Button>
          ))}
      </CardContent>
    </Card>
  )
}
