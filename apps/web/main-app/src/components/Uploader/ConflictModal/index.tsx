/**
 * Story 3.1.10: Conflict Modal Component
 *
 * Modal for handling 409 Conflict errors (duplicate title).
 * Allows user to edit title and retry finalize.
 */

import { useState, useCallback, useEffect } from 'react'
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
  /** Callback when user confirms with new title */
  onConfirm: (newTitle: string) => void
  /** Callback when user cancels */
  onCancel: () => void
  /** Whether confirm action is loading */
  isLoading?: boolean
}

/**
 * Conflict modal for duplicate title resolution
 */
export function ConflictModal({
  open,
  currentTitle,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConflictModalProps) {
  const [newTitle, setNewTitle] = useState(currentTitle)
  const [error, setError] = useState<string | null>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setNewTitle(currentTitle)
      setError(null)
    }
  }, [open, currentTitle])

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" aria-hidden="true" />
            <DialogTitle>Title Already Exists</DialogTitle>
          </div>
          <DialogDescription>
            A MOC with the title &quot;{currentTitle}&quot; already exists. Please choose a
            different title.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="new-title">New Title</Label>
            <Input
              id="new-title"
              value={newTitle}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter a unique title"
              aria-invalid={!!error}
              aria-describedby={error ? 'title-error' : undefined}
              disabled={isLoading}
              autoFocus
            />
            {error ? (
              <p id="title-error" className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save & Retry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
