import { KeyRound, Loader2, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
} from '@repo/app-component-library'

interface RevokeTokensDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isLoading: boolean
  username: string
}

/**
 * Revoke Tokens Dialog
 *
 * Confirmation dialog for revoking all refresh tokens.
 * This signs the user out from all devices.
 */
export function RevokeTokensDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  username,
}: RevokeTokensDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Revoke Tokens
          </DialogTitle>
          <DialogDescription>
            This will invalidate all active sessions for <strong>{username}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-warning/10 flex items-start gap-3 rounded-lg border border-warning/20 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div className="text-sm">
            <p className="font-medium text-warning">This action cannot be undone</p>
            <p className="text-muted-foreground mt-1">
              The user will be signed out from all devices and will need to sign in again. This is
              useful if you suspect the account has been compromised.
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
                Revoking...
              </>
            ) : (
              'Revoke Tokens'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
