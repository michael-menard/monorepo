/**
 * Edit MOC Page
 *
 * Page for editing an existing MOC instruction entry.
 * Uses MocForm component with RTK Query mutation and data fetching.
 *
 * Story INST-1108: Edit MOC Metadata
 */

import { useCallback, useRef, useState, useEffect } from 'react'
import { ChevronLeft, RotateCcw, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { Button, showSuccessToast, cn, Skeleton } from '@repo/app-component-library'
import { useUpdateMocMutation, useGetMocDetailQuery } from '@repo/api-client/rtk/instructions-api'
import type { UpdateMocInput, CreateMocInput } from '@repo/api-client/schemas/instructions'
import { MocForm } from '../../components/MocForm'
import { useLocalStorage } from '../../hooks/useLocalStorage'

/**
 * INST-1108 FIX: Adapter to convert UpdateMocInput to CreateMocInput format
 * UpdateMocInput has nullable fields, but MocForm expects CreateMocInput without nullable wrappers.
 * This function filters out null values and converts to the expected type.
 */
function adaptUpdateToCreateInput(data: Partial<UpdateMocInput>): Partial<CreateMocInput> {
  const result: Partial<CreateMocInput> = {}

  if (data.title !== undefined && data.title !== null) result.title = data.title
  if (data.description !== undefined && data.description !== null)
    result.description = data.description
  if (data.theme !== undefined && data.theme !== null) result.theme = data.theme
  if (data.tags !== undefined && data.tags !== null) result.tags = data.tags
  if (data.author !== undefined && data.author !== null) result.author = data.author
  if (data.partsCount !== undefined && data.partsCount !== null) result.partsCount = data.partsCount
  if (data.minifigCount !== undefined && data.minifigCount !== null)
    result.minifigCount = data.minifigCount
  if (data.subtheme !== undefined && data.subtheme !== null) result.subtheme = data.subtheme
  if (data.brand !== undefined && data.brand !== null) result.brand = data.brand
  if (data.setNumber !== undefined && data.setNumber !== null) result.setNumber = data.setNumber
  if (data.releaseYear !== undefined && data.releaseYear !== null)
    result.releaseYear = data.releaseYear

  return result
}

/**
 * INST-1108: Error toast with retry action button
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
 * INST-1108: Show error toast with retry button
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

/**
 * Loading skeleton for edit page
 */
function EditMocPageSkeleton() {
  return (
    <div className="container max-w-2xl py-8" data-testid="edit-moc-page-skeleton">
      <Skeleton className="h-9 w-32 mb-4" />

      <div className="mb-8">
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  )
}

/**
 * Not found state for edit page
 */
function EditMocPageNotFound() {
  return (
    <div className="container mx-auto py-6" data-testid="edit-moc-page-not-found">
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <BookOpen className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">MOC Not Found</h2>
        <p className="text-muted-foreground max-w-md">
          The MOC you&apos;re trying to edit doesn&apos;t exist or you don&apos;t have permission to
          edit it.
        </p>
        <a href="/mocs">
          <Button variant="outline">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Gallery
          </Button>
        </a>
      </div>
    </div>
  )
}

export interface EditMocPageProps {
  /**
   * MOC ID to edit
   */
  mocIdOrSlug: string

  /**
   * Optional className for styling
   */
  className?: string
}

export function EditMocPage({ mocIdOrSlug, className }: EditMocPageProps) {
  const [updateMoc, { isLoading: isUpdating }] = useUpdateMocMutation()

  // INST-1108: Fetch MOC data for pre-population
  const {
    data: mocData,
    isLoading: isFetching,
    error: fetchError,
  } = useGetMocDetailQuery(mocIdOrSlug)

  // INST-1108: Track submitted state for optimistic UI
  const [hasSubmitted, setHasSubmitted] = useState(false)

  // INST-1108: Form recovery key (specific to this MOC)
  const formRecoveryKey = `moc-edit-draft-${mocIdOrSlug}`

  // INST-1108: Store form data for retry functionality using localStorage
  const [recoveredFormData, setRecoveredFormData, clearRecoveredFormData] =
    useLocalStorage<UpdateMocInput | null>(formRecoveryKey, null)

  // INST-1108: Store form data for immediate retry (in-memory)
  const lastFormDataRef = useRef<UpdateMocInput | null>(null)

  // INST-1108: Track if we need to show recovered form
  // INST-1108 FIX: Use CreateMocInput format for MocForm compatibility
  const [initialValues, setInitialValues] = useState<Partial<CreateMocInput> | undefined>(undefined)

  // INST-1108: Track API error for display
  const [apiError, setApiError] = useState<string | undefined>(undefined)

  // INST-1108: On mount, check for recovered form data, otherwise use MOC data
  useEffect(() => {
    if (recoveredFormData) {
      // INST-1108 FIX: Adapt UpdateMocInput to CreateMocInput format
      setInitialValues(adaptUpdateToCreateInput(recoveredFormData))
      // Clear the recovery data after loading it
      clearRecoveredFormData()
    } else if (mocData) {
      // Pre-populate form with current MOC data
      // INST-1108 FIX: Adapt MOC data to CreateMocInput format
      setInitialValues(
        adaptUpdateToCreateInput({
          title: mocData.title,
          description: mocData.description || undefined,
          theme: mocData.theme || undefined,
          tags: mocData.tags || undefined,
        }),
      )
    }
  }, [mocData, recoveredFormData, clearRecoveredFormData])

  // INST-1108: Handle Escape key to navigate back
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isUpdating && !hasSubmitted) {
        handleNavigateBack()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isUpdating, hasSubmitted])

  /**
   * INST-1108: Navigate back to detail page
   */
  const handleNavigateBack = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.href = `/mocs/${mocIdOrSlug}`
    }
  }, [mocIdOrSlug])

  /**
   * INST-1108: Retry submission with stored form data
   */
  const handleRetry = useCallback(() => {
    if (lastFormDataRef.current) {
      // Re-trigger form submission
      void handleSubmit(lastFormDataRef.current)
    }
  }, [])

  /**
   * INST-1108: Form submission with proper async handling
   *
   * Flow:
   * 1. Submit to API and wait for response
   * 2. On success: Show toast and navigate to detail page
   * 3. On error: Show error toast with retry option and save draft
   */
  const handleSubmit = useCallback(
    async (data: UpdateMocInput) => {
      // Store form data for potential retry
      lastFormDataRef.current = data
      setHasSubmitted(true)
      setApiError(undefined)

      try {
        await updateMoc({ id: mocIdOrSlug, input: data }).unwrap()

        // INST-1108: Clear recovery data on success
        clearRecoveredFormData()

        // INST-1108: Show success toast after API success
        showSuccessToast('MOC updated!', `${data.title || 'MOC'} has been updated.`, 5000)

        // INST-1108: Navigate to detail page after short delay (allows toast to render)
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.location.href = `/mocs/${mocIdOrSlug}`
          }, 500)
        }
      } catch (error) {
        // INST-1108: Save form data for recovery
        setRecoveredFormData(data)

        // Get error message
        const errorMessage =
          error && typeof error === 'object' && 'data' in error
            ? ((error as { data?: { message?: string } }).data?.message ?? 'Please try again.')
            : error && typeof error === 'object' && 'error' in error
              ? ((error as { error?: string }).error ?? 'Please try again.')
              : 'Please try again.'

        setApiError(errorMessage)

        // INST-1108: Show error toast with retry button
        showErrorToastWithRetry('Failed to update MOC', errorMessage, handleRetry)
      } finally {
        setHasSubmitted(false)
      }
    },
    [updateMoc, mocIdOrSlug, handleRetry, setRecoveredFormData, clearRecoveredFormData],
  )

  // INST-1108: Show loading skeleton while fetching
  if (isFetching) {
    return <EditMocPageSkeleton />
  }

  // INST-1108: Show 404 if MOC not found or unauthorized
  if (fetchError || !mocData) {
    return <EditMocPageNotFound />
  }

  return (
    <div className={cn('container max-w-2xl py-8', className)} data-testid="edit-moc-page">
      {/* Back link */}
      <a href={`/mocs/${mocIdOrSlug}`}>
        <Button variant="ghost" size="sm" className="mb-4" data-testid="back-button">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Details
        </Button>
      </a>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit MOC</h1>
        <p className="text-muted-foreground mt-2">Update the details of your MOC.</p>
      </div>

      {/* Form - INST-1108: Pass MOC data as initial values */}
      <MocForm
        onSubmit={handleSubmit}
        onCancel={handleNavigateBack}
        isSubmitting={isUpdating || hasSubmitted}
        initialValues={initialValues}
        apiError={apiError}
      />
    </div>
  )
}

export default EditMocPage
