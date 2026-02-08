import { Shield, Loader2, CheckCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
} from '@repo/app-component-library'

interface UnblockUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isLoading: boolean
  username: string
}

/**
 * Unblock User Dialog
 *
 * Confirmation dialog for unblocking a previously blocked user.
 */
export function UnblockUserDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  username,
}: UnblockUserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Unblock User
          </DialogTitle>
          <DialogDescription>
            This will restore account access for <strong>{username}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-green-500/10 flex items-start gap-3 rounded-lg border border-green-500/20 p-4">
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
          <div className="text-sm">
            <p className="font-medium text-green-700 dark:text-green-400">
              Account will be restored
            </p>
            <p className="text-muted-foreground mt-1">
              The user will be able to sign in again with their existing credentials. Their previous
              session tokens will remain invalidated.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Unblocking...
              </>
            ) : (
              'Unblock User'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
