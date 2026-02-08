import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/app-component-library'
import type { CognitoUser } from '@repo/api-client'

interface UserTableProps {
  users: CognitoUser[]
  isLoading: boolean
  onUserClick: (userId: string) => void
}

/**
 * User Table
 *
 * Displays a table of Cognito users with click-to-navigate.
 */
export function UserTable({ users, isLoading, onUserClick }: UserTableProps) {
  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="bg-muted/50 flex min-h-[200px] items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground">No users found</p>
      </div>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[100px]">Enabled</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map(user => (
            <TableRow
              key={user.userId}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => onUserClick(user.userId)}
            >
              <TableCell className="font-medium">
                {user.email || <span className="text-muted-foreground italic">No email</span>}
              </TableCell>
              <TableCell className="font-mono text-sm">{user.username}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    user.userStatus === 'CONFIRMED'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : user.userStatus === 'UNCONFIRMED'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {user.userStatus || 'Unknown'}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatDate(user.createdAt)}
              </TableCell>
              <TableCell>
                {user.enabled ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
