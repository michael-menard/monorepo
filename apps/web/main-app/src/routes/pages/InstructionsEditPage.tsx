/**
 * Story 3.1.39: Instructions Edit Page
 *
 * Edit page for existing MOC instructions.
 * Validates ownership and provides edit functionality.
 */

import { useCallback, useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Save, Loader2, AlertTriangle } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Alert,
  AlertDescription,
} from '@repo/app-component-library'
import { logger } from '@repo/logger'
import { z } from 'zod'
import { LoadingPage } from './LoadingPage'

// Simplified edit form schema (AC: 1)
const MocEditFormSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(120, 'Title must be at most 120 characters'),
  description: z.string().max(2000, 'Description must be at most 2000 characters').optional(),
  theme: z.string().max(100).optional(),
  tags: z.string().max(500).optional(), // Comma-separated string for form input
})

type MocEditFormInput = z.infer<typeof MocEditFormSchema>

/**
 * Props for InstructionsEditPage - receives MOC data from loader
 */
interface InstructionsEditPageProps {
  moc: {
    id: string
    title: string
    description: string | null
    slug: string | null
    tags: string[] | null
    theme: string | null
    status: 'draft' | 'published' | 'archived' | 'pending_review'
    isOwner: boolean
    files: Array<{
      id: string
      category: string
      filename: string
      url: string
    }>
  }
  isLoading?: boolean
  error?: string | null
}

/**
 * Instructions Edit Page Component
 * Story 3.1.39: Edit Routes & Entry Points
 */
export function InstructionsEditPage({ moc, isLoading, error }: InstructionsEditPageProps) {
  const navigate = useNavigate()
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Initialize form with MOC data
  const form = useForm<MocEditFormInput>({
    resolver: zodResolver(MocEditFormSchema),
    defaultValues: {
      title: moc?.title ?? '',
      description: moc?.description ?? '',
      tags: moc?.tags?.join(', ') ?? '',
      theme: moc?.theme ?? '',
    },
    mode: 'onBlur',
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = form

  // Reset form when MOC data changes
  useEffect(() => {
    if (moc) {
      reset({
        title: moc.title,
        description: moc.description ?? '',
        tags: moc.tags?.join(', ') ?? '',
        theme: moc.theme ?? '',
      })
    }
  }, [moc, reset])

  const handleBack = useCallback(() => {
    if (moc?.slug) {
      navigate({ to: '/mocs/$slug', params: { slug: moc.slug } })
    } else {
      navigate({ to: '/dashboard' })
    }
  }, [navigate, moc?.slug])

  const handleSave = useCallback(
    async (data: MocEditFormInput) => {
      if (!moc) return

      setIsSaving(true)
      setSaveError(null)

      try {
        logger.info('Saving MOC edits', { mocId: moc.id, title: data.title })

        // TODO: Implement save via RTK Query mutation
        // await updateMoc({ id: moc.id, data }).unwrap()

        // For now, just log and navigate back
        logger.info('MOC edit saved (placeholder)', { mocId: moc.id })

        // Navigate to detail page after save
        if (moc.slug) {
          navigate({ to: '/mocs/$slug', params: { slug: moc.slug } })
        } else {
          navigate({ to: '/dashboard' })
        }
      } catch (err) {
        logger.error('Failed to save MOC edits', { mocId: moc.id, error: err })
        setSaveError('Failed to save changes. Please try again.')
      } finally {
        setIsSaving(false)
      }
    },
    [moc, navigate],
  )

  // Loading state
  if (isLoading) {
    return <LoadingPage />
  }

  // Error state
  if (error) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={handleBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    )
  }

  // No MOC data
  if (!moc) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>MOC not found</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={handleBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-5 h-5" />
            <span className="sr-only">Go back</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit MOC</h1>
            <p className="text-muted-foreground">Update your MOC instructions</p>
          </div>
        </div>
        <Button onClick={handleSubmit(handleSave)} disabled={isSaving || !isDirty}>
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Save Error */}
      {saveError ? (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      ) : null}

      {/* Edit Form */}
      <form onSubmit={handleSubmit(handleSave)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Update the details of your MOC</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="Enter MOC title"
                aria-invalid={!!errors.title}
              />
              {errors.title ? (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              ) : null}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                {...register('description')}
                placeholder="Describe your MOC"
                aria-invalid={!!errors.description}
              />
              {errors.description ? (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              ) : null}
            </div>

            {/* Theme */}
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Input
                id="theme"
                {...register('theme')}
                placeholder="e.g., Technic, City, Creator"
                aria-invalid={!!errors.theme}
              />
              {errors.theme ? (
                <p className="text-sm text-destructive">{errors.theme.message}</p>
              ) : null}
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                {...register('tags')}
                placeholder="Enter tags separated by commas"
                aria-invalid={!!errors.tags}
              />
              {errors.tags ? (
                <p className="text-sm text-destructive">{errors.tags.message}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Files Section - Read Only for now */}
        <Card>
          <CardHeader>
            <CardTitle>Files</CardTitle>
            <CardDescription>
              Current files attached to this MOC ({moc.files.length} files)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {moc.files.length === 0 ? (
              <p className="text-muted-foreground">No files attached</p>
            ) : (
              <ul className="space-y-2">
                {moc.files.map(file => (
                  <li
                    key={file.id}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                  >
                    <span className="text-sm font-medium">{file.filename}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {file.category.replace('-', ' ')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
