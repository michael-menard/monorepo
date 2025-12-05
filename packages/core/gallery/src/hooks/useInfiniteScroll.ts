/* eslint-disable no-undef */
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Options for the useInfiniteScroll hook
 */
export interface UseInfiniteScrollOptions {
  /** Whether there are more items to load */
  hasMore: boolean
  /** Whether items are currently being loaded */
  isLoading: boolean
  /** Callback to load more items */
  onLoadMore: () => void
  /** Pixels before bottom to trigger load (default: 200) */
  threshold?: number
  /** Whether infinite scroll is enabled (default: true) */
  enabled?: boolean
}

/**
 * Return value from the useInfiniteScroll hook
 */
export interface UseInfiniteScrollReturn {
  /** Ref to attach to the sentinel element at the bottom of the list */
  sentinelRef: React.RefObject<HTMLDivElement | null>
  /** Whether the sentinel is currently visible/near the viewport */
  isNearBottom: boolean
}

/**
 * Hook for implementing infinite scroll using Intersection Observer.
 *
 * Place a sentinel element at the bottom of your list and attach the ref.
 * When the sentinel becomes visible (within threshold), onLoadMore is called.
 *
 * @example
 * ```tsx
 * const { sentinelRef } = useInfiniteScroll({
 *   hasMore,
 *   isLoading: isFetchingNextPage,
 *   onLoadMore: fetchNextPage,
 * })
 *
 * return (
 *   <>
 *     <GalleryGrid>{items}</GalleryGrid>
 *     <div ref={sentinelRef} />
 *     {isFetchingNextPage && <LoadingSpinner />}
 *   </>
 * )
 * ```
 */
export function useInfiniteScroll({
  hasMore,
  isLoading,
  onLoadMore,
  threshold = 200,
  enabled = true,
}: UseInfiniteScrollOptions): UseInfiniteScrollReturn {
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const [isNearBottom, setIsNearBottom] = useState(false)

  // Stable callback ref to avoid re-creating observer on every render
  const onLoadMoreRef = useRef(onLoadMore)
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore
  }, [onLoadMore])

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      const isIntersecting = entry?.isIntersecting ?? false
      setIsNearBottom(isIntersecting)

      if (isIntersecting && hasMore && !isLoading && enabled) {
        onLoadMoreRef.current()
      }
    },
    [hasMore, isLoading, enabled],
  )

  useEffect(() => {
    if (!enabled) return

    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin: `${threshold}px`,
    })

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [enabled, threshold, handleIntersection])

  return { sentinelRef, isNearBottom }
}
