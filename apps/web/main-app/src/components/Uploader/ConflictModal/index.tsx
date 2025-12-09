/**
 * Story 3.1.10 + 3.1.19 + 3.1.20: Conflict Modal Component
 *
 * Modal for handling 409 Conflict errors (duplicate slug).
 * Shows suggested slug from API and allows title edit for retry.
 * WCAG AA compliant with focus management and ARIA attributes.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
} from '@repo/app-component-library'

export interface ConflictModalProps {
  /** Whether the modal is open */
  open: boolean
  /** Current title that caused conflict */
  currentTitle: string
  /** Suggested slug from API (Story 3.1.19) */
  suggestedSlug?: string
  /** Callback when user confirms with new title */
  onConfirm: (newTitle: string) => void
  /** Callback when user uses suggested slug */
  onUseSuggested?: () => void
  /** Callback when user cancels */
  onCancel: () => void
  /** Whether confirm action is loading */
  isLoading?: boolean
}

/**
 * Conflict modal for duplicate title/slug resolution
 */
export function ConflictModal({
  open,
  currentTitle,
  suggestedSlug,
  onConfirm,
  onUseSuggested,
  onCancel,
  isLoading = false,
}: ConflictModalProps) {
  const [newTitle, setNewTitle] = useState(currentTitle)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Store the element that had focus before modal opened (Story 3.1.20)
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement
      setNewTitle(currentTitle)
      setError(null)
      // Focus input after modal opens
      setTimeout(() => {
        if (!suggestedSlug && inputRef.current) {
          inputRef.current.focus()
        }
      }, 0)
    } else {
      // Restore focus when modal closes
      if (previousFocusRef.current && previousFocusRef.current.focus) {
        previousFocusRef.current.focus()
      }
    }
  }, [open, currentTitle, suggestedSlug])

  const handleConfirm = useCallback(() => {
    const trimmed = newTitle.trim()

    if (!trimmed) {
      setError('Title is required')
      return
    }

    if (trimmed === currentTitle) {
      setError('Please enter a different title')
      return
    }

    setError(null)
    onConfirm(trimmed)
  }, [newTitle, currentTitle, onConfirm])

  const handleUseSuggested = useCallback(() => {
    if (onUseSuggested) {
      onUseSuggested()
    }
  }, [onUseSuggested])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !isLoading) {
        e.preventDefault()
        handleConfirm()
      }
    },
    [handleConfirm, isLoading],
  )

  return (
    <Dialog open={open} onOpenChange={(isOpen: boolean) => !isOpen && onCancel()}>
      <DialogContent
        className="sm:max-w-md"
        aria-labelledby="conflict-modal-title"
        aria-describedby="conflict-modal-description"
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" aria-hidden="true" />
            <DialogTitle id="conflict-modal-title">Title Already Exists</DialogTitle>
          </div>
          <DialogDescription id="conflict-modal-description">
            A MOC with the title &quot;{currentTitle}&quot; already exists. Please choose a
            different title or use the suggested alternative.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Suggested slug option (Story 3.1.19) */}
          {suggestedSlug && onUseSuggested ? (
            <div className="space-y-2">
              <Label>Suggested Alternative</Label>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <code className="flex-1 text-sm font-mono">{suggestedSlug}</code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUseSuggested}
                  disabled={isLoading}
                >
                  Use This
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This will keep your title and use a unique URL slug.
              </p>
            </div>
          ) : null}

          <div className="relative">
            {suggestedSlug ? (
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
            ) : null}
            {suggestedSlug ? (
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or enter new title</span>
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="conflict-new-title">New Title</Label>
            <Input
              ref={inputRef}
              id="conflict-new-title"
              value={newTitle}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter a unique title"
              aria-invalid={!!error}
              aria-describedby={error ? 'conflict-title-error' : undefined}
              disabled={isLoading}
            />
            {error ? (
              <p id="conflict-title-error" className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading} aria-busy={isLoading}>
            {isLoading ? 'Saving...' : 'Save & Retry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
