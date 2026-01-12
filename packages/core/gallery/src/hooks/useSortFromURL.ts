import { useMemo, useCallback } from 'react'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { type SortingState } from '@tanstack/react-table'

/**
 * useSortFromURL - Manages sorting state synchronized with URL query parameters
 *
 * URL format:
 * - Single sort: ?sort=column:direction (e.g., ?sort=title:asc)
 * - Multi-sort: ?sort=col1:dir,col2:dir (e.g., ?sort=price:asc,title:desc)
 *
 * @param maxSorts - Maximum number of sorts allowed (defaults to 2)
 * @returns [sortingState, setSortingState] - TanStack Table compatible sorting state and setter
 */
export function useSortFromURL(maxSorts = 2): [SortingState, (sorting: SortingState) => void] {
  const search = useSearch({ strict: false }) as Record<string, string | undefined>
  const navigate = useNavigate()

  // Parse URL to get current sorting state
  const sorting: SortingState = useMemo(() => {
    const sortParam = search?.sort
    if (!sortParam) return []

    // Split by comma for multiple sorts
    const sortParts = sortParam.split(',')
    const sorts: SortingState = []

    for (const part of sortParts) {
      const [id, direction] = part.split(':')
      if (!id || !direction) continue

      // Validate direction
      if (direction !== 'asc' && direction !== 'desc') continue

      sorts.push({ id, desc: direction === 'desc' })

      // Enforce max sorts limit
      if (sorts.length >= maxSorts) break
    }

    return sorts
  }, [search?.sort, maxSorts])

  // Update URL when sorting changes
  const setSorting = useCallback(
    (newSorting: SortingState | ((prev: SortingState) => SortingState)) => {
      // Handle functional updates
      const resolvedSorting = typeof newSorting === 'function' ? newSorting(sorting) : newSorting

      ;(navigate as any)({
        replace: true,
        search: (prev: any) => {
          const next = { ...prev } as any

          if (resolvedSorting.length === 0) {
            // Remove sort param when no sorting
            delete (next as { sort?: string }).sort
          } else {
            // Build comma-separated sort string for multiple sorts
            const sortString = resolvedSorting
              .slice(0, maxSorts) // Enforce max sorts limit
              .map(({ id, desc }) => `${id}:${desc ? 'desc' : 'asc'}`)
              .join(',')
            ;(next as { sort?: string }).sort = sortString
          }

          return next
        },
      })
    },
    [navigate, sorting, maxSorts],
  )

  return [sorting, setSorting]
}
