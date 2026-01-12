import { useState, useEffect, useCallback } from 'react'
import { z } from 'zod'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button, Badge, useToast, Skeleton } from '@repo/app-component-library'
import type { WishlistItem, MarkPurchasedResponse } from '@repo/api-client/schemas/wishlist'
import {
  useGetWishlistItemQuery,
  useRemoveFromWishlistMutation,
  useAddToWishlistMutation,
} from '@repo/api-client/rtk/wishlist-gallery-api'
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal'
import { GotItModal } from '../components/GotItModal'

/**
 * Simple hook to read the wishlist item id from the URL path.
 * This mirrors the example in the story doc that uses Route.useParams().
 *
 * Expected path: /wishlist/:id
 */
function useWishlistItemIdFromLocation(): string | null {
  const path = window.location.pathname
  const match = path.match(/\/wishlist\/(.+)$/)
  if (!match) return null
  return decodeURIComponent(match[1])
}

const WishlistDetailPagePropsSchema = z.object({
  className: z.string().optional(),
})

export type WishlistDetailPageProps = z.infer<typeof WishlistDetailPagePropsSchema>

export function WishlistDetailPage({ className }: WishlistDetailPageProps) {
  const { toast, success, error } = useToast()

  const [selectedItemForDelete, setSelectedItemForDelete] = useState<WishlistItem | null>(null)
  const [gotItModalOpen, setGotItModalOpen] = useState(false)
  const [lastPurchasedItem, setLastPurchasedItem] = useState<WishlistItem | null>(null)
  const [lastPurchaseResponse, setLastPurchaseResponse] = useState<MarkPurchasedResponse | null>(
    null,
  )

  const [removeFromWishlist, { isLoading: isDeleting }] = useRemoveFromWishlistMutation()
  const [addToWishlist, { isLoading: isRestoring }] = useAddToWishlistMutation()

  const itemId = useWishlistItemIdFromLocation()

  const {
    data: item,
    isLoading,
    isFetching,
  } = useGetWishlistItemQuery(itemId ?? '', {
    skip: !itemId,
  })

  useEffect(() => {
    if (item && selectedItemForDelete && item.id !== selectedItemForDelete.id) {
      setSelectedItemForDelete(item)
    }
  }, [item, selectedItemForDelete])

  const handleBack = () => {
    window.location.href = '/wishlist'
  }

  const handleDelete = async () => {
    if (!item) return

    try {
      await removeFromWishlist(item.id).unwrap()
      success('Item removed from wishlist', `"${item.title}" was removed from your wishlist.`)
      window.location.href = '/wishlist'
    } catch (err) {
      error(err, 'Failed to remove item')
      setSelectedItemForDelete(null)
    }
  }

  const handleUndoPurchase = useCallback(async () => {
    if (!lastPurchasedItem || !lastPurchaseResponse?.removedFromWishlist) return

    const toRestore = lastPurchasedItem

    try {
      await addToWishlist({
        title: toRestore.title,
        store: toRestore.store,
        setNumber: toRestore.setNumber ?? undefined,
        sourceUrl: toRestore.sourceUrl ?? undefined,
        imageUrl: toRestore.imageUrl ?? undefined,
        price: toRestore.price ?? undefined,
        currency: toRestore.currency,
        pieceCount: toRestore.pieceCount ?? undefined,
        releaseDate: toRestore.releaseDate ?? undefined,
        tags: toRestore.tags ?? [],
        priority: toRestore.priority,
        notes: toRestore.notes ?? undefined,
      }).unwrap()

      success('Undo successful', `"${toRestore.title}" was restored to your wishlist.`)
      setLastPurchasedItem(null)
      setLastPurchaseResponse(null)
    } catch (err) {
      error(err, 'Failed to undo purchase')
    }
  }, [
    addToWishlist,
    lastPurchasedItem,
    lastPurchaseResponse,
    success,
    error,
    setLastPurchasedItem,
    setLastPurchaseResponse,
  ])

  const handleGotItCompleted = useCallback(
    (params: { item: WishlistItem; response: MarkPurchasedResponse }) => {
      const { item: purchasedItem, response } = params

      setGotItModalOpen(false)
      setLastPurchasedItem(purchasedItem)
      setLastPurchaseResponse(response)

      const hasNewSet = Boolean(response.newSetId)
      const wasRemoved = response.removedFromWishlist

      const description = hasNewSet
        ? 'View it in your Sets gallery.'
        : wasRemoved
          ? 'Item marked as purchased and removed from wishlist.'
          : 'Item marked as purchased and kept on wishlist.'

      const primaryAction = wasRemoved
        ? {
            label: 'Undo',
            onClick: handleUndoPurchase,
          }
        : undefined

      toast({
        title: 'Added to your collection!',
        description,
        variant: 'success',
        duration: 5000,
        primaryAction,
      })

      if (response.newSetId) {
        window.location.href = `/sets/${response.newSetId}`
      } else if (response.removedFromWishlist) {
        window.location.href = '/wishlist'
      }
    },
    [handleUndoPurchase, toast, setGotItModalOpen, setLastPurchasedItem, setLastPurchaseResponse],
  )

  if (!itemId) {
    return (
      <div className={className}>
        <div className="container mx-auto py-6 max-w-3xl space-y-4">
          <Button type="button" variant="ghost" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Wishlist
          </Button>
          <p className="text-destructive">Invalid wishlist item URL.</p>
        </div>
      </div>
    )
  }

  if (isLoading || isFetching) {
    return (
      <div className={className}>
        <div className="container mx-auto py-6 max-w-3xl space-y-6">
          <Button type="button" variant="ghost" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Wishlist
          </Button>
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className={className}>
        <div className="container mx-auto py-6 max-w-3xl space-y-4">
          <Button type="button" variant="ghost" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Wishlist
          </Button>
          <p className="text-destructive">Wishlist item not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="container mx-auto py-6 max-w-3xl space-y-6">
        {/* Header and primary actions */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Button type="button" variant="ghost" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Wishlist
            </Button>
            <h1 className="text-3xl font-bold">{item.title}</h1>
            <div className="flex flex-wrap gap-2 items-center text-muted-foreground text-sm">
              {item.setNumber ? <span>Set #{item.setNumber}</span> : null}
              <span>Store: {item.store}</span>
              {item.pieceCount ? <span>{item.pieceCount.toLocaleString()} pieces</span> : null}
              {item.price ? (
                <span>
                  {item.currency} {item.price}
                </span>
              ) : null}
              <Badge variant="outline">Priority {item.priority ?? 0}/5</Badge>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              onClick={() => {
                setGotItModalOpen(true)
              }}
            >
              Got it!
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedItemForDelete(item)
              }}
            >
              Remove
            </Button>
          </div>
        </div>

        {/* Image + details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-muted rounded-lg flex items-center justify-center min-h-[240px]">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.title}
                className="max-h-64 w-full object-contain rounded"
              />
            ) : (
              <span className="text-muted-foreground">No image available</span>
            )}
          </div>
          <div className="space-y-4">
            {item.notes ? (
              <div>
                <h2 className="font-semibold mb-1">Notes</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.notes}</p>
              </div>
            ) : null}

            {item.tags && item.tags.length > 0 ? (
              <div>
                <h2 className="font-semibold mb-1">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {item.tags.map(tag => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            {item.sourceUrl ? (
              <div>
                <h2 className="font-semibold mb-1">Source</h2>
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary underline"
                >
                  View product or instructions
                </a>
              </div>
            ) : null}
          </div>
        </div>

        {/* Undo indicator when restoring */}
        {isRestoring ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Restoring item to wishlist...
          </div>
        ) : null}
      </div>

      {/* Delete confirmation modal */}
      <DeleteConfirmationModal
        open={selectedItemForDelete !== null}
        onOpenChange={open => {
          if (!open && !isDeleting) {
            setSelectedItemForDelete(null)
          }
        }}
        itemTitle={selectedItemForDelete?.title ?? item.title}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />

      {/* Got It modal */}
      {item ? (
        <GotItModal
          open={gotItModalOpen}
          onOpenChange={setGotItModalOpen}
          item={item}
          onCompleted={handleGotItCompleted}
        />
      ) : null}
    </div>
  )
}

export default WishlistDetailPage
