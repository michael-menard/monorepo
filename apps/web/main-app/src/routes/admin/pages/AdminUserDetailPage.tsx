import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  Shield,
  ShieldOff,
  KeyRound,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react'
import { Button, Badge } from '@repo/app-component-library'
import type { BlockUserInput } from '@repo/api-client'
import { BlockUserDialog } from '../components/BlockUserDialog'
import { RevokeTokensDialog } from '../components/RevokeTokensDialog'
import { UnblockUserDialog } from '../components/UnblockUserDialog'
import {
  useGetUserDetailQuery,
  useRevokeTokensMutation,
  useBlockUserMutation,
  useUnblockUserMutation,
} from '@/store'

interface AdminUserDetailPageProps {
  userId: string
}

/**
 * Admin User Detail Page
 *
 * Shows detailed user information and admin actions.
 */
export function AdminUserDetailPage({ userId }: AdminUserDetailPageProps) {
  const navigate = useNavigate()
  const { data: user, isLoading, error } = useGetUserDetailQuery(userId)
  const [revokeTokens, { isLoading: isRevoking }] = useRevokeTokensMutation()
  const [blockUser, { isLoading: isBlocking }] = useBlockUserMutation()
  const [unblockUser, { isLoading: isUnblocking }] = useUnblockUserMutation()

  // Dialog states
  const [showBlockDialog, setShowBlockDialog] = useState(false)
  const [showRevokeDialog, setShowRevokeDialog] = useState(false)
  const [showUnblockDialog, setShowUnblockDialog] = useState(false)

  const handleBack = () => {
    navigate({ to: '/admin/users' })
  }

  const handleRevokeTokens = async () => {
    try {
      await revokeTokens(userId).unwrap()
      setShowRevokeDialog(false)
    } catch (err) {
      console.error('Failed to revoke tokens:', err)
    }
  }

  const handleBlockUser = async (input: BlockUserInput) => {
    try {
      await blockUser({ userId, input }).unwrap()
      setShowBlockDialog(false)
    } catch (err) {
      console.error('Failed to block user:', err)
    }
  }

  const handleUnblockUser = async () => {
    try {
      await unblockUser(userId).unwrap()
      setShowUnblockDialog(false)
    } catch (err) {
      console.error('Failed to unblock user:', err)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Error state
  if (error || !user) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={handleBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Button>
        <div className="bg-destructive/10 text-destructive flex items-center gap-3 rounded-lg border border-destructive/20 p-4">
          <AlertCircle className="h-5 w-5" />
          User not found or failed to load.
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={handleBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Users
      </Button>

      {/* User header */}
      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 flex h-16 w-16 items-center justify-center rounded-full">
              <User className="text-primary h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{user.username}</h1>
              <p className="text-muted-foreground">{user.email || 'No email'}</p>
              <div className="mt-2 flex items-center gap-2">
                {user.enabled ? (
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Enabled
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    Disabled
                  </Badge>
                )}
                {user.isSuspended ? (
                  <Badge variant="destructive" className="gap-1">
                    <ShieldOff className="h-3 w-3" />
                    Blocked
                  </Badge>
                ) : null}
                {user.tier ? <Badge variant="secondary">{user.tier}</Badge> : null}
                {user.userStatus ? <Badge variant="outline">{user.userStatus}</Badge> : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Cognito info */}
        <div className="bg-card rounded-lg border p-6">
          <h2 className="mb-4 font-semibold">Account Information</h2>
          <dl className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="text-muted-foreground h-4 w-4" />
              <dt className="text-muted-foreground text-sm">User ID:</dt>
              <dd className="font-mono text-sm">{user.userId}</dd>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="text-muted-foreground h-4 w-4" />
              <dt className="text-muted-foreground text-sm">Email:</dt>
              <dd className="text-sm">{user.email || 'Not set'}</dd>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="text-muted-foreground h-4 w-4" />
              <dt className="text-muted-foreground text-sm">Created:</dt>
              <dd className="text-sm">{formatDate(user.createdAt)}</dd>
            </div>
          </dl>
        </div>

        {/* Suspension info */}
        {user.isSuspended ? (
          <div className="bg-destructive/5 rounded-lg border border-destructive/20 p-6">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-destructive">
              <ShieldOff className="h-4 w-4" />
              Account Blocked
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-muted-foreground text-sm">Reason:</dt>
                <dd className="text-sm">{user.suspendedReason || 'No reason provided'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-sm">Blocked at:</dt>
                <dd className="text-sm">{formatDate(user.suspendedAt)}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </div>

      {/* Actions */}
      <div className="bg-card rounded-lg border p-6">
        <h2 className="mb-4 font-semibold">Admin Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => setShowRevokeDialog(true)}
            disabled={isRevoking}
            className="gap-2"
          >
            <KeyRound className="h-4 w-4" />
            Revoke Tokens
          </Button>

          {user.isSuspended ? (
            <Button
              variant="outline"
              onClick={() => setShowUnblockDialog(true)}
              disabled={isUnblocking}
              className="gap-2"
            >
              <Shield className="h-4 w-4" />
              Unblock User
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={() => setShowBlockDialog(true)}
              disabled={isBlocking}
              className="gap-2"
            >
              <ShieldOff className="h-4 w-4" />
              Block User
            </Button>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <BlockUserDialog
        open={showBlockDialog}
        onOpenChange={setShowBlockDialog}
        onConfirm={handleBlockUser}
        isLoading={isBlocking}
        username={user.username}
      />

      <RevokeTokensDialog
        open={showRevokeDialog}
        onOpenChange={setShowRevokeDialog}
        onConfirm={handleRevokeTokens}
        isLoading={isRevoking}
        username={user.username}
      />

      <UnblockUserDialog
        open={showUnblockDialog}
        onOpenChange={setShowUnblockDialog}
        onConfirm={handleUnblockUser}
        isLoading={isUnblocking}
        username={user.username}
      />
    </div>
  )
}
