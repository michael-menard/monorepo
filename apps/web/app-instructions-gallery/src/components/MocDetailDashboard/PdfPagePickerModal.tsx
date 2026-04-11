import { useState, useEffect, useRef, useCallback } from 'react'
import {
  AppDialog,
  AppDialogContent,
  AppDialogHeader,
  AppDialogTitle,
  Button,
} from '@repo/app-component-library'
import { Camera, Check, Loader2 } from 'lucide-react'
import { logger } from '@repo/logger'
import { useCapturePdfPagesMutation } from '@repo/api-client/rtk/instructions-api'
import * as pdfjs from 'pdfjs-dist'

// Configure pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

interface PdfPagePickerModalProps {
  mocId: string
  fileId: string
  pdfUrl: string
  open: boolean
  onClose: () => void
}

const MAX_SELECTION = 10
const THUMBNAIL_SCALE = 0.4

function PageThumbnail({
  page,
  pageNum,
  selected,
  onToggle,
}: {
  page: pdfjs.PDFPageProxy
  pageNum: number
  selected: boolean
  onToggle: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || rendered) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          observer.disconnect()
          const viewport = page.getViewport({ scale: THUMBNAIL_SCALE })
          canvas.width = viewport.width
          canvas.height = viewport.height
          const ctx = canvas.getContext('2d')
          if (!ctx) return
          page
            .render({ canvasContext: ctx, viewport })
            .promise.then(() => setRendered(true))
            .catch(() => {})
        }
      },
      { threshold: 0.1 },
    )

    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [page, rendered])

  return (
    <div ref={containerRef}>
      <button
        type="button"
        onClick={onToggle}
        className={`relative w-full rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-ring ${
          selected
            ? 'border-primary ring-2 ring-primary/30'
            : 'border-border hover:border-primary/50'
        }`}
      >
        <canvas ref={canvasRef} className="w-full h-auto bg-white" />
        <div className="absolute bottom-1 left-1 bg-background/80 text-foreground text-xs px-1.5 py-0.5 rounded">
          {pageNum}
        </div>
        {selected ? (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
            <Check className="h-3 w-3" />
          </div>
        ) : null}
        {!rendered ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : null}
      </button>
    </div>
  )
}

export function PdfPagePickerModal({
  mocId,
  fileId,
  pdfUrl,
  open,
  onClose,
}: PdfPagePickerModalProps) {
  const [pages, setPages] = useState<pdfjs.PDFPageProxy[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [capturePdfPages, { isLoading: isCapturing }] = useCapturePdfPagesMutation()

  // Load PDF when modal opens
  useEffect(() => {
    if (!open) return

    let cancelled = false
    setLoading(true)
    setError(null)
    setPages([])
    setSelected(new Set())

    pdfjs
      .getDocument(pdfUrl)
      .promise.then(async doc => {
        if (cancelled) return
        setTotalPages(doc.numPages)
        const loadedPages: pdfjs.PDFPageProxy[] = []
        for (let i = 1; i <= doc.numPages; i++) {
          if (cancelled) return
          const page = await doc.getPage(i)
          loadedPages.push(page)
        }
        if (!cancelled) {
          setPages(loadedPages)
          setLoading(false)
        }
      })
      .catch(err => {
        if (!cancelled) {
          logger.error('Failed to load PDF', err)
          setError('Failed to load PDF. Try opening it in a new tab first.')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [open, pdfUrl])

  const togglePage = useCallback((pageNum: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(pageNum)) {
        next.delete(pageNum)
      } else if (next.size < MAX_SELECTION) {
        next.add(pageNum)
      }
      return next
    })
  }, [])

  const handleCapture = useCallback(async () => {
    if (selected.size === 0) return
    try {
      setError(null)
      await capturePdfPages({
        mocId,
        fileId,
        pages: Array.from(selected).sort((a, b) => a - b),
      }).unwrap()
      onClose()
    } catch (err) {
      logger.error('Failed to capture PDF pages', err)
      setError('Failed to capture pages. Please try again.')
    }
  }, [mocId, fileId, selected, capturePdfPages, onClose])

  return (
    <AppDialog open={open} onOpenChange={v => !v && onClose()}>
      <AppDialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <AppDialogHeader>
          <AppDialogTitle>
            Capture pages as gallery images
            {totalPages > 0 ? (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                {totalPages} pages
              </span>
            ) : null}
          </AppDialogTitle>
        </AppDialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading PDF pages...</p>
            </div>
          ) : error && pages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {pages.map((page, i) => (
                <PageThumbnail
                  key={i + 1}
                  page={page}
                  pageNum={i + 1}
                  selected={selected.has(i + 1)}
                  onToggle={() => togglePage(i + 1)}
                />
              ))}
            </div>
          )}
        </div>

        {error && pages.length > 0 ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex items-center justify-between border-t pt-3">
          <p className="text-sm text-muted-foreground">
            {selected.size > 0
              ? `${selected.size} page${selected.size > 1 ? 's' : ''} selected (max ${MAX_SELECTION})`
              : 'Click pages to select them'}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isCapturing}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCapture} disabled={selected.size === 0 || isCapturing}>
              {isCapturing ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Camera className="h-4 w-4 mr-1" />
              )}
              {isCapturing
                ? 'Capturing...'
                : `Capture ${selected.size || ''} page${selected.size !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </AppDialogContent>
    </AppDialog>
  )
}
