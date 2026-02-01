/**
 * Add Item Page
 *
 * Page for adding a new wishlist item.
 * Uses WishlistForm component with RTK Query mutation.
 *
 * Story wish-2002: Add Item Flow
 * Story WISH-2032: Optimistic UI for Form Submission
 */

import { useCallback, useRef, useState, useEffect } from 'react'
import { useNavigate, Link as RouterLink } from '@tanstack/react-router'
import { ChevronLeft, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button, showSuccessToast, cn } from '@repo/app-component-library'
import { useAddWishlistItemMutation } from '@repo/api-client/rtk/wishlist-gallery-api'
import type { CreateWishlistItem } from '@repo/api-client/schemas/wishlist'
import { WishlistForm } from '../components/WishlistForm'
import { useLocalStorage } from '../hooks/useLocalStorage'

/**
 * WISH-2032: localStorage key for form recovery
 */
const FORM_RECOVERY_KEY = 'wishlist:form:recovery'

/**
 * WISH-2032: Error toast with retry action button
 */
interface ErrorToastWithRetryProps {
  title: string
  description: string
  onRetry: () => void
  onClose: () => void
}

function ErrorToastWithRetry({ title, description, onRetry, onClose }: ErrorToastWithRetryProps) {
  return (
    <div
      className={cn(
        'relative w-full max-w-sm p-4 border rounded-lg shadow-lg border-red-200 bg-red-50',
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start space-x-3 pr-6">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => {
              onClose()
              onRetry()
            }}
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            Retry
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * WISH-2032: Show error toast with retry button
 */
function showErrorToastWithRetry(title: string, description: string, onRetry: () => void) {
  toast.custom(
    t => (
      <ErrorToastWithRetry
        title={title}
        description={description}
        onRetry={onRetry}
        onClose={() => toast.dismiss(t)}
      />
    ),
    { duration: 10000 }, // Longer duration for error with action
  )
}

export function AddItemPage() {
  const navigate = useNavigate()
  const [addWishlistItem, { isLoading }] = useAddWishlistItemMutation()

  // WISH-2032: Track submitted state for optimistic UI
  const [hasSubmitted, setHasSubmitted] = useState(false)

  // WISH-2032: Store form data for retry functionality using localStorage
  const [recoveredFormData, setRecoveredFormData, clearRecoveredFormData] =
    useLocalStorage<CreateWishlistItem | null>(FORM_RECOVERY_KEY, null)

  // WISH-2032: Store form data for immediate retry (in-memory)
  const lastFormDataRef = useRef<CreateWishlistItem | null>(null)

  // WISH-2032: Track if we need to show recovered form
  const [initialValues, setInitialValues] = useState<Partial<CreateWishlistItem> | undefined>(
    undefined,
  )

  // WISH-2032: On mount, check for recovered form data
  useEffect(() => {
    if (recoveredFormData) {
      setInitialValues(recoveredFormData)
      // Clear the recovery data after loading it
      clearRecoveredFormData()
    }
  }, []) // Only run on mount

  /**
   * WISH-2032: Retry submission with stored form data
   */
  const handleRetry = useCallback(() => {
    if (lastFormDataRef.current) {
      // Re-trigger form submission
      void handleSubmit(lastFormDataRef.current)
    }
  }, [])

  /**
   * WISH-2032: Optimistic form submission
   *
   * Flow:
   * 1. Show success toast immediately
   * 2. Navigate to gallery immediately
   * 3. On API error: rollback navigation, show error toast with retry
   */
  const handleSubmit = useCallback(
    async (data: CreateWishlistItem) => {
      // Store form data for potential retry
      lastFormDataRef.current = data
      setHasSubmitted(true)

      // Generate temp ID for tracking
      const tempId = `temp-${Date.now()}`

      // WISH-2032: Show success toast immediately (optimistic)
      showSuccessToast('Item added!', `${data.title} has been added to your wishlist.`, 5000)

      // WISH-2032: Navigate immediately (optimistic)
      void navigate({ to: '/' })

      try {
        // Trigger mutation with error callback for rollback
        await addWishlistItem({
          ...data,
          tempId,
          onOptimisticError: error => {
            // WISH-2032: Save form data for recovery
            setRecoveredFormData(data)

            // WISH-2032: On error, navigate back to form
            void navigate({ to: '/add' })

            // Get error message
            const errorMessage =
              error && typeof error === 'object' && 'error' in error
                ? (error as { error: { data?: { message?: string } } }).error?.data?.message ||
                  'Please try again.'
                : 'Please try again.'

            // WISH-2032: Show error toast with retry button
            showErrorToastWithRetry('Failed to add item', errorMessage, handleRetry)
          },
        }).unwrap()
      } catch {
        // Error already handled by onOptimisticError callback
        // Just reset the submitted state
        setHasSubmitted(false)
      }
    },
    [addWishlistItem, navigate, handleRetry, setRecoveredFormData],
  )

  return (
    <div className="container max-w-2xl py-8">
      {/* Back link */}
      <RouterLink to="/">
        <Button variant="ghost" size="sm" className="mb-4">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Gallery
        </Button>
      </RouterLink>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Add to Wishlist</h1>
        <p className="text-muted-foreground mt-2">
          Add a new item to your wishlist. Fill in the details below.
        </p>
      </div>

      {/* Form - WISH-2032: Pass restored form data as initial values */}
      <WishlistForm
        onSubmit={handleSubmit}
        isSubmitting={isLoading || hasSubmitted}
        initialValues={initialValues}
      />
    </div>
  )
}

export default AddItemPage
