import { useState, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Shield, Users } from 'lucide-react'
import { Button } from '@repo/app-component-library'
import { UserTable } from '../components/UserTable'
import { UserSearchInput } from '../components/UserSearchInput'
import { useListUsersQuery } from '@/store'

/**
 * Admin Users Page
 *
 * Lists all users with search and pagination.
 * Clicking a row navigates to the user detail page.
 */
export function AdminUsersPage() {
  const navigate = useNavigate()
  const [searchEmail, setSearchEmail] = useState('')
  const [paginationToken, setPaginationToken] = useState<string | undefined>()

  // Initial query
  const { data, isLoading, isFetching, error } = useListUsersQuery({
    limit: 20,
    email: searchEmail || undefined,
    paginationToken,
  })

  const handleSearch = useCallback((email: string) => {
    setSearchEmail(email)
    setPaginationToken(undefined) // Reset pagination on new search
  }, [])

  const handleLoadMore = useCallback(async () => {
    if (data?.paginationToken) {
      setPaginationToken(data.paginationToken)
    }
  }, [data?.paginationToken])

  const handleUserClick = useCallback(
    (userId: string) => {
      navigate({ to: '/admin/users/$userId', params: { userId } })
    },
    [navigate],
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 rounded-lg p-2">
          <Shield className="text-primary h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground text-sm">Search and manage user accounts</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <UserSearchInput value={searchEmail} onChange={handleSearch} isLoading={isFetching} />
        </div>
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Users className="h-4 w-4" />
          {data?.users.length ?? 0} users
          {searchEmail ? ` matching "${searchEmail}"` : null}
        </div>
      </div>

      {/* Error state */}
      {error ? (
        <div className="bg-destructive/10 text-destructive rounded-lg border border-destructive/20 p-4">
          Failed to load users. Please try again.
        </div>
      ) : null}

      {/* User table */}
      <UserTable users={data?.users ?? []} isLoading={isLoading} onUserClick={handleUserClick} />

      {/* Load more button */}
      {data?.paginationToken ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleLoadMore} disabled={isFetching}>
            {isFetching ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
