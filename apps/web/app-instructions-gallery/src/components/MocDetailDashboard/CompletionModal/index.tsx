import { useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
} from '@repo/app-component-library'
import { logger } from '@repo/logger'
import { useUpdateMocMutation } from '@repo/api-client/rtk/instructions-api'
import { Star, Clock, X } from 'lucide-react'

interface CompletionModalProps {
  mocId: string
  open: boolean
  onClose: () => void
  onReviewNow: () => void
}

export function CompletionModal({ mocId, open, onClose, onReviewNow }: CompletionModalProps) {
  const [updateMoc] = useUpdateMocMutation()

  const handleSkip = useCallback(async () => {
    try {
      await updateMoc({
        id: mocId,
        input: { reviewSkippedAt: new Date().toISOString() },
      }).unwrap()
      onClose()
    } catch (err) {
      logger.error('Failed to skip review', err)
      onClose()
    }
  }, [mocId, updateMoc, onClose])

  return (
    <Dialog
      open={open}
      onOpenChange={open => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-green-500" aria-hidden="true" />
            Build Complete!
          </DialogTitle>
          <DialogDescription>
            Congratulations on finishing your build! Would you like to write a review to capture
            your thoughts on the parts quality, instructions, and overall experience?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={onReviewNow} className="w-full">
            <Star className="h-4 w-4 mr-2" aria-hidden="true" />
            Review Now
          </Button>
          <Button variant="outline" onClick={onClose} className="w-full">
            <Clock className="h-4 w-4 mr-2" aria-hidden="true" />
            Remind Me Later
          </Button>
          <Button variant="ghost" onClick={handleSkip} className="w-full text-muted-foreground">
            <X className="h-4 w-4 mr-2" aria-hidden="true" />
            Skip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
