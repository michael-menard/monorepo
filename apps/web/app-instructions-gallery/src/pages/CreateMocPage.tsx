/**
 * Create MOC Page
 *
 * Page for creating a new MOC instruction entry.
 * Uses MocForm component with RTK Query mutation.
 *
 * Story INST-1102: Create Basic MOC
 */

import { useCallback, useRef, useState, useEffect } from 'react'
import { ChevronLeft, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button, showSuccessToast, cn } from '@repo/app-component-library'
import { useCreateMocMutation } from '@repo/api-client/rtk/instructions-api'
import type { CreateMocInput } from '@repo/api-client/schemas/instructions'
import { MocForm } from '../components/MocForm'
import { useLocalStorage } from '@repo/hooks/useLocalStorage'

/**
 * INST-1102: localStorage key for form recovery
 */
const FORM_RECOVERY_KEY = 'moc:form:recovery'

/**
 * INST-1102: Error toast with retry action button
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
 * INST-1102: Show error toast with retry button
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

export interface CreateMocPageProps {
  /**
   * Optional className for styling
   */
  className?: string
}

export function CreateMocPage({ className }: CreateMocPageProps) {
  const [createMoc, { isLoading }] = useCreateMocMutation()

  // INST-1102: Track submitted state for optimistic UI
  const [hasSubmitted, setHasSubmitted] = useState(false)

  // INST-1102: Store form data for retry functionality using localStorage
  const [recoveredFormData, setRecoveredFormData, clearRecoveredFormData] =
    useLocalStorage<CreateMocInput | null>(FORM_RECOVERY_KEY, null)

  // INST-1102: Store form data for immediate retry (in-memory)
  const lastFormDataRef = useRef<CreateMocInput | null>(null)

  // INST-1102: Track if we need to show recovered form
  const [initialValues, setInitialValues] = useState<Partial<CreateMocInput> | undefined>(undefined)

  // INST-1102: Track API error for display
  const [apiError, setApiError] = useState<string | undefined>(undefined)

  // INST-1102: On mount, check for recovered form data
  useEffect(() => {
    if (recoveredFormData) {
      setInitialValues(recoveredFormData)
      // Clear the recovery data after loading it
      clearRecoveredFormData()
    }
  }, []) // Only run on mount

  // INST-1102: Focus title input on mount (handled in MocForm)

  // INST-1102: Handle Escape key to navigate back
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading && !hasSubmitted) {
        handleNavigateBack()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isLoading, hasSubmitted])

  /**
   * INST-1102: Navigate back to gallery
   */
  const handleNavigateBack = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.href = '/mocs'
    }
  }, [])

  /**
   * INST-1102: Retry submission with stored form data
   */
  const handleRetry = useCallback(() => {
    if (lastFormDataRef.current) {
      // Re-trigger form submission
      void handleSubmit(lastFormDataRef.current)
    }
  }, [])

  /**
   * INST-1102: Form submission with proper async handling
   *
   * Flow:
   * 1. Submit to API and wait for response
   * 2. On success: Show toast and navigate to gallery
   * 3. On error: Show error toast with retry option
   */
  const handleSubmit = useCallback(
    async (data: CreateMocInput) => {
      // Store form data for potential retry
      lastFormDataRef.current = data
      setHasSubmitted(true)
      setApiError(undefined)

      try {
        await createMoc(data).unwrap()

        // INST-1102: Show success toast after API success
        showSuccessToast('MOC created!', `${data.title} has been created.`, 5000)

        // INST-1102: Navigate to gallery after short delay (allows toast to render)
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.location.href = '/mocs'
          }, 500)
        }
      } catch (error) {
        // INST-1102: Save form data for recovery
        setRecoveredFormData(data)

        // Get error message
        const errorMessage =
          error && typeof error === 'object' && 'data' in error
            ? ((error as { data?: { message?: string } }).data?.message ?? 'Please try again.')
            : error && typeof error === 'object' && 'error' in error
              ? ((error as { error?: string }).error ?? 'Please try again.')
              : 'Please try again.'

        setApiError(errorMessage)

        // INST-1102: Show error toast with retry button
        showErrorToastWithRetry('Failed to create MOC', errorMessage, handleRetry)
      } finally {
        setHasSubmitted(false)
      }
    },
    [createMoc, handleRetry, setRecoveredFormData],
  )

  return (
    <div className={cn('container max-w-2xl py-8', className)} data-testid="create-moc-page">
      {/* Back link */}
      <a href="/mocs">
        <Button variant="ghost" size="sm" className="mb-4" data-testid="back-button">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Gallery
        </Button>
      </a>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Add New MOC</h1>
        <p className="text-muted-foreground mt-2">Create a new MOC to add to your collection.</p>
      </div>

      {/* Form - INST-1102: Pass restored form data as initial values */}
      <MocForm
        onSubmit={handleSubmit}
        onCancel={handleNavigateBack}
        isSubmitting={isLoading || hasSubmitted}
        initialValues={initialValues}
        apiError={apiError}
      />
    </div>
  )
}

export default CreateMocPage
