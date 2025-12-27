/**
 * Story 3.1.39: Instructions Edit Page
 * Story 3.1.40: Edit Page & Data Fetching
 *
 * Edit page for existing MOC instructions.
 * Pre-populates form with MOC data and displays existing files.
 */

import { useCallback, useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
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
import {
  EditMocFormSchema,
  MocForEditResponseSchema,
  type EditMocFormInput,
} from '@repo/upload-types'
import { FileList } from '../../components/MocEdit/FileList'

/**
 * Props schema for InstructionsEditPage - receives MOC data from module
 */
export const InstructionsEditPagePropsSchema = z.object({
  moc: MocForEditResponseSchema,
})

export type InstructionsEditPageProps = z.infer<typeof InstructionsEditPagePropsSchema>

/**
 * Instructions Edit Page Component
 * Story 3.1.39: Edit Routes & Entry Points
 * Story 3.1.40: Edit Page & Data Fetching
 *
 * Displays pre-populated form with MOC data and existing files.
 */
export function InstructionsEditPage({ moc }: InstructionsEditPageProps) {
  const navigate = useNavigate()
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Initialize form with MOC data using the shared schema
  const form = useForm<EditMocFormInput>({
    resolver: zodResolver(EditMocFormSchema),
    defaultValues: {
      title: moc.title,
      description: moc.description ?? '',
      tags: moc.tags?.join(', ') ?? '',
      theme: moc.theme ?? '',
      slug: moc.slug ?? '',
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
    reset({
      title: moc.title,
      description: moc.description ?? '',
      tags: moc.tags?.join(', ') ?? '',
      theme: moc.theme ?? '',
      slug: moc.slug ?? '',
    })
  }, [moc, reset])

  const handleBack = useCallback(() => {
    if (moc.slug) {
      navigate({ to: '/mocs/$slug', params: { slug: moc.slug } })
    } else {
      navigate({ to: '/dashboard' })
    }
  }, [navigate, moc.slug])

  const handleSave = useCallback(
    async (data: EditMocFormInput) => {
      setIsSaving(true)
      setSaveError(null)

      try {
        logger.info('Saving MOC edits', { mocId: moc.id, title: data.title })

        // TODO: Story 3.1.41 - Implement save via RTK Query mutation
        // await updateMoc({ mocId: moc.id, data: formToEditRequest(data) }).unwrap()

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

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack} aria-label="Go back">
            <ArrowLeft className="w-5 h-5" />
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
                aria-describedby={errors.title ? 'title-error' : undefined}
              />
              {errors.title ? (
                <p id="title-error" className="text-sm text-destructive">
                  {errors.title.message}
                </p>
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
                aria-describedby={errors.description ? 'description-error' : undefined}
              />
              {errors.description ? (
                <p id="description-error" className="text-sm text-destructive">
                  {errors.description.message}
                </p>
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
                aria-describedby={errors.theme ? 'theme-error' : undefined}
              />
              {errors.theme ? (
                <p id="theme-error" className="text-sm text-destructive">
                  {errors.theme.message}
                </p>
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
                aria-describedby={errors.tags ? 'tags-error' : undefined}
              />
              {errors.tags ? (
                <p id="tags-error" className="text-sm text-destructive">
                  {errors.tags.message}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Files Section */}
        <Card>
          <CardHeader>
            <CardTitle>Files</CardTitle>
            <CardDescription>
              Current files attached to this MOC ({moc.files.length} files)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileList files={moc.files} />
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
