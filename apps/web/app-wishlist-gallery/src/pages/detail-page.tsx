/**
 * Wishlist Detail Page
 *
 * Displays full details of a wishlist item with actions:
 * - View all metadata
 * - "Got it!" button
 * - Edit button
 * - Delete button
 *
 * Story wish-2003: Detail & Edit Pages
 */

import { useState, useCallback } from 'react'
import { z } from 'zod'
import {
  Button,
  Badge,
  Skeleton,
  Card,
  CardContent,
  useToast,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/app-component-library'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  ShoppingCart,
  Package,
  ExternalLink,
  Calendar,
  Puzzle,
} from 'lucide-react'
import {
  useGetWishlistItemQuery,
  useDeleteWishlistItemMutation,
} from '@repo/api-client/rtk/wishlist-gallery-api'
import { PriceDisplay } from '../components/PriceDisplay'
import { PriorityBadge } from '../components/PriorityBadge'

/**
 * DetailPage props schema
 */
export const DetailPagePropsSchema = z.object({
  /** Wishlist item ID */
  itemId: z.string().uuid(),
  /** Navigation callback to go back to gallery */
  onBack: z.function().args().returns(z.void()),
  /** Navigation callback to go to edit page */
  onEdit: z.function().args(z.string()).returns(z.void()),
  /** Additional CSS classes */
  className: z.string().optional(),
})

export type DetailPageProps = z.infer<typeof DetailPagePropsSchema>

/**
 * Store badge colors
 */
const storeBadgeColors: Record<string, string> = {
  LEGO: 'bg-yellow-500 text-yellow-950',
  Barweer: 'bg-green-500 text-white',
  Cata: 'bg-purple-500 text-white',
  BrickLink: 'bg-blue-500 text-white',
  Other: 'bg-gray-500 text-white',
}

/**
 * Format date for display
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Detail Page Skeleton
 */
function DetailSkeleton() {
  return (
    <div className="space-y-6" data-testid="detail-skeleton">
      <Skeleton className="h-8 w-32" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Skeleton className="aspect-square rounded-lg" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-8 w-32" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
          <Skeleton className="h-24" />
        </div>
      </div>
    </div>
  )
}

/**
 * Not Found State
 */
function NotFoundState({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16" data-testid="not-found-state">
      <Package className="h-16 w-16 text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold mb-2">Item Not Found</h2>
      <p className="text-muted-foreground mb-6">
        This wishlist item doesn't exist or has been deleted.
      </p>
      <Button onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Wishlist
      </Button>
    </div>
  )
}

/**
 * Wishlist Detail Page Component
 */
export function DetailPage({ itemId, onBack, onEdit, className = '' }: DetailPageProps) {
  const { toast } = useToast()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [gotItDialogOpen, setGotItDialogOpen] = useState(false)

  // Fetch item data
  const { data: item, isLoading, error } = useGetWishlistItemQuery(itemId)

  // Delete mutation
  const [deleteItem, { isLoading: isDeleting }] = useDeleteWishlistItemMutation()

  // Handle delete
  const handleDelete = useCallback(async () => {
    try {
      await deleteItem(itemId).unwrap()
      toast({
        title: 'Item deleted',
        description: 'The wishlist item has been removed.',
      })
      onBack()
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete the item. Please try again.',
        variant: 'destructive',
      })
    }
    setDeleteDialogOpen(false)
  }, [deleteItem, itemId, onBack, toast])

  // Handle "Got it!" - mark as acquired (future: move to collection)
  const handleGotIt = useCallback(() => {
    // TODO: Implement got-it flow (wish-2004)
    toast({
      title: 'Coming soon!',
      description: 'The "Got it!" feature will be available in a future update.',
    })
    setGotItDialogOpen(false)
  }, [toast])

  // Loading state
  if (isLoading) {
    return (
      <div className={className}>
        <DetailSkeleton />
      </div>
    )
  }

  // Error / Not found state
  if (error || !item) {
    return (
      <div className={className}>
        <NotFoundState onBack={onBack} />
      </div>
    )
  }

  return (
    <div className={className} data-testid="detail-page">
      {/* Back button */}
      <Button variant="ghost" onClick={onBack} className="mb-6" data-testid="detail-back-button">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Wishlist
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image */}
        <div className="aspect-square bg-muted rounded-lg overflow-hidden">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-full object-cover"
              data-testid="detail-image"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          {/* Title & Store */}
          <div>
            <Badge
              className={storeBadgeColors[item.store] || storeBadgeColors.Other}
              data-testid="detail-store"
            >
              {item.store}
            </Badge>
            <h1 className="text-3xl font-bold mt-2" data-testid="detail-title">
              {item.title}
            </h1>
            {item.setNumber ? (
              <p className="text-muted-foreground" data-testid="detail-set-number">
                Set #{item.setNumber}
              </p>
            ) : null}
          </div>

          {/* Price */}
          <PriceDisplay
            price={item.price}
            currency={item.currency}
            size="lg"
            data-testid="detail-price"
          />

          {/* Priority */}
          <PriorityBadge
            priority={item.priority ?? 0}
            showLabel
            size="md"
            data-testid="detail-priority"
          />

          {/* Metadata Grid */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {item.pieceCount ? (
                  <div data-testid="detail-piece-count">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Puzzle className="h-4 w-4" />
                      Pieces
                    </span>
                    <p className="font-medium">{item.pieceCount.toLocaleString()}</p>
                  </div>
                ) : null}
                {item.releaseDate ? (
                  <div data-testid="detail-release-date">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Release Date
                    </span>
                    <p className="font-medium">{formatDate(item.releaseDate)}</p>
                  </div>
                ) : null}
                <div>
                  <span className="text-muted-foreground">Added</span>
                  <p className="font-medium">{formatDate(item.createdAt)}</p>
                </div>
                {item.updatedAt !== item.createdAt && (
                  <div>
                    <span className="text-muted-foreground">Updated</span>
                    <p className="font-medium">{formatDate(item.updatedAt)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          {item.tags && item.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2" data-testid="detail-tags">
              {item.tags.map(tag => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}

          {/* Source URL */}
          {item.sourceUrl ? (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              data-testid="detail-source-url"
            >
              <ExternalLink className="h-4 w-4" />
              View on {item.store}
            </a>
          ) : null}

          {/* Notes */}
          {item.notes ? (
            <Card data-testid="detail-notes">
              <CardContent className="pt-6">
                <h3 className="font-medium mb-2">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.notes}</p>
              </CardContent>
            </Card>
          ) : null}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              size="lg"
              className="flex-1"
              onClick={() => setGotItDialogOpen(true)}
              data-testid="detail-got-it-button"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Got it!
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => onEdit(itemId)}
              data-testid="detail-edit-button"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
              data-testid="detail-delete-button"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Wishlist Item?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{item.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Got It Dialog (placeholder for wish-2004) */}
      <AlertDialog open={gotItDialogOpen} onOpenChange={setGotItDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Acquired?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark "{item.title}" as acquired. You can optionally add it to your
              collection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleGotIt}>Got It!</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default DetailPage
