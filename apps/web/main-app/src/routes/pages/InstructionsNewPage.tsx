/**
 * Story 3.1.9 + 3.1.10 + 3.1.16 + 3.1.19: Instructions New Page
 *
 * Uploader page for creating new MOC instructions.
 * Wraps content with UploaderSessionProvider for state persistence.
 * Includes upload progress, retries, error handling, Zod form validation,
 * and finalize flow with 409/429/per-file error handling.
 */

import { useCallback, useState, useRef, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Upload, FileText, Image as ImageIcon, List, Plus, AlertCircle } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Alert,
  AlertDescription,
} from '@repo/app-component-library'
import { logger } from '@repo/logger'
import type { UploaderSession, FileCategory } from '@repo/upload-types'
import {
  UploaderSessionProvider,
  useUploaderSessionContext,
} from '@/components/Uploader/SessionProvider'
import { UploaderList } from '@/components/Uploader/UploaderList'
import { ConflictModal } from '@/components/Uploader/ConflictModal'
import { RateLimitBanner } from '@/components/Uploader/RateLimitBanner'
import { SessionExpiredBanner } from '@/components/Uploader/SessionExpiredBanner'
import { useUploadManager, type FileWithUploadUrl } from '@/hooks/useUploadManager'
import { finalizeSession, type FileValidationError } from '@/services/api/finalizeClient'
import {
  MocInstructionFormSchema,
  createEmptyMocForm,
  createEmptySetForm,
  type MocInstructionFormInput,
} from '@/types/moc-form'

const ROUTE = '/instructions/new'

/**
 * Inner content component that uses session context.
 */
function InstructionsNewContent() {
  const navigate = useNavigate()
  const { session, isDirty, wasRestored, updateSession, reset } = useUploaderSessionContext()

  // Form state with Zod validation (Story 3.1.16)
  const [formType, setFormType] = useState<'moc' | 'set'>('moc')

  const defaultMocValues = createEmptyMocForm()
  const defaultSetValues = createEmptySetForm()

  const form = useForm<MocInstructionFormInput>({
    resolver: zodResolver(MocInstructionFormSchema),
    defaultValues: defaultMocValues,
    mode: 'onBlur', // Validate on blur for live feedback
  })

  const {
    register,
    formState: { errors, isValid },
    watch,
    reset: resetForm,
  } = form

  // Sync form title with session title
  const formTitle = watch('title')
  useEffect(() => {
    if (formTitle !== session.title) {
      updateSession({ title: formTitle })
    }
  }, [formTitle, session.title, updateSession])

  // Handle type switch
  const handleTypeChange = useCallback(
    (newType: 'moc' | 'set') => {
      setFormType(newType)
      const currentValues = form.getValues()
      if (newType === 'moc') {
        resetForm({
          ...defaultMocValues,
          title: currentValues.title,
          description: currentValues.description,
          tags: currentValues.tags,
        })
      } else {
        resetForm({
          ...defaultSetValues,
          title: currentValues.title,
          description: currentValues.description,
          tags: currentValues.tags,
        })
      }
    },
    [form, resetForm, defaultMocValues, defaultSetValues],
  )

  // Upload manager
  const uploadManager = useUploadManager({
    onComplete: state => {
      logger.info('All uploads complete', { successCount: state.successCount })
    },
    onError: (fileId, errorCode) => {
      logger.warn('Upload error', { fileId, errorCode })
    },
    onSessionExpired: () => {
      logger.warn('Upload session expired')
    },
  })

  // Error state (Story 3.1.19)
  const [showConflictModal, setShowConflictModal] = useState(false)
  const [conflictTitle, setConflictTitle] = useState('')
  const [suggestedSlug, setSuggestedSlug] = useState<string | undefined>()
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0)
  const [isRefreshingSession, setIsRefreshingSession] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [fileValidationErrors, setFileValidationErrors] = useState<FileValidationError[]>([])
  const finalizingRef = useRef(false) // Idempotent double-click protection (3.1.7)

  // File input refs
  const instructionInputRef = useRef<HTMLInputElement>(null)
  const partsListInputRef = useRef<HTMLInputElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const handleReset = useCallback(() => {
    reset()
    resetForm(defaultMocValues)
    setFormType('moc')
    uploadManager.clear()
    logger.info('User reset uploader session', { route: ROUTE })
  }, [reset, resetForm, uploadManager, defaultMocValues])

  const handleCancel = useCallback(() => {
    navigate({ to: '/dashboard' })
  }, [navigate])

  // File selection handlers
  const handleFileSelect = useCallback(
    (category: FileCategory) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return

      // TODO: In real implementation, call API to get presigned URLs
      // For now, create mock file items for UI demonstration
      const fileItems: FileWithUploadUrl[] = Array.from(files).map((file, index) => ({
        file,
        category,
        fileId: `mock-${Date.now()}-${index}`,
        uploadUrl: 'https://example.com/mock-upload-url',
      }))

      uploadManager.addFiles(fileItems)
      logger.info('Files selected', { category, count: files.length })

      // Reset input
      e.target.value = ''
    },
    [uploadManager],
  )

  // Finalize handler (Story 3.1.19)
  const handleFinalize = useCallback(
    async (overrideTitle?: string) => {
      // Idempotent double-click protection (3.1.7)
      if (finalizingRef.current || !uploadManager.isComplete || rateLimitSeconds > 0) {
        return
      }

      finalizingRef.current = true
      setIsFinalizing(true)
      setFileValidationErrors([]) // Clear previous errors

      const titleToUse = overrideTitle || session.title

      logger.info('Starting finalize', { title: titleToUse })

      try {
        const result = await finalizeSession({
          uploadSessionId: session.uploadToken || '',
          title: titleToUse,
          description: session.description,
          tags: session.tags,
          theme: session.theme,
        })

        if (result.success) {
          logger.info('Finalize complete', {
            mocId: result.data.id,
            slug: result.data.slug,
            idempotent: result.idempotent,
          })

          // Clear session on success
          reset()
          uploadManager.clear()

          // Navigate to the new MOC page
          navigate({ to: `/instructions/${result.data.slug}` })
        } else {
          const { error } = result

          // Handle 409 conflict (Story 3.1.19)
          if (error.isConflict) {
            setConflictTitle(titleToUse)
            setSuggestedSlug(error.suggestedSlug)
            setShowConflictModal(true)
          }
          // Handle 429 rate limit (Story 3.1.19)
          else if (error.isRateLimit) {
            setRateLimitSeconds(error.retryAfterSeconds || 60)
          }
          // Handle per-file validation errors (Story 3.1.19)
          else if (error.hasFileErrors && error.fileErrors) {
            setFileValidationErrors(error.fileErrors)
          }
          // Handle other errors
          else {
            logger.warn('Finalize failed', { errorCode: error.code, message: error.message })
          }
        }
      } catch (err) {
        logger.error('Unexpected finalize error', { error: err })
      } finally {
        finalizingRef.current = false
        setIsFinalizing(false)
      }
    },
    [uploadManager, session, reset, navigate, rateLimitSeconds],
  )

  // Conflict resolution (Story 3.1.19)
  const handleConflictConfirm = useCallback(
    (newTitle: string) => {
      updateSession({ title: newTitle })
      setShowConflictModal(false)
      setSuggestedSlug(undefined)
      // Retry finalize with new title
      handleFinalize(newTitle)
    },
    [updateSession, handleFinalize],
  )

  // Use suggested slug (Story 3.1.19)
  const handleUseSuggestedSlug = useCallback(() => {
    setShowConflictModal(false)
    setSuggestedSlug(undefined)
    // Retry finalize with same title (backend will use suggested slug)
    handleFinalize()
  }, [handleFinalize])

  // Handle conflict modal cancel
  const handleConflictCancel = useCallback(() => {
    setShowConflictModal(false)
    setSuggestedSlug(undefined)
  }, [])

  // Session refresh
  const handleRefreshSession = useCallback(async () => {
    setIsRefreshingSession(true)
    logger.info('Refreshing upload session')

    // TODO: Call API to get new presigned URLs for expired files
    // Then call uploadManager.retryAll()

    setIsRefreshingSession(false)
    uploadManager.retryAll()
  }, [uploadManager])

  // Check if finalize is allowed (Story 3.1.16 + 3.1.19)
  const hasInstruction = uploadManager.state.files.some(
    f => f.category === 'instruction' && f.status === 'success',
  )
  // Disable during rate limit countdown (Story 3.1.19)
  const canFinalize =
    hasInstruction && uploadManager.isComplete && isValid && rateLimitSeconds === 0

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New MOC Instructions</h1>
        <p className="text-muted-foreground">
          Share your LEGO MOC creation with the community. Upload your instruction PDF, parts list,
          and images.
        </p>
        {wasRestored ? (
          <p className="text-sm text-primary mt-2" role="status" aria-live="polite">
            ✓ Your previous progress has been restored.
          </p>
        ) : null}
      </div>

      {/* Error banners */}
      <div className="space-y-4 mb-6">
        <RateLimitBanner
          visible={rateLimitSeconds > 0}
          retryAfterSeconds={rateLimitSeconds}
          onRetry={() => {
            setRateLimitSeconds(0)
            handleFinalize()
          }}
          onDismiss={() => setRateLimitSeconds(0)}
        />

        <SessionExpiredBanner
          visible={uploadManager.state.expiredCount > 0}
          expiredCount={uploadManager.state.expiredCount}
          onRefreshSession={handleRefreshSession}
          isRefreshing={isRefreshingSession}
        />
      </div>

      {/* Error Summary (Story 3.1.16) */}
      {Object.keys(errors).length > 0 && (
        <Alert variant="destructive" role="alert" aria-live="polite" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-2">Please fix the following errors:</p>
            <ul className="list-disc list-inside space-y-1">
              {Object.entries(errors).map(([field, error]) => (
                <li key={field}>
                  <a
                    href={`#${field}`}
                    className="underline hover:no-underline"
                    onClick={e => {
                      e.preventDefault()
                      document.getElementById(field)?.focus()
                    }}
                  >
                    {error?.message as string}
                  </a>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Per-file validation errors (Story 3.1.19) */}
      {fileValidationErrors.length > 0 && (
        <Alert variant="destructive" role="alert" aria-live="polite" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-2">File validation failed:</p>
            <ul className="list-disc list-inside space-y-1">
              {fileValidationErrors.map(err => (
                <li key={err.fileId}>
                  <span className="font-medium">{err.filename}</span>: {err.message}
                  {err.reason === 'magic-bytes' && (
                    <span className="text-xs ml-1">(file content mismatch)</span>
                  )}
                  {err.reason === 'type' && (
                    <span className="text-xs ml-1">(unsupported file type)</span>
                  )}
                  {err.reason === 'size' && <span className="text-xs ml-1">(file too large)</span>}
                </li>
              ))}
            </ul>
            <p className="text-sm mt-2">Please re-upload the affected files to continue.</p>
          </AlertDescription>
        </Alert>
      )}

      {/* Main form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Files
          </CardTitle>
          <CardDescription>
            Add your instruction PDF (required), parts list, thumbnail, and gallery images.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Type selector (Story 3.1.16) */}
          <div className="flex gap-4 pb-4 border-b">
            <Button
              type="button"
              variant={formType === 'moc' ? 'default' : 'outline'}
              onClick={() => handleTypeChange('moc')}
              aria-pressed={formType === 'moc'}
            >
              MOC
            </Button>
            <Button
              type="button"
              variant={formType === 'set' ? 'default' : 'outline'}
              onClick={() => handleTypeChange('set')}
              aria-pressed={formType === 'set'}
            >
              Set
            </Button>
          </div>

          {/* Title and description with validation */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="Enter MOC title (3-120 characters)..."
                aria-required="true"
                aria-invalid={!!errors.title}
                aria-describedby={errors.title ? 'title-error' : undefined}
                className={errors.title ? 'border-destructive' : ''}
              />
              {errors.title ? (
                <p id="title-error" className="text-sm text-destructive" role="alert">
                  {errors.title.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <textarea
                id="description"
                {...register('description')}
                placeholder="Describe your MOC (10-2000 characters)..."
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px] ${errors.description ? 'border-destructive' : ''}`}
                aria-required="true"
                aria-invalid={!!errors.description}
                aria-describedby={errors.description ? 'description-error' : undefined}
              />
              {errors.description ? (
                <p id="description-error" className="text-sm text-destructive" role="alert">
                  {errors.description.message}
                </p>
              ) : null}
            </div>
          </div>

          {/* Type-specific fields (Story 3.1.16) */}
          <Accordion type="single" collapsible className="border-t pt-4">
            <AccordionItem value="details">
              <AccordionTrigger>
                {formType === 'moc' ? 'MOC Details' : 'Set Details'} (Required)
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  {formType === 'moc' ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="author">Author *</Label>
                          <Input
                            id="author"
                            {...register('author' as const)}
                            placeholder="Designer name"
                            aria-required="true"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="setNumber">MOC ID *</Label>
                          <Input
                            id="setNumber"
                            {...register('setNumber')}
                            placeholder="e.g., MOC-12345"
                            aria-required="true"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="partsCount">Parts Count *</Label>
                          <Input
                            id="partsCount"
                            type="number"
                            {...register('partsCount' as const, { valueAsNumber: true })}
                            placeholder="Number of parts"
                            aria-required="true"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="theme">Theme *</Label>
                          <Input
                            id="theme"
                            {...register('theme')}
                            placeholder="e.g., Technic, City"
                            aria-required="true"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="brand">Brand *</Label>
                          <Input
                            id="brand"
                            {...register('brand' as const)}
                            placeholder="e.g., LEGO"
                            aria-required="true"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="setNumber">Set Number *</Label>
                          <Input
                            id="setNumber"
                            {...register('setNumber')}
                            placeholder="e.g., 42143"
                            aria-required="true"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="theme">Theme *</Label>
                        <Input
                          id="theme"
                          {...register('theme')}
                          placeholder="e.g., Technic, City"
                          aria-required="true"
                        />
                      </div>
                    </>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* File upload buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            {/* Instructions (PDF) */}
            <div>
              <input
                ref={instructionInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileSelect('instruction')}
                className="hidden"
                aria-label="Select instruction PDF"
              />
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => instructionInputRef.current?.click()}
                disabled={uploadManager.isUploading}
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Instructions</span>
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            {/* Parts List */}
            <div>
              <input
                ref={partsListInputRef}
                type="file"
                accept=".csv,.json,.xml,.xlsx,.xls,.txt"
                onChange={handleFileSelect('parts-list')}
                className="hidden"
                aria-label="Select parts list file"
              />
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => partsListInputRef.current?.click()}
                disabled={uploadManager.isUploading}
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Parts List</span>
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            {/* Thumbnail */}
            <div>
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                onChange={handleFileSelect('thumbnail')}
                className="hidden"
                aria-label="Select thumbnail image"
              />
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => thumbnailInputRef.current?.click()}
                disabled={uploadManager.isUploading}
              >
                <ImageIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Thumbnail</span>
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            {/* Gallery Images */}
            <div>
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                multiple
                onChange={handleFileSelect('image')}
                className="hidden"
                aria-label="Select gallery images"
              />
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => galleryInputRef.current?.click()}
                disabled={uploadManager.isUploading}
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Gallery</span>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Upload list */}
          {uploadManager.state.files.length > 0 && (
            <div className="pt-4 border-t">
              <UploaderList
                state={uploadManager.state}
                onCancel={uploadManager.cancel}
                onRetry={uploadManager.retry}
                onRemove={uploadManager.remove}
                disabled={isFinalizing}
              />
            </div>
          )}

          {/* Status */}
          <div className="text-xs text-muted-foreground pt-4 border-t">
            <p>
              Step: {session.step} | Session Files: {session.files.length} | Upload Files:{' '}
              {uploadManager.state.files.length} | Dirty: {isDirty ? 'Yes' : 'No'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Button variant="outline" onClick={handleCancel} disabled={isFinalizing}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={isFinalizing}>
              Reset
            </Button>
            <Button
              onClick={() => handleFinalize()}
              disabled={!canFinalize || isFinalizing}
              className="ml-auto"
              aria-busy={isFinalizing}
            >
              {isFinalizing ? 'Finalizing...' : 'Finalize & Publish'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conflict modal (Story 3.1.19) */}
      <ConflictModal
        open={showConflictModal}
        currentTitle={conflictTitle}
        suggestedSlug={suggestedSlug}
        onConfirm={handleConflictConfirm}
        onUseSuggested={handleUseSuggestedSlug}
        onCancel={handleConflictCancel}
        isLoading={isFinalizing}
      />
    </div>
  )
}

/**
 * Instructions New Page with session provider.
 */
export function InstructionsNewPage() {
  const handleRestore = useCallback((session: UploaderSession) => {
    logger.info('Session restored in InstructionsNewPage', {
      title: session.title,
      step: session.step,
      fileCount: session.files.length,
    })
  }, [])

  return (
    <UploaderSessionProvider route={ROUTE} onRestore={handleRestore}>
      <InstructionsNewContent />
    </UploaderSessionProvider>
  )
}
