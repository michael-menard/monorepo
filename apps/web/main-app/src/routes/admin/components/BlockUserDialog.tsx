import React, { useState } from 'react'
import { ShieldOff, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@repo/app-component-library'
import type { BlockUserInput, BlockReason } from '@repo/api-client'

interface BlockUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (input: BlockUserInput) => void
  isLoading: boolean
  username: string
}

const BLOCK_REASONS: { value: BlockReason; label: string; description: string }[] = [
  {
    value: 'security_incident',
    label: 'Security Incident',
    description: 'User involved in a security breach or suspicious activity',
  },
  {
    value: 'policy_violation',
    label: 'Policy Violation',
    description: 'User violated terms of service or community guidelines',
  },
  {
    value: 'account_compromise',
    label: 'Account Compromise',
    description: 'Account appears to be compromised or hacked',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Other reason (please specify in notes)',
  },
]

/**
 * Block User Dialog
 *
 * Confirmation dialog for blocking a user account.
 * Requires selecting a reason and optionally adding notes.
 */
export function BlockUserDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  username,
}: BlockUserDialogProps) {
  const [reason, setReason] = useState<BlockReason | ''>('')
  const [notes, setNotes] = useState('')

  const handleConfirm = () => {
    if (reason) {
      onConfirm({
        reason,
        notes: notes.trim() || undefined,
      })
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset form when closing
      setReason('')
      setNotes('')
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldOff className="h-5 w-5" />
            Block User
          </DialogTitle>
          <DialogDescription>
            This will suspend the account for <strong>{username}</strong> and revoke all their
            active sessions. They will not be able to sign in until unblocked.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Select value={reason} onValueChange={(val: string) => setReason(val as BlockReason)}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {BLOCK_REASONS.map(r => (
                  <SelectItem key={r.value} value={r.value}>
                    <div>
                      <div>{r.label}</div>
                      <div className="text-muted-foreground text-xs">{r.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              placeholder="Add any additional context..."
              rows={3}
              maxLength={1000}
            />
            <p className="text-muted-foreground text-xs">{notes.length}/1000 characters</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!reason || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Blocking...
              </>
            ) : (
              'Block User'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
